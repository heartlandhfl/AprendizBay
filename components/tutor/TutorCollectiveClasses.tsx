import CollectiveHubList from "@/components/hubs/CollectiveHubList";
import type { TutorProfile } from "@/lib/tutor-profiles";
import { offersLessonType } from "@/lib/tutors/profile-display";

interface TutorCollectiveClassesProps {
  tutor: TutorProfile;
}

export default function TutorCollectiveClasses({ tutor }: TutorCollectiveClassesProps) {
  if (!offersLessonType(tutor, "coletivo")) {
    return null;
  }

  return (
    <section
      id="turmas"
      className="scroll-mt-24 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8"
    >
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">
        Entrar em uma turma
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Veja as turmas abertas deste professor e entre quando houver vaga.
      </p>
      <div className="mt-5">
        <CollectiveHubList
          tutorId={tutor.id}
          showDetailLinks
          initialHubs={tutor.collectiveHubs}
        />
      </div>
    </section>
  );
}
