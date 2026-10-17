/** Prefill careers apply role (and optional ATS job refs) and scroll to #apply. */

export type CareersApplyPrefill = {
  role?: string | null;
  jobId?: number | null;
  publicId?: string | null;
  slug?: string | null;
};

export function focusApplyRole(roleOrPrefill?: string | CareersApplyPrefill | null) {
  if (typeof window === 'undefined') return;
  const detail: CareersApplyPrefill =
    typeof roleOrPrefill === 'string' || roleOrPrefill == null
      ? { role: roleOrPrefill }
      : roleOrPrefill;

  const section = document.getElementById('apply');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (!detail.role && !detail.publicId && !detail.jobId && !detail.slug) return;

  window.dispatchEvent(new CustomEvent('careers:prefill-role', { detail }));
  window.setTimeout(() => {
    const select = document.querySelector<HTMLSelectElement>('#apply select[name="role"]');
    if (!select) return;

    const publicId = String(detail.publicId || '').trim();
    const role = String(detail.role || '').trim();
    let match =
      (publicId && [...select.options].find((opt) => opt.value === publicId || opt.dataset.publicId === publicId)) ||
      (role && [...select.options].find((opt) => opt.value === role || opt.textContent?.trim() === role)) ||
      null;

    if (!match && role) {
      match = new Option(role, publicId || role, true, true);
      if (publicId) match.dataset.publicId = publicId;
      if (detail.jobId) match.dataset.jobId = String(detail.jobId);
      if (detail.slug) match.dataset.slug = detail.slug;
      select.add(match);
    }
    if (!match) return;
    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.focus();
  }, 350);
}
