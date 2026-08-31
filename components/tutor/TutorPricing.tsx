import { Gift, User, Users } from "lucide-react";
import type { TutorProfile } from "@/lib/tutor-profiles";
import { formatTutorPrice } from "@/lib/tutors/format";
import {
  hasFirstLessonOffer,
  hasPricingSection,
  offersLessonType,
} from "@/lib/tutors/profile-display";

interface TutorPricingProps {
  tutor: TutorProfile;
}

export default function TutorPricing({ tutor }: TutorPricingProps) {
  if (!hasPricingSection(tutor)) {
    return (
      <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Preço</h2>
        <p className="mt-4 text-base text-muted-foreground">
          Este professor ainda não cadastrou valores de aula.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">Preço</h2>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {offersLessonType(tutor, "individual") ? (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <User className="h-4 w-4" aria-hidden="true" />
              Aula individual
            </h3>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {formatTutorPrice(tutor.individualPrice)}
              <span className="text-base font-normal text-muted-foreground">/hora</span>
            </p>
          </div>
        ) : null}

        {offersLessonType(tutor, "coletivo") ? (
          <div className="rounded-2xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-secondary-100/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-secondary-800">
              <Users className="h-4 w-4" aria-hidden="true" />
              Aula coletiva
            </h3>
            <p className="mt-3 text-2xl font-bold text-secondary-800">
              {formatTutorPrice(tutor.collectivePrice)}
              <span className="text-base font-normal text-secondary-700/80">/hora</span>
            </p>
          </div>
        ) : null}

        {hasFirstLessonOffer(tutor) ? (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 sm:col-span-2">
            <h3 className="flex items-center gap-2 font-semibold text-primary-800">
              <Gift className="h-4 w-4" aria-hidden="true" />
              {tutor.offersFreeTrial ? "Primeira aula gratuita" : "Primeira aula"}
            </h3>
            {tutor.offersFreeTrial ? (
              <p className="mt-2 text-sm text-primary-800">
                Este professor oferece uma aula experimental sem custo.
              </p>
            ) : null}
            {tutor.firstLessonPrice ? (
              <p className="mt-2 text-xl font-bold text-primary-900">
                {formatTutorPrice(tutor.firstLessonPrice)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
