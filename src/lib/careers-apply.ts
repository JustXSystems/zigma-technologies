/** Prefill careers apply role and scroll to #apply (static careers.js parity). */
export function focusApplyRole(role?: string | null) {
  if (typeof window === 'undefined') return;
  const section = document.getElementById('apply');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (!role) return;
  window.dispatchEvent(new CustomEvent('careers:prefill-role', { detail: { role } }));
  window.setTimeout(() => {
    const select = document.querySelector<HTMLSelectElement>('#apply select[name="role"]');
    if (!select) return;
    let match = [...select.options].find(
      (opt) => opt.value === role || opt.textContent?.trim() === role
    );
    if (!match) {
      match = new Option(role, role, true, true);
      select.add(match);
    }
    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.focus();
  }, 350);
}
