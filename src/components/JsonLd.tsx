type Props = { data: Record<string, unknown> | Record<string, unknown>[] };

/** Server-rendered structured data. `<` is escaped so CMS text cannot close the script tag. */
export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
