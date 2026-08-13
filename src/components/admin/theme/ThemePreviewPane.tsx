'use client';

import { useEffect, useRef, useState } from 'react';
import { THEME_PREVIEW_MESSAGE } from '@/lib/theme-tokens';

type Width = 'desktop' | 'tablet' | 'mobile';

const WIDTHS: Record<Width, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

type Props = {
  previewCss: string;
  path?: string;
};

export default function ThemePreviewPane({ previewCss, path = '/' }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState<Width>('desktop');
  const [key, setKey] = useState(0);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === `${THEME_PREVIEW_MESSAGE}-ready`) {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: THEME_PREVIEW_MESSAGE, css: previewCss }, window.location.origin);
  }, [previewCss, ready, key]);

  return (
    <div className="theme-preview">
      <div className="theme-preview-toolbar">
        <div className="theme-preview-widths">
          {(Object.keys(WIDTHS) as Width[]).map((w) => (
            <button
              key={w}
              type="button"
              className={`admin-btn admin-btn-secondary${width === w ? ' is-active' : ''}`}
              onClick={() => setWidth(w)}
            >
              {w}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => {
            setReady(false);
            setKey((k) => k + 1);
          }}
        >
          Refresh
        </button>
      </div>
      <div className="theme-preview-frame-wrap">
        <iframe
          key={key}
          ref={iframeRef}
          title="Theme preview"
          src={path}
          className="theme-preview-iframe"
          style={{ width: WIDTHS[width] }}
          onLoad={() => {
            /* ready comes from bridge postMessage; fallback nudge */
            window.setTimeout(() => setReady(true), 400);
          }}
        />
      </div>
      {!ready ? <div className="theme-preview-status">Loading preview…</div> : null}
    </div>
  );
}
