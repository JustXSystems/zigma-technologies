import fs from 'fs';

const css = fs.readFileSync('tmp-solar/styles.css', 'utf8');
const start = css.indexOf('/* ---------- SOLAR PAGE ADDITIONS ---------- */');
let solar = css.slice(start);
solar = solar.replace(/\s*header\{[^}]+\}/g, '');
solar = solar.replace(/\s*header \.container\{[^}]+\}/g, '');

const shared = `/* Solar Solutions page sections. Styles apply under .sol-page only. */

.sol-page {
  --sol-navy-950: var(--navy-950, #0A1628);
  --sol-navy-900: var(--navy-900, #0F1F3D);
  --sol-orange: var(--orange, #FF6B1A);
  --sol-orange-dim: var(--orange-dim, #c9540f);
  --sol-green: var(--green, #12B76A);
  --sol-yellow: var(--yellow, #FFC93C);
  --sol-cyan: var(--cyan, #00D4FF);
  --sol-blue: var(--blue, #3B82F6);
  --sol-purple: var(--purple, #A855F7);
  --sol-white: #FFFFFF;
  --sol-gray-100: var(--gray-100, #F4F6F9);
  --sol-gray-200: var(--gray-200, #E7EBF1);
  --sol-graphite-800: var(--graphite-800, #1E2530);
  --sol-graphite-500: var(--graphite-500, #5B6472);
  color: var(--sol-graphite-800);
  line-height: 1.6;
  overflow-x: hidden;
}
.sol-page img, .sol-page svg { display: block; max-width: 100%; }
.sol-page a { text-decoration: none; color: inherit; }
.sol-page ul, .sol-page ol { list-style: none; margin: 0; padding: 0; }
.sol-page button { font-family: inherit; cursor: pointer; border: none; background: none; }
.sol-page h1, .sol-page h2, .sol-page h3, .sol-page h4, .sol-page h5 {
  font-family: var(--font-display, 'Space Grotesk', sans-serif);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.01em;
}
.sol-page .container { max-width: 1600px; margin: 0 auto; padding: 0 3rem; }
.sol-page .section { padding: var(--section-pad, 9rem) 0; }
.sol-page .section-light { background: var(--sol-white); }
.sol-page .section-iceblue { background: #F0F8FC; }
.sol-page .section-head { max-width: 680px; margin-bottom: 4rem; }
.sol-page .section-head.center { margin-left: auto; margin-right: auto; text-align: center; }
.sol-page .section-head h2 {
  font-size: clamp(2rem, 3.6vw, 2.9rem);
  margin-top: 1rem;
}
.sol-page .section-head p {
  font-size: 1.08rem;
  color: var(--sol-graphite-500);
  margin-top: 1.1rem;
}
.sol-page .eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
}
.sol-page .eyebrow::before {
  content: '';
  width: 1.3rem;
  height: 2px;
  background: currentColor;
  flex-shrink: 0;
}
.sol-page .eyebrow-orange { color: var(--sol-orange); }
.sol-page .eyebrow-cyan { color: var(--sol-cyan); }
.sol-page .eyebrow-green { color: var(--sol-green); }
.sol-page .bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.28;
}
.sol-page .orb-orange { background: var(--sol-orange); }
.sol-page .orb-cyan { background: var(--sol-cyan); }
.sol-page .orb-green { background: var(--sol-green); }
.sol-page .orb-purple { background: var(--sol-purple); }
.sol-page .has-orbs { position: relative; overflow: hidden; }
.sol-page .has-orbs > .container { position: relative; z-index: 1; }
.sol-page .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.95rem 1.8rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 2px;
  transition: all .25s ease;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  text-decoration: none;
}
.sol-page .btn-primary { background: var(--sol-orange); color: var(--sol-white); }
.sol-page .btn-primary:hover { background: var(--sol-orange-dim); transform: translateY(-2px); }
.sol-page .btn-ghost {
  border: 1.5px solid rgba(255,255,255,0.3);
  color: var(--sol-white);
  background: transparent;
}
.sol-page .btn-ghost:hover {
  border-color: var(--sol-white);
  background: rgba(255,255,255,0.06);
}
.sol-page .sec-cta { display: flex; justify-content: center; margin-top: 3rem; }
.sol-page .reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .7s ease, transform .7s ease;
}
.sol-page .reveal.is-visible { opacity: 1; transform: none; }
.sol-page .cta-band {
  background: linear-gradient(120deg, var(--sol-navy-950), var(--sol-navy-900));
  padding: 6rem 0;
  text-align: center;
  color: var(--sol-white);
}
.sol-page .cta-band h2 {
  font-size: clamp(1.4rem, 2.8vw, 2.2rem);
  max-width: 780px;
  margin: 0 auto 1.2rem;
  line-height: 1.15;
}
.sol-page .cta-band p { color: #B7C2D6; max-width: 560px; margin: 0 auto 2.4rem; }
.sol-page .cta-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
`;

function scopeCss(input, prefix) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('/*', i)) {
      const end = input.indexOf('*/', i) + 2;
      out += input.slice(i, end);
      i = end;
      continue;
    }
    if (input.startsWith('@keyframes', i) || input.startsWith('@-webkit-keyframes', i)) {
      let depth = 0;
      let j = i;
      while (j < input.length) {
        if (input[j] === '{') depth++;
        else if (input[j] === '}') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
        j++;
      }
      out += input.slice(i, j);
      i = j;
      continue;
    }
    if (input[i] === '@' && (input.startsWith('@media', i) || input.startsWith('@supports', i))) {
      const brace = input.indexOf('{', i);
      out += input.slice(i, brace + 1);
      i = brace + 1;
      let depth = 1;
      let j = i;
      while (j < input.length && depth > 0) {
        if (input[j] === '{') depth++;
        else if (input[j] === '}') depth--;
        j++;
      }
      const inner = input.slice(i, j - 1);
      out += scopeCss(inner, prefix);
      out += '}';
      i = j;
      continue;
    }
    const brace = input.indexOf('{', i);
    if (brace === -1) {
      out += input.slice(i);
      break;
    }
    const sel = input.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    while (j < input.length) {
      if (input[j] === '{') depth++;
      else if (input[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
      j++;
    }
    const body = input.slice(brace, j);
    if (sel) {
      const scoped = sel
        .split(',')
        .map((s) => {
          s = s.trim();
          if (!s) return s;
          if (s.startsWith(prefix)) return s;
          if (s === ':root' || s === 'html' || s === 'body') return prefix;
          return `${prefix} ${s}`;
        })
        .join(', ');
      out += scoped + body;
    }
    i = j;
  }
  return out;
}

const result = shared + '\n' + scopeCss(solar, '.sol-page');
fs.writeFileSync('src/app/solar-sections.css', result);
console.log('bytes', Buffer.byteLength(result));
