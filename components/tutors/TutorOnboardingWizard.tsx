"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import AvatarUpload from "@/components/uploads/AvatarUpload";
import CredentialUpload from "@/components/uploads/CredentialUpload";
import { useAuth } from "@/lib/auth/AuthContext";
import { SUBJECTS, type Modality } from "@/lib/mock-tutors";
import { BRAZILIAN_STATES } from "@/lib/tutors/constants";
import { createTutorProfile } from "@/lib/tutors/service";

const INPUT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200";

const TEXTAREA_CLASS =
  "w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200";

const SELECT_CLASS =
  "w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200";

const TUTOR_SUBJECTS = SUBJECTS.filter((subject) => subject !== "Todas as matérias");

const STEPS = [
  { title: "Matéria", description: "O que você ensina?" },
  { title: "Localização", description: "Onde você atua?" },
  { title: "Sobre você", description: "Apresente-se aos alunos" },
  { title: "Foto de perfil", description: "Mostre seu rosto aos alunos" },
  { title: "Preços", description: "Defina seus valores por hora" },
  { title: "Modalidade", description: "Como você prefere ensinar?" },
  { title: "Verificação", description: "Documento para validação do perfil" },
] as const;

const TOTAL_STEPS = STEPS.length;

export default function TutorOnboardingWizard() {
  const router = useRouter();
  const { user, userDoc } = useAuth();
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState(TUTOR_SUBJECTS[0] ?? "Inglês");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userDoc?.photoUrl ?? null);
  const [individualPrice, setIndividualPrice] = useState(70);
  const [collectivePrice, setCollectivePrice] = useState(25);
  const [modality, setModality] = useState<Modality>("online");
  const [credentialFileName, setCredentialFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateStep(currentStep: number): string | null {
    switch (currentStep) {
      case 0:
        if (!subject.trim()) {
          return "Selecione uma matéria.";
        }
        return null;
      case 1:
        if (!city.trim()) {
          return "Informe sua cidade.";
        }
        if (!state.trim()) {
          return "Selecione o estado.";
        }
        return null;
      case 2:
        if (!bio.trim()) {
          return "Escreva uma breve descrição sobre você.";
        }
        if (bio.trim().length < 20) {
          return "A descrição deve ter pelo menos 20 caracteres.";
        }
        return null;
      case 3:
        if (!avatarUrl) {
          return "Envie uma foto de perfil para continuar.";
        }
        return null;
      case 4:
        if (individualPrice < 1) {
          return "O preço individual deve ser maior que zero.";
        }
        if (collectivePrice < 1) {
          return "O preço coletivo deve ser maior que zero.";
        }
        return null;
      case 5:
        return null;
      case 6:
        if (!credentialFileName) {
          return "Envie um documento de verificação para continuar.";
        }
        return null;
      default:
        return null;
    }
  }

  function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
      return;
    }

    void handleSubmit();
  }

  async function handleSubmit() {
    if (!user || !userDoc) {
      setError("Faça login para completar seu perfil.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createTutorProfile(user.uid, {
        name: userDoc.displayName,
        subject,
        city,
        state,
        bio,
        individualPrice,
        collectivePrice,
        modality,
        avatarUrl: avatarUrl ?? undefined,
        credentialFileName: credentialFileName ?? undefined,
      });

      router.replace("/tutor/dashboard");
    } catch {
      setError("Não foi possível salvar seu perfil. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  const currentStep = STEPS[step];

  if (!user) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary-600">
          Passo {step + 1} de {TOTAL_STEPS}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{currentStep.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
      </div>

      <div className="mb-8 flex gap-2">
        {STEPS.map((item, index) => (
          <div
            key={item.title}
            className={`h-2 flex-1 rounded-full transition-colors ${
              index <= step ? "bg-primary-600" : "bg-muted"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      <form onSubmit={handleNext} className="space-y-4">
        {step === 0 && (
          <div>
            <label htmlFor="onboarding-subject" className="mb-1.5 block text-sm font-medium">
              Matéria principal
            </label>
            <select
              id="onboarding-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={SELECT_CLASS}
            >
              {TUTOR_SUBJECTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="onboarding-city" className="mb-1.5 block text-sm font-medium">
                Cidade
              </label>
              <input
                id="onboarding-city"
                type="text"
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={INPUT_CLASS}
                placeholder="Ex: São Paulo"
              />
            </div>

            <div>
              <label htmlFor="onboarding-state" className="mb-1.5 block text-sm font-medium">
                Estado
              </label>
              <select
                id="onboarding-state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                className={SELECT_CLASS}
              >
                {BRAZILIAN_STATES.map((option) => (
                  <option key={option.uf} value={option.uf}>
                    {option.name} ({option.uf})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="onboarding-bio" className="mb-1.5 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="onboarding-bio"
              required
              rows={5}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className={TEXTAREA_CLASS}
              placeholder="Descreva sua experiência, formação e o que os alunos podem esperar das suas aulas."
            />
            <p className="mt-2 text-xs text-muted-foreground">Mínimo de 20 caracteres.</p>
          </div>
        )}

        {step === 3 && (
          <AvatarUpload
            userId={user.uid}
            currentUrl={avatarUrl}
            onUploaded={setAvatarUrl}
          />
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="onboarding-individual-price"
                className="mb-1.5 block text-sm font-medium"
              >
                Preço individual (R$/h)
              </label>
              <input
                id="onboarding-individual-price"
                type="number"
                min={1}
                required
                value={individualPrice}
                onChange={(event) => setIndividualPrice(Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="onboarding-collective-price"
                className="mb-1.5 block text-sm font-medium"
              >
                Preço coletivo (R$/h)
              </label>
              <input
                id="onboarding-collective-price"
                type="number"
                min={1}
                required
                value={collectivePrice}
                onChange={(event) => setCollectivePrice(Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <span className="mb-2 block text-sm font-medium">Modalidade</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "online", label: "Online" },
                  { value: "presencial", label: "Presencial" },
                  { value: "ambos", label: "Ambos" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setModality(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    modality === option.value
                      ? "bg-primary-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={modality === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <CredentialUpload
            tutorId={user.uid}
            currentFileName={credentialFileName}
            persistToFirestore={false}
            onUploaded={setCredentialFileName}
            description="Envie RG, CNH ou diploma. O arquivo fica visível apenas para você e administradores. Depois do envio, seu perfil fica em análise e não aparece na busca até a aprovação. Máximo de 10 MB (imagem ou PDF)."
          />
        )}

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Voltar
            </button>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : step === TOTAL_STEPS - 1 ? (
              "Finalizar cadastro"
            ) : (
              "Continuar"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
