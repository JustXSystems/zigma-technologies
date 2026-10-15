/**
 * Preview tokens for blog posts are signed for this key, so a page preview token never opens a draft post.
 * No `:` — the token payload is colon-separated.
 */
export function blogPreviewKey(slug: string) {
  return `blog-post~${slug}`;
}
