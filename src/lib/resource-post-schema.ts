import { z } from 'zod';
import { BLOG_ARTICLE_TEMPLATES, BLOG_POST_FORMATS, cleanPostDisplay } from '@/lib/blog-design';
import { slugify } from '@/lib/types';

const formats = ['', ...BLOG_POST_FORMATS.map((f) => f.value)] as [string, ...string[]];
const templates = ['', ...BLOG_ARTICLE_TEMPLATES.map((t) => t.id)] as [string, ...string[]];

/** Blog post payload for create; PATCH uses `.partial()`. */
export const resourcePostSchema = z.object({
  slug: z
    .string()
    .transform(slugify)
    .pipe(z.string().min(1, 'Add a title or URL slug').max(190)),
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  tags_json: z.array(z.string()).optional(),
  format: z.enum(formats).optional(),
  template: z.enum(templates).optional(),
  featured: z.boolean().optional(),
  author_name: z.string().max(120).nullable().optional(),
  author_role: z.string().max(160).nullable().optional(),
  author_avatar_url: z.string().max(500).nullable().optional(),
  key_points_json: z.array(z.string()).optional(),
  /** Unknown keys and bad values are dropped, not rejected. */
  display_json: z.record(z.string(), z.unknown()).nullable().optional().transform((v) => (v == null ? v : cleanPostDisplay(v))),
  status: z.enum(['draft', 'published']).optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  /** Any date string; stored as a Date so mysql2 writes it in the connection's time zone. */
  published_at: z
    .string()
    .nullable()
    .optional()
    .transform((v, ctx) => {
      if (!v) return v === undefined ? undefined : null;
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Invalid publish date' });
        return z.NEVER;
      }
      return date;
    }),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

/** First Zod issue as a sentence for the admin toast. */
export function schemaMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'Invalid payload';
  const field = issue.path.join('.');
  return field ? `${field}: ${issue.message}` : issue.message;
}
