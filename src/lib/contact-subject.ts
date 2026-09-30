/** Window event carrying `{ subject }`; contact forms listen for it to preselect the subject. */
export const CONTACT_SUBJECT_EVENT = 'zigma:contact-subject';

/** Prefill contact enquiry subject and scroll to the form (static contact.js parity). */
export function focusContactSubject(subject?: string | null) {
  if (typeof window === 'undefined') return;
  const form = document.getElementById('contact-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (!subject) return;
  window.dispatchEvent(new CustomEvent(CONTACT_SUBJECT_EVENT, { detail: { subject } }));
  window.setTimeout(() => {
    const select = document.querySelector<HTMLSelectElement>(
      '#contact-form select[name="subject"], #contact-form select[data-field="subject"]'
    );
    if (select) {
      if (select.value !== subject) {
        select.value = subject;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      select.focus({ preventScroll: true });
    }
  }, 350);
}
