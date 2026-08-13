/** Build a WhatsApp click-to-chat URL with optional prefilled context. */
export function whatsappHref(phone: string, message?: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  const base = `https://wa.me/${digits || '919590137444'}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function catalogWhatsAppMessage(input: {
  title: string;
  itemType?: string;
  capacity?: string;
  location?: string;
}) {
  const parts = [
    `Hi Zigma — I'm interested in "${input.title}"`,
    input.itemType ? `(${input.itemType})` : '',
  ].filter(Boolean);
  const detail: string[] = [];
  if (input.capacity) detail.push(`Capacity/requirement: ${input.capacity}`);
  if (input.location) detail.push(`Location: ${input.location}`);
  return [parts.join(' '), ...detail, 'Please share a quote / next steps.'].join('\n');
}
