import crypto from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { parseJsonField } from '@/lib/types';
import { normalizeMailConfig, type MailConfig, type MailSecrets } from '@/lib/mail-config';

let tablesReady: Promise<void> | null = null;

export function ensureMailTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mail_settings (
          id TINYINT UNSIGNED PRIMARY KEY,
          config_json JSON NOT NULL,
          secrets_enc TEXT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mail_log (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          event VARCHAR(40) NOT NULL,
          provider VARCHAR(16) NOT NULL,
          status VARCHAR(12) NOT NULL,
          to_list TEXT NULL,
          cc_list TEXT NULL,
          subject VARCHAR(255) NULL,
          error TEXT NULL,
          ref_id INT UNSIGNED NULL,
          attempts INT UNSIGNED NOT NULL DEFAULT 1,
          message_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_mail_log_created (created_at),
          INDEX idx_mail_log_status (status)
        ) ENGINE=InnoDB
      `);
    })().catch((err) => {
      tablesReady = null;
      throw err;
    });
  }
  return tablesReady;
}

/* ---------- secrets (AES-256-GCM) ---------- */

function encryptionKey(): Buffer {
  const material = process.env.MAIL_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!material || material.length < 16) {
    throw new Error('Set MAIL_ENCRYPTION_KEY (or AUTH_SECRET) to store email credentials securely');
  }
  return crypto.createHash('sha256').update(`zigma-mail:${material}`).digest();
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

function decrypt(blob: string): string | null {
  try {
    const [version, iv, tag, data] = blob.split('.');
    if (version !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/* ---------- settings ---------- */

export type StoredMailSettings = {
  config: MailConfig;
  secrets: MailSecrets;
  /** Encrypted secrets exist but cannot be decrypted (encryption key changed). */
  secretsUnreadable: boolean;
  saved: boolean;
  updatedAt: string | null;
};

export async function getMailSettings(): Promise<StoredMailSettings> {
  await ensureMailTables();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM mail_settings WHERE id = 1 LIMIT 1');
  const row = rows[0];
  if (!row) {
    return { config: normalizeMailConfig(null), secrets: {}, secretsUnreadable: false, saved: false, updatedAt: null };
  }
  const plain = row.secrets_enc ? decrypt(String(row.secrets_enc)) : null;
  let secrets: MailSecrets = {};
  if (plain) {
    try {
      secrets = JSON.parse(plain) as MailSecrets;
    } catch {
      secrets = {};
    }
  }
  return {
    config: normalizeMailConfig(parseJsonField<unknown>(row.config_json, null)),
    secrets,
    secretsUnreadable: Boolean(row.secrets_enc) && !plain,
    saved: true,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/** `secrets` keys: undefined = keep current, '' = clear, string = replace. */
export async function saveMailSettings(config: MailConfig, secrets: Partial<Record<keyof MailSecrets, string>>) {
  const current = await getMailSettings();
  const next: MailSecrets = { ...current.secrets };
  for (const key of ['graphClientSecret', 'smtpPassword'] as const) {
    const value = secrets[key];
    if (value === undefined) continue;
    if (value === '') delete next[key];
    else next[key] = value;
  }
  const enc = Object.keys(next).length ? encrypt(JSON.stringify(next)) : null;
  await pool.query(
    `INSERT INTO mail_settings (id, config_json, secrets_enc) VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE config_json = VALUES(config_json), secrets_enc = VALUES(secrets_enc)`,
    [JSON.stringify(normalizeMailConfig(config)), enc]
  );
  return getMailSettings();
}

/* ---------- delivery log ---------- */

export type MailLogStatus = 'sent' | 'failed' | 'skipped';

export type MailLogRow = {
  id: number;
  event: string;
  provider: string;
  status: MailLogStatus;
  to_list: string | null;
  cc_list: string | null;
  subject: string | null;
  error: string | null;
  ref_id: number | null;
  attempts: number;
  created_at: string;
  updated_at: string;
};

export async function insertMailLog(entry: {
  event: string;
  provider: string;
  status: MailLogStatus;
  to: string[];
  cc: string[];
  subject: string;
  error?: string | null;
  refId?: number | null;
  message?: unknown;
}) {
  await ensureMailTables();
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO mail_log (event, provider, status, to_list, cc_list, subject, error, ref_id, message_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.event,
      entry.provider,
      entry.status,
      entry.to.join(', ') || null,
      entry.cc.join(', ') || null,
      entry.subject.slice(0, 255),
      entry.error ? entry.error.slice(0, 4000) : null,
      entry.refId ?? null,
      entry.message ? JSON.stringify(entry.message) : null,
    ]
  );
  return result.insertId;
}

export async function updateMailLog(id: number, status: MailLogStatus, error: string | null) {
  await pool.query('UPDATE mail_log SET status = ?, error = ?, attempts = attempts + 1 WHERE id = ?', [
    status,
    error ? error.slice(0, 4000) : null,
    id,
  ]);
}

export async function listMailLog(opts: { status?: string; limit?: number } = {}) {
  await ensureMailTables();
  // Retention: delivery metadata is operational, not an archive.
  await pool.query('DELETE FROM mail_log WHERE created_at < NOW() - INTERVAL 180 DAY');
  const where = opts.status ? 'WHERE status = ?' : '';
  const params: unknown[] = opts.status ? [opts.status] : [];
  params.push(Math.min(500, Math.max(1, opts.limit || 100)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, event, provider, status, to_list, cc_list, subject, error, ref_id, attempts, created_at, updated_at
     FROM mail_log ${where} ORDER BY id DESC LIMIT ?`,
    params
  );
  const [stats] = await pool.query<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS c FROM mail_log WHERE created_at >= NOW() - INTERVAL 7 DAY GROUP BY status`
  );
  return {
    rows: rows as MailLogRow[],
    last7Days: Object.fromEntries(stats.map((s) => [String(s.status), Number(s.c)])) as Partial<Record<MailLogStatus, number>>,
  };
}

export async function getMailLogMessage(id: number) {
  await ensureMailTables();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM mail_log WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  return { row: rows[0] as MailLogRow, message: parseJsonField<unknown>(rows[0].message_json, null) };
}

/* ---------- static template attachments (outside /public) ---------- */

export const MAIL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const MAIL_ATTACHMENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
  '.ics': 'text/calendar',
};

function attachmentsDir() {
  return path.join(process.env.ZIGMA_APP_DIR || process.cwd(), 'storage', 'mail-attachments');
}

function attachmentPath(id: string) {
  const safe = path.basename(id);
  if (!/^[\w.-]+$/.test(safe)) throw new Error('Invalid attachment id');
  return path.join(attachmentsDir(), safe);
}

export async function saveMailAttachment(originalName: string, buffer: Buffer) {
  const ext = path.extname(originalName).toLowerCase();
  const mime = MAIL_ATTACHMENT_TYPES[ext];
  if (!mime) throw new Error(`File type ${ext || '(none)'} is not allowed`);
  if (buffer.length > MAIL_ATTACHMENT_MAX_BYTES) throw new Error('Attachment too large (max 10 MB)');
  await mkdir(attachmentsDir(), { recursive: true });
  const id = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  await writeFile(attachmentPath(id), buffer);
  return { id, name: path.basename(originalName).slice(0, 200), size: buffer.length, mime };
}

export async function readMailAttachment(id: string) {
  try {
    return await readFile(attachmentPath(id));
  } catch {
    return null;
  }
}

export async function deleteMailAttachment(id: string) {
  await unlink(attachmentPath(id)).catch(() => undefined);
}
