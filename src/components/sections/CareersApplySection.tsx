'use client';

import { FormEvent, useEffect, useState } from 'react';
import HoneypotField from '@/components/HoneypotField';

const DEFAULT_ROLES = [
  'Solar Design Engineer',
  'UPS Service Engineer',
  'Site Supervisor — Solar EPC',
  'Business Development Manager',
  'Graduate Engineer Trainee',
  'Internship Program',
  'General Application',
];

type SideItem = { label: string; value: string; href?: string | null; icon?: string };
type NextStep = { text: string };

export default function CareersApplySection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const baseRoles = (content.roles as string[])?.length ? (content.roles as string[]) : DEFAULT_ROLES;
  const [extraRole, setExtraRole] = useState('');
  const roles = extraRole && !baseRoles.includes(extraRole) ? [...baseRoles, extraRole] : baseRoles;
  const sideItems = (content.sideItems as SideItem[]) || [];
  const nextSteps = (content.nextSteps as NextStep[]) || [];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('role')?.trim();
    if (!prefill) return;
    if (!baseRoles.includes(prefill)) setExtraRole(prefill);
    setRole(prefill);
  }, [baseRoles]);

  useEffect(() => {
    function onPrefill(e: Event) {
      const detail = (e as CustomEvent<{ role?: string }>).detail;
      const next = detail?.role?.trim();
      if (!next) return;
      if (!baseRoles.includes(next)) setExtraRole(next);
      setRole(next);
    }
    window.addEventListener('careers:prefill-role', onPrefill as EventListener);
    return () => window.removeEventListener('careers:prefill-role', onPrefill as EventListener);
  }, [baseRoles]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!resume) throw new Error('Resume / CV is required');
      const body = new FormData();
      body.set('name', name);
      body.set('email', email);
      body.set('phone', phone);
      body.set('experience', experience);
      body.set('role', role);
      body.set('message', message);
      body.set('resume', resume);

      const res = await fetch('/api/public/careers/apply', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setExperience('');
      setRole('');
      setMessage('');
      setResume(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section contact-form-section" id={sectionKey || 'apply'}>
      <div className="container">
        <div className="section-head center reveal">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || 'APPLY ONLINE')}</div>
          <h2>{String(content.title || 'Ready to Apply?')}</h2>
          {content.body ? <p>{String(content.body)}</p> : null}
        </div>

        <div className="cf-grid reveal">
          <div className="cf-form">
            {success ? (
              <div className="cf-success" style={{ display: 'block' }}>
                <div className="cf-success-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3>{String(content.successTitle || 'Application received')}</h3>
                <p>
                  {String(
                    content.successBody ||
                      'Thank you for applying to Zigma Technologies. We sincerely appreciate your interest in joining our team. Our recruitment team will review your application and contact you if your profile matches our current requirements. We look forward to connecting with you soon.'
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ position: 'relative' }}>
                <HoneypotField />
                <h3>{String(content.formTitle || 'Submit Your Application')}</h3>
                <p>{String(content.formIntro || 'All fields marked with * are required.')}</p>

                <div className="cf-row">
                  <div className="cf-field">
                    <label>Full Name *</label>
                    <input
                      name="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="cf-field">
                    <label>Email *</label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field">
                    <label>Phone *</label>
                    <input
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 95901 37444"
                    />
                  </div>
                  <div className="cf-field">
                    <label>Experience</label>
                    <input
                      name="experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g. 2 years / Fresher"
                    />
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field full">
                    <label>Position Applying For *</label>
                    <select name="role" required value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="">Select a role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field full">
                    <label>Resume / CV *</label>
                    <input
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      required
                      onChange={(e) => setResume(e.target.files?.[0] || null)}
                    />
                    <span className="file-hint">PDF or Word document, up to 5MB.</span>
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field full">
                    <label>A Bit About You</label>
                    <textarea
                      name="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us why you'd be a good fit — no need for a formal cover letter."
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-hover-lift" disabled={submitting}>
                  {submitting ? 'Submitting…' : String(content.submitLabel || 'Submit Application →')}
                </button>
                {content.privacyNote ? <p className="cf-note">{String(content.privacyNote)}</p> : null}
                {error ? <p style={{ marginTop: '0.9rem', color: 'var(--orange-dim)' }}>{error}</p> : null}
              </form>
            )}
          </div>

          <div className="cf-side">
            {nextSteps.length ? (
              <div className="cf-side-block">
                <h4>{String(content.nextTitle || 'What Happens Next?')}</h4>
                <ul>
                  {nextSteps.map((step) => (
                    <li key={step.text}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {step.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {nextSteps.length && sideItems.length ? <div className="cf-side-divider"></div> : null}

            {sideItems.length ? (
              <div className="cf-side-block">
                <h4>{String(content.sideTitle || 'Questions About a Role?')}</h4>
                {sideItems.map((item) => (
                  <div className="cf-side-item" key={item.label}>
                    {item.icon ? (
                      <div
                        className="csi-icon"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{
                          __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${item.icon}</svg>`,
                        }}
                      />
                    ) : null}
                    <div>
                      <div className="csi-label">{item.label}</div>
                      {item.href ? (
                        <a href={item.href} className="csi-value">
                          {item.value}
                        </a>
                      ) : (
                        <span className="csi-value">{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
