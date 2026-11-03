import fs from 'fs';

const html = fs.readFileSync('tmp-solar/body.html', 'utf8');

/* cp1252 0x80-0x9F -> unicode (for reversing UTF-8-read-as-cp1252 mojibake) */
const CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
function fixMojibake(s) {
  return s.replace(/[\u00c2-\u00f4][\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]+/g, (run) => {
    const bytes = [];
    for (const ch of run) {
      const c = ch.codePointAt(0);
      if (c < 0x100) bytes.push(c);
      else if (CP1252[c] !== undefined) bytes.push(CP1252[c]);
      else return run;
    }
    const out = Buffer.from(bytes).toString('utf8');
    return out.includes('\ufffd') ? run : out;
  });
}

const types = [];
const re = /<div class="ty-img[^"]*" data-i="(\d)">(<svg[\s\S]*?<\/svg>)<\/div>/g;
let m;
while ((m = re.exec(html))) types[Number(m[1])] = fixMojibake(m[2]).replace(/\n/g, '');
if (types.length !== 6 || types.some((t) => !t)) throw new Error('type illustrations: ' + types.length);

const flowM = html.match(/<div class="inv-flow reveal">\s*(<svg[\s\S]*?<\/svg>)\s*<\/div>/);
if (!flowM) throw new Error('flow svg not found');
const flow = fixMojibake(flowM[1]).replace(/\n\s*/g, '');

const header = `/**
 * Large inline SVG illustrations for the /solar page defaults (generated from ZigmaSolarSolutionPage.html).
 * Kept apart from solar-sections.ts so the content defaults stay readable. Every one of these is stored in the
 * section content_json after Seed, so admins can replace or edit the markup in Admin → Pages → Solar.
 */
`;
const out =
  header +
  `\nexport const SOLAR_TYPE_ILLUSTRATIONS: string[] = ${JSON.stringify(types, null, 2)};\n` +
  `\nexport const SOLAR_INVERTER_FLOW_SVG = ${JSON.stringify(flow)};\n`;
fs.writeFileSync('src/lib/solar-illustrations.ts', out, 'utf8');
console.log('types', types.map((t) => t.length), 'flow', flow.length);
const bad = out.match(/[\u00c2\u00c3\u00e2][\u0080-\u00bf\u20ac\u2122\u2020-\u2022\u2026\u0153\u0161\u0192\u02dc]/g);
console.log('mojibake leftovers:', bad ? bad.length : 0, 'has arrow:', out.includes('→'));
