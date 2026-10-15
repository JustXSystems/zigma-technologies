import type { BlogArticleTemplate, BlogHubTemplate } from '@/lib/blog-design';

const lines = (n: number, cls = 'abl-tl') => Array.from({ length: n }, (_, i) => <i key={i} className={cls} />);

/** Wireframe of a /blog hub design, drawn in CSS so the picker shows the layout at a glance. */
export function HubThumb({ template }: { template: BlogHubTemplate }) {
  return (
    <div className={`abl-thumb abl-thumb--${template}`} aria-hidden>
      {template === 'classic' ? (
        <>
          <div className="abl-th-hero">{lines(3)}</div>
          <div className="abl-th-spot">
            <b />
            <div>
              <b />
              <b />
            </div>
          </div>
          <div className="abl-th-row">
            <b />
            <b />
            <b />
          </div>
        </>
      ) : null}
      {template === 'editorial' ? (
        <>
          <div className="abl-th-mast">{lines(2)}</div>
          <div className="abl-th-lead">
            <b />
            <div className="abl-th-list">{lines(4)}</div>
          </div>
          <div className="abl-th-rules">{lines(3)}</div>
        </>
      ) : null}
      {template === 'bento' ? (
        <>
          <div className="abl-th-hero">{lines(2)}</div>
          <div className="abl-th-bento">
            <b />
            <b />
            <b />
            <b />
          </div>
        </>
      ) : null}
      {template === 'signal' ? (
        <>
          <div className="abl-th-hero">{lines(2)}</div>
          <div className="abl-th-briefs">
            <b />
            <b />
            <b />
          </div>
          <div className="abl-th-index">{lines(4)}</div>
        </>
      ) : null}
    </div>
  );
}

/** Wireframe of an article layout. */
export function ArticleThumb({ template }: { template: BlogArticleTemplate }) {
  return (
    <div className={`abl-thumb abl-thumb--a-${template}`} aria-hidden>
      {template === 'technical' ? (
        <>
          <div className="abl-th-head">
            {lines(2)}
            <div className="abl-th-specs">
              <b />
              <b />
              <b />
            </div>
          </div>
          <div className="abl-th-cols">
            <span className="abl-th-rail" />
            <div className="abl-th-text">
              <b className="abl-th-keys" />
              {lines(5)}
            </div>
            <div className="abl-th-toc">{lines(4)}</div>
          </div>
        </>
      ) : null}
      {template === 'focus' ? (
        <div className="abl-th-col">
          {lines(2, 'abl-tl abl-tl--title')}
          <b className="abl-th-cover" />
          {lines(5)}
          <span className="abl-th-fab" />
        </div>
      ) : null}
      {template === 'feature' ? (
        <>
          <div className="abl-th-full">{lines(2, 'abl-tl abl-tl--title')}</div>
          <div className="abl-th-col">
            <span className="abl-th-cap" />
            {lines(4)}
            <i className="abl-th-quote" />
          </div>
        </>
      ) : null}
    </div>
  );
}
