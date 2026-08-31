import type { TutorProfile } from "@/lib/tutor-profiles";
import { hasTeachingDetails, teachingSubjects } from "@/lib/tutors/profile-display";

interface TutorTeachingProps {
  tutor: TutorProfile;
}

function ChipList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-800 ring-1 ring-primary-100"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function TutorTeaching({ tutor }: TutorTeachingProps) {
  if (!hasTeachingDetails(tutor)) {
    return null;
  }

  const subjects = teachingSubjects(tutor);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">Ensino</h2>

      <div className="mt-6 space-y-6">
        {subjects.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Disciplinas
            </h3>
            <ChipList items={subjects} />
          </div>
        ) : null}

        {tutor.levels && tutor.levels.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Níveis
            </h3>
            <ChipList items={tutor.levels} />
          </div>
        ) : null}

        {tutor.languages && tutor.languages.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Idiomas
            </h3>
            <ChipList items={tutor.languages} />
          </div>
        ) : null}

        {tutor.specialties && tutor.specialties.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Especialidades
            </h3>
            <ChipList items={tutor.specialties} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
