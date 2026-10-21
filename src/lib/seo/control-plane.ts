/**
 * SEO control-plane contract (Meridian) vs product-plane (Next.js runtime SEO).
 * See packages/meridian/ARCHITECTURE.md
 */

export type SeoPlane = 'product' | 'control' | 'observability';

export type ControlPlaneMode =
  /** CLI present under MERIDIAN_HOME or packages/meridian */
  | 'local-cli'
  /** Toolkit not on this node — use GitHub Actions / laptop */
  | 'actions-only'
  | 'missing';

export type ControlPlaneStatus = {
  plane: 'control';
  mode: ControlPlaneMode;
  meridianHome: string | null;
  binPath: string;
  binExists: boolean;
  architectureDoc: string;
  message: string;
};

export function describeControlPlane(input: {
  meridianHome: string | null;
  binPath: string;
  binExists: boolean;
}): ControlPlaneStatus {
  const mode: ControlPlaneMode = input.binExists
    ? 'local-cli'
    : 'actions-only';

  return {
    plane: 'control',
    mode,
    meridianHome: input.meridianHome,
    binPath: input.binPath,
    binExists: input.binExists,
    architectureDoc: 'packages/meridian/ARCHITECTURE.md',
    message: input.binExists
      ? 'Control plane CLI available on this node (MERIDIAN_HOME or packages/meridian). Prefer Admin → Generate report (GitHub) when MERIDIAN_GITHUB_TOKEN is set.'
      : 'Control plane CLI not on this web node — Admin → Generate report (GitHub) with MERIDIAN_GITHUB_TOKEN, or GitHub → Meridian SEO report. Product SEO (sitemap/schema/meta) is unaffected.',
  };
}
