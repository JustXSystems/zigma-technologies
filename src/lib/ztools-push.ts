import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { ensureZtoolsSchema } from '@/lib/ztools';

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function ensurePushSchema() {
  await ensureZtoolsSchema();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ztools_push_tokens (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expo_push_token VARCHAR(255) NOT NULL,
      platform VARCHAR(20) NOT NULL DEFAULT 'android',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ztools_push_token (expo_push_token),
      KEY idx_ztools_push_user (user_id),
      CONSTRAINT fk_ztools_push_user FOREIGN KEY (user_id) REFERENCES ztools_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

export async function upsertZtoolsPushToken(userId: number, expoPushToken: string, platform: string) {
  await ensurePushSchema();
  await pool.query(
    `INSERT INTO ztools_push_tokens (user_id, expo_push_token, platform)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), updated_at = CURRENT_TIMESTAMP`,
    [userId, expoPushToken.trim(), platform.slice(0, 20)]
  );
}

export async function deleteZtoolsPushToken(userId: number, expoPushToken?: string) {
  await ensurePushSchema();
  if (expoPushToken) {
    await pool.query('DELETE FROM ztools_push_tokens WHERE user_id = ? AND expo_push_token = ?', [
      userId,
      expoPushToken.trim(),
    ]);
    return;
  }
  await pool.query('DELETE FROM ztools_push_tokens WHERE user_id = ?', [userId]);
}

async function listZtoolsPushTokens(userId: number) {
  await ensurePushSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT expo_push_token FROM ztools_push_tokens WHERE user_id = ?',
    [userId]
  );
  return rows.map((row) => String(row.expo_push_token)).filter(Boolean);
}

export async function sendZtoolsPush(userId: number, message: PushMessage) {
  const tokens = await listZtoolsPushTokens(userId);
  if (!tokens.length) return { sent: 0 };

  const payload = tokens.map((token) => ({
    to: token,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: 'default',
    channelId: 'ztools-default',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('ZTools push failed', await res.text());
    return { sent: 0 };
  }

  return { sent: tokens.length };
}

export async function notifyZtoolsAccessApproved(userId: number) {
  return sendZtoolsPush(userId, {
    title: 'ZTools access approved',
    body: 'Your account is ready. Open the app to view your engineering tools.',
    data: { screen: 'Dashboard' },
  });
}

export async function notifyZtoolsToolsAssigned(userId: number, count: number) {
  return sendZtoolsPush(userId, {
    title: 'New tools assigned',
    body:
      count === 1
        ? 'A new engineering tool was added to your ZTools workspace.'
        : `${count} new engineering tools were added to your ZTools workspace.`,
    data: { screen: 'Dashboard' },
  });
}
