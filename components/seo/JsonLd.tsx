import { serializeJsonLd } from "@/lib/seo/tutor-jsonld";

interface JsonLdProps {
  data: unknown;
}

export default function JsonLd({ data }: JsonLdProps) {
  if (data == null) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
