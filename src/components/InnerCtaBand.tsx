import Link from 'next/link';

type Props = {
  eyebrow?: string;
  title: string;
  lead?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/** Closing conversion band for premium inner pages. */
export default function InnerCtaBand({
  eyebrow = 'Next step',
  title,
  lead,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <section className="inner-cta-band">
      <div className="container inner-cta-band-inner">
        <div>
          <div className="eyebrow eyebrow-cyan">{eyebrow}</div>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
        <div className="inner-cta-band-actions">
          <Link href={primaryHref} className="btn btn-primary">
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
