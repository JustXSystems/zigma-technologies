import { HONEYPOT_FIELD } from '@/lib/form-guard';

/** Visually hidden trap field for basic bot filtering. */
export default function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Leave this field blank</label>
      <input type="text" id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
    </div>
  );
}
