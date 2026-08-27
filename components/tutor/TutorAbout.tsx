import type { TutorProfile } from "@/lib/tutor-profiles";

interface TutorAboutProps {
  tutor: TutorProfile;
}

export default function TutorAbout({ tutor }: TutorAboutProps) {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          Sobre Mim
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {tutor.about}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          Metodologia
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {tutor.methodology}
        </p>
      </div>
    </section>
  );
}
