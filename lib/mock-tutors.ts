/**
 * Shared tutor types plus development/test fixtures.
 *
 * MOCK_TUTORS are fictional people. They must never reach students, SEO pages,
 * or structured data in production. Use `areMockTutorsEnabled()` before reading
 * this catalog into any user-facing path.
 */
export type Modality = "online" | "presencial" | "ambos";
export type LessonType = "individual" | "coletivo";
export type FilterLessonType = LessonType | "todos";
export type FilterModality = Modality | "todos";

export interface Tutor {
  id: string;
  name: string;
  subject: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  bio: string;
  individualPrice: number;
  collectivePrice: number;
  modality: Modality;
  lessonTypes: Array<"individual" | "coletivo">;
  isOnline: boolean;
  avatarUrl: string;
  avatarColor: string;
  isVerified?: boolean;
  hoursTaught?: number;
  yearsOfExperience?: number;
  educationLevels?: string[];
  hasAvailability?: boolean;
}

export const MOCK_TUTORS: Tutor[] = [
  {
    id: "1",
    name: "Mariana Silva",
    subject: "Inglês",
    city: "São Paulo",
    state: "SP",
    rating: 4.9,
    reviewCount: 84,
    bio: "Professora certificada Cambridge com 8 anos de experiência. Foco em conversação para viagens e entrevistas de emprego.",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "ambos",
    lessonTypes: ["individual", "coletivo"],
    isOnline: true,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mariana&backgroundColor=d1fae5",
    avatarColor: "bg-emerald-100",
    isVerified: true,
    hoursTaught: 1240,
    yearsOfExperience: 8,
    educationLevels: ["Idiomas", "Graduação"],
    hasAvailability: true,
  },
  {
    id: "2",
    name: "Lucas Ferreira",
    subject: "Python",
    city: "Curitiba",
    state: "PR",
    rating: 5.0,
    reviewCount: 52,
    bio: "Desenvolvedor sênior na área de dados. Ensino Python do zero ao avançado, com projetos práticos e preparação para o mercado.",
    individualPrice: 90,
    collectivePrice: 30,
    modality: "online",
    lessonTypes: ["individual", "coletivo"],
    isOnline: true,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=ccfbf1",
    avatarColor: "bg-teal-100",
    isVerified: true,
    hoursTaught: 980,
    yearsOfExperience: 10,
    educationLevels: ["Graduação", "Profissionalizante"],
    hasAvailability: true,
  },
  {
    id: "3",
    name: "Rodrigo Almeida",
    subject: "Violão",
    city: "Rio de Janeiro",
    state: "RJ",
    rating: 4.8,
    reviewCount: 63,
    bio: "Músico profissional e professor de violão popular e clássico. Aprenda seus primeiros acordes ou evolua para fingerstyle.",
    individualPrice: 60,
    collectivePrice: 20,
    modality: "ambos",
    lessonTypes: ["individual", "coletivo"],
    isOnline: false,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rodrigo&backgroundColor=fef3c7",
    avatarColor: "bg-amber-100",
    isVerified: true,
    hoursTaught: 760,
    yearsOfExperience: 12,
    educationLevels: ["Ensino fundamental", "Ensino médio"],
    hasAvailability: true,
  },
  {
    id: "4",
    name: "Fernanda Costa",
    subject: "Matemática",
    city: "Belo Horizonte",
    state: "MG",
    rating: 4.9,
    reviewCount: 112,
    bio: "Especialista em ENEM e vestibular. Metodologia clara e paciente — ideal para quem quer subir a nota de verdade.",
    individualPrice: 55,
    collectivePrice: 18,
    modality: "online",
    lessonTypes: ["individual", "coletivo"],
    isOnline: true,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda&backgroundColor=e0e7ff",
    avatarColor: "bg-indigo-100",
    isVerified: true,
    hoursTaught: 1580,
    yearsOfExperience: 8,
    educationLevels: ["Ensino médio", "Pré-vestibular / ENEM"],
    hasAvailability: true,
  },
  {
    id: "5",
    name: "André Martins",
    subject: "Espanhol",
    city: "Porto Alegre",
    state: "RS",
    rating: 4.7,
    reviewCount: 38,
    bio: "Nativo do Uruguai, fluente em português. Aulas dinâmicas com foco em conversação e cultura latino-americana.",
    individualPrice: 65,
    collectivePrice: 22,
    modality: "presencial",
    lessonTypes: ["individual", "coletivo"],
    isOnline: false,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andre&backgroundColor=fce7f3",
    avatarColor: "bg-rose-100",
    isVerified: true,
    hoursTaught: 540,
    yearsOfExperience: 15,
    educationLevels: ["Idiomas"],
    hasAvailability: true,
  },
];

export const SUBJECTS = [
  "Todas as matérias",
  "Inglês",
  "Python",
  "Violão",
  "Matemática",
  "Espanhol",
] as const;

export const PRICE_RANGES = [
  { label: "Qualquer preço", min: 0, max: Infinity },
  { label: "Até R$ 30/h", min: 0, max: 30 },
  { label: "R$ 30 – R$ 60/h", min: 30, max: 60 },
  { label: "R$ 60 – R$ 90/h", min: 60, max: 90 },
  { label: "Acima de R$ 90/h", min: 90, max: Infinity },
] as const;
