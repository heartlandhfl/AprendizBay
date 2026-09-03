import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import PrivacyPolicyBody from "@/components/legal/PrivacyPolicyBody";
import { PRIVACY_LAST_UPDATED_LABEL } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Política de Privacidade | AprendizBay",
  description:
    "Política de Privacidade da AprendizBay: dados tratados, bases legais da LGPD, cookies, compartilhamento e direitos do titular.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacidadePage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      description="Esta política explica quais dados pessoais a AprendizBay trata, com que finalidades, com quem compartilha e como você pode exercer seus direitos."
      categoryLabel={null}
      lastUpdatedPrefix="Última atualização:"
      lastUpdatedLabel={PRIVACY_LAST_UPDATED_LABEL}
      showReviewBanner={false}
    >
      <PrivacyPolicyBody />
    </LegalDocument>
  );
}
