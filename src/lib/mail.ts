import nodemailer from 'nodemailer';
import type { SiteSettings } from '@/lib/site-settings';

export type MailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
}

/** Sends email when SMTP is configured; otherwise logs and returns skipped. */
export async function sendMail(payload: MailPayload): Promise<{ sent: boolean; skipped?: boolean }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM;
  if (!transporter || !from) {
    console.info('[mail] SMTP not configured; skipping send:', payload.subject);
    return { sent: false, skipped: true };
  }

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html || payload.text.replace(/\n/g, '<br/>'),
  });
  return { sent: true };
}

export function formatEnquiryEmail(payload: Record<string, unknown>, meta: { id: number; item_type: string }) {
  const lines = Object.entries(payload).map(([key, value]) => `${key}: ${String(value ?? '')}`);
  const text = [
    `New enquiry #${meta.id}`,
    `Type: ${meta.item_type}`,
    '',
    ...lines,
    '',
    `Review in admin: ${(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/admin/enquiries`,
  ].join('\n');

  return {
    subject: `New enquiry #${meta.id} — Zigma Technologies`,
    text,
  };
}

export function formatVisitorEnquiryReply(settings: SiteSettings, name?: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hello,';
  const text = [
    greeting,
    '',
    `Thank you for contacting ${settings.companyName}. We have received your enquiry and a member of our team will respond within one business day.`,
    '',
    `For urgent support, call ${settings.phone}.`,
    '',
    settings.companyName,
    settings.supportEmail,
  ].join('\n');

  return {
    subject: `We received your enquiry — ${settings.companyName}`,
    text,
  };
}

export function formatVisitorCareersReply(settings: SiteSettings, name?: string, role?: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hello,';
  const roleLine = role?.trim() ? ` for the ${role.trim()} role` : '';
  const text = [
    greeting,
    '',
    `Thank you for applying${roleLine} at ${settings.companyName}. Our recruitment team will review your application within 3–5 business days.`,
    '',
    `If you have questions, email ${settings.supportEmail} or call ${settings.phone}.`,
    '',
    settings.companyName,
  ].join('\n');

  return {
    subject: `Application received — ${settings.companyName}`,
    text,
  };
}

export async function sendVisitorAutoReply(
  settings: SiteSettings,
  to: string,
  mail: { subject: string; text: string }
) {
  if (settings.visitorAutoReplyEnabled.trim().toLowerCase() === 'false') return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  await sendMail({ to, ...mail });
}
