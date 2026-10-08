import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { LifeHighlight } from '@/lib/life-sections';

function hlStyle(hl?: LifeHighlight): CSSProperties {
  const out: Record<string, string> = {};
  const gradient = hl?.gradient?.trim();
  const color = hl?.color?.trim();
  if (gradient) out['--lz-hl-gradient'] = gradient;
  if (color) out['--lz-hl-color'] = color;
  return out as CSSProperties;
}

/**
 * Heading text with line breaks kept and the first case-sensitive match of `hl.text` on each
 * line painted with the gradient (or solid color). Styling lives in life-sections.css (.lz-hl).
 */
export function highlightText(text: string, hl?: LifeHighlight): ReactNode {
  const word = hl?.text?.trim();
  return text.split('\n').map((line, i) => {
    let content: ReactNode = line;
    const at = word ? line.indexOf(word) : -1;
    if (word && at >= 0) {
      content = (
        <>
          {line.slice(0, at)}
          <em
            className={`lz-hl${hl?.color?.trim() ? ' lz-hl--solid' : ''}${hl?.animate === false ? '' : ' lz-hl--anim'}`}
            style={hlStyle(hl)}
          >
            {word}
          </em>
          {line.slice(at + word.length)}
        </>
      );
    }
    return (
      <Fragment key={i}>
        {i > 0 ? <br /> : null}
        {content}
      </Fragment>
    );
  });
}
