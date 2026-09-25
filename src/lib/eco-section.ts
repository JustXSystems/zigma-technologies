export type EcoCapabilityGroup = {
  className: string;
  dot: string;
  items: string[];
};

export const ECO_GROUP_COLOR_PRESETS = [
  { key: 'orange', label: 'Orange', hex: '#FF6B1A' },
  { key: 'green', label: 'Green', hex: '#12B76A' },
  { key: 'blue', label: 'Blue', hex: '#3B82F6' },
  { key: 'purple', label: 'Purple', hex: '#A855F7' },
  { key: 'pink', label: 'Pink', hex: '#EC4899' },
  { key: 'yellow', label: 'Yellow', hex: '#FFC93C' },
  { key: 'red', label: 'Red', hex: '#EF4444' },
  { key: 'lime', label: 'Lime', hex: '#A3E635' },
] as const;

export type EcoGroupColorKey = (typeof ECO_GROUP_COLOR_PRESETS)[number]['key'];

export function ecoGroupColorKey(group: Pick<EcoCapabilityGroup, 'className' | 'dot'>): EcoGroupColorKey {
  const raw = (group.className || '').replace(/^cap-group-/, '') || (group.dot || '').replace(/^dot-/, '');
  const match = ECO_GROUP_COLOR_PRESETS.find((p) => p.key === raw);
  return match ? match.key : 'orange';
}

export function ecoGroupForColor(key: EcoGroupColorKey, items: string[] = []): EcoCapabilityGroup {
  return { className: `cap-group-${key}`, dot: `dot-${key}`, items };
}
