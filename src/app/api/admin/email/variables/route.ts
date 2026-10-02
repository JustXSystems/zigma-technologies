import type { RowDataPacket } from 'mysql2';
import { jsonError, jsonOk } from '@/lib/api';
import pool from '@/lib/db';
import { KNOWN_FORM_FIELDS, RESERVED_VARIABLE_KEYS } from '@/lib/mail-config';
import { loadSubmissionVars } from '@/lib/mail';
import { HIDDEN_FIELDS, humanizeKey, sourceLabel, submissionKind, type SubmissionKind } from '@/lib/mail-template';
import { parseJsonField } from '@/lib/types';
import { emailRouteError, requireEmailAdmin } from '../_shared';

const SCAN_LIMIT = 500;
const SAMPLE_LEN = 80;

type FieldInfo = {
  key: string;
  label: string;
  forms: string[];
  kinds: SubmissionKind[];
  type: string;
  seen: number;
  fillRate: number | null;
  samples: string[];
};

function sampleText(value: unknown): string {
  const s = Array.isArray(value) ? value.join(', ') : typeof value === 'object' && value ? JSON.stringify(value) : String(value ?? '');
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > SAMPLE_LEN ? `${flat.slice(0, SAMPLE_LEN)}…` : flat;
}

/**
 * GET                    → discovered form fields (definitions + recent submissions) and recent submissions for previews.
 * GET ?submission=<id>   → the built-in + form variables of that submission (for live preview with real data).
 */
export async function GET(request: Request) {
  try {
    await requireEmailAdmin();
    const url = new URL(request.url);
    const submission = Number(url.searchParams.get('submission'));
    if (submission) {
      const data = await loadSubmissionVars(submission);
      if (!data) return jsonError('Submission not found', 404);
      return jsonOk({ id: submission, kind: data.kind, vars: data.vars, hasResume: Boolean(data.resume) });
    }

    const fields = new Map<string, FieldInfo & { formSet: Set<string>; kindSet: Set<SubmissionKind>; sampleSet: Set<string> }>();
    const field = (key: string, label?: string) => {
      let f = fields.get(key);
      if (!f) {
        f = {
          key,
          label: label || humanizeKey(key),
          forms: [],
          kinds: [],
          type: '',
          seen: 0,
          fillRate: null,
          samples: [],
          formSet: new Set(),
          kindSet: new Set(),
          sampleSet: new Set(),
        };
        fields.set(key, f);
      } else if (label && f.label === humanizeKey(key)) {
        f.label = label;
      }
      return f;
    };
    const eligible = (key: string) => /^\w+$/.test(key) && !HIDDEN_FIELDS.has(key) && !RESERVED_VARIABLE_KEYS.has(key);

    for (const k of KNOWN_FORM_FIELDS) {
      const f = field(k.key, k.label);
      k.forms.forEach((n) => f.formSet.add(n));
      f.kindSet.add(k.kind);
    }

    try {
      const [defs] = await pool.query<RowDataPacket[]>(
        `SELECT f.field_name, f.label, f.field_type, d.name AS form_name
         FROM form_fields f JOIN form_definitions d ON d.id = f.form_id
         WHERE f.enabled = 1 ORDER BY d.id, f.sort_order`
      );
      for (const d of defs) {
        const key = String(d.field_name);
        if (!eligible(key)) continue;
        const f = field(key, String(d.label || ''));
        f.formSet.add(String(d.form_name || 'Enquiry form'));
        f.kindSet.add('enquiry');
        f.type = String(d.field_type || '');
      }
    } catch {
      // Form builder tables are optional.
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, payload_json, created_at FROM enquiries ORDER BY id DESC LIMIT ${SCAN_LIMIT}`
    );
    const perKind: Record<SubmissionKind, number> = { enquiry: 0, careers: 0 };
    const recent: Array<{ id: number; kind: SubmissionKind; label: string; name: string; createdAt: string }> = [];
    for (const row of rows) {
      const payload = parseJsonField<Record<string, unknown>>(row.payload_json, {});
      const kind = submissionKind(payload);
      perKind[kind]++;
      if (recent.length < 40) {
        recent.push({
          id: Number(row.id),
          kind,
          label: sourceLabel(payload.source, kind),
          name: sampleText(payload.name || payload.full_name || payload.email || '').slice(0, 60),
          createdAt: new Date(row.created_at).toISOString(),
        });
      }
      for (const [key, value] of Object.entries(payload)) {
        if (!eligible(key)) continue;
        const f = field(key);
        f.kindSet.add(kind);
        const text = sampleText(value);
        if (!text) continue;
        f.seen++;
        if (f.sampleSet.size < 3) f.sampleSet.add(text);
      }
    }

    const out: FieldInfo[] = [...fields.values()].map(({ formSet, kindSet, sampleSet, ...f }) => {
      const kinds = [...kindSet];
      const denominator = kinds.reduce((n, k) => n + perKind[k], 0);
      return {
        ...f,
        forms: [...formSet],
        kinds,
        samples: [...sampleSet],
        fillRate: denominator ? Math.min(1, f.seen / denominator) : null,
      };
    });
    out.sort((a, b) => b.seen - a.seen || a.key.localeCompare(b.key));

    return jsonOk({ fields: out, scanned: rows.length, perKind, recent });
  } catch (error) {
    return emailRouteError(error, 'Failed to load variables');
  }
}
