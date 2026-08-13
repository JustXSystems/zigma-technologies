/** Prefill contact enquiry subject and scroll to the form (static contact.js parity). */
export function focusContactSubject(subject?: string | null) {
  if (typeof window === 'undefined') return;
  const form = document.getElementById('contact-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (!subject) return;
  window.setTimeout(() => {
    const select = document.querySelector<HTMLSelectElement>(
      '#contact-form select[name="subject"], #contact-form select[data-field="subject"]'
    );
    if (select) {
      select.value = subject;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.focus();
    }
  }, 350);
}
