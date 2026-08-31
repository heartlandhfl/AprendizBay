import { Clock, Users } from "lucide-react";
import type { TutorProfile } from "@/lib/tutor-profiles";
import { formatCount } from "@/lib/tutors/format";
import { hasExperienceSection, presentationText } from "@/lib/tutors/profile-display";

interface TutorAboutProps {
  tutor: TutorProfile;
}

export default function TutorAbout({ tutor }: TutorAboutProps) {
  const presentation = presentationText(tutor);
  const showExperience = hasExperienceSection(tutor);
  const qualifications = tutor.qualifications ?? [];
  const methodology = tutor.methodology?.trim();

  if (!presentation && !showExperience && qualifications.length === 0 && !methodology) {
    return (
      <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Sobre</h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Este professor ainda não escreveu uma apresentação.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">Sobre</h2>

      {presentation ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Apresentação
          </h3>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground whitespace-pre-line">
            {presentation}
          </p>
        </div>
      ) : null}

      {showExperience ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Experiência
          </h3>
          {tutor.experience ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground whitespace-pre-line">
              {tutor.experience}
            </p>
          ) : null}
          {(tutor.hoursTaught || tutor.studentsServed) ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tutor.hoursTaught ? (
                <div className="rounded-2xl bg-muted/60 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    Horas ensinadas
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {formatCount(tutor.hoursTaught)}
                  </p>
                </div>
              ) : null}
              {tutor.studentsServed ? (
                <div className="rounded-2xl bg-muted/60 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Alunos atendidos
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {formatCount(tutor.studentsServed)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {qualifications.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Qualificações
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-muted-foreground">
            {qualifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {methodology ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Metodologia
          </h3>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground whitespace-pre-line">
            {methodology}
          </p>
        </div>
      ) : null}
    </section>
  );
}
