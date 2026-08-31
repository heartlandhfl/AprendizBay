import { MOCK_TUTORS, type Tutor } from "./mock-tutors";

export interface CollectiveHub {
  id: string;
  title: string;
  description: string;
  confirmedStudents: number;
  maxStudents: number;
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
}

export interface TutorProfile extends Tutor {
  headline?: string;
  isVerified: boolean;
  hoursTaught?: number;
  studentsServed?: number;
  about?: string;
  methodology?: string;
  experience?: string;
  qualifications?: string[];
  subjects?: string[];
  levels?: string[];
  languages?: string[];
  specialties?: string[];
  responseTime?: string;
  firstLessonPrice?: number;
  offersFreeTrial?: boolean;
  collectiveHubs: CollectiveHub[];
}

export const TUTOR_PROFILE_DETAILS: Record<
  string,
  Omit<TutorProfile, keyof Tutor>
> = {
  "1": {
    headline: "Inglês para viagens, carreira e fluência no dia a dia",
    isVerified: true,
    hoursTaught: 1240,
    studentsServed: 186,
    about:
      "Sou professora de inglês formada pela USP e certificada pelo Cambridge (CELTA). Ao longo de 8 anos, ajudei centenas de alunos brasileiros a perder o medo de falar, passar em entrevistas internacionais e viajar com confiança. Trabalhei em escolas de idiomas e hoje atendo alunos de todo o Brasil de forma online e presencial em São Paulo.",
    methodology:
      "Minhas aulas são 100% práticas e personalizadas. Começo com um diagnóstico rápido do seu nível e objetivos, e monto um plano sob medida. Uso role-plays, podcasts, séries e situações reais do seu dia a dia. Nas turmas coletivas, estimulo a conversação em grupo — você aprende ouvindo colegas com perfis diferentes e divide o custo sem perder qualidade.",
    collectiveHubs: [
      {
        id: "hub-m1",
        title: "Inglês para Viagem — Primeiros Passos",
        description: "Frases essenciais para aeroporto, hotel e restaurante.",
        confirmedStudents: 4,
        maxStudents: 6,
        currentPrice: 28,
        fullPrice: 22,
        schedule: "Terças, 19h · Online",
        modality: "online",
      },
      {
        id: "hub-m2",
        title: "Conversação Intermediária em Grupo",
        description: "Debates semanais sobre cultura, trabalho e notícias.",
        confirmedStudents: 2,
        maxStudents: 5,
        currentPrice: 25,
        fullPrice: 18,
        schedule: "Quintas, 20h · Online",
        modality: "online",
      },
    ],
  },
  "2": {
    headline: "Python do zero ao mercado de trabalho",
    isVerified: true,
    hoursTaught: 980,
    studentsServed: 94,
    about:
      "Sou desenvolvedor sênior com foco em dados e backend, atuando no mercado há mais de 10 anos. Passei por startups e fintechs em Curitiba e São Paulo. Ensino Python porque acredito que programação deve ser acessível — e que aprender em grupo acelera muito o processo, já que você resolve problemas reais junto com outras pessoas.",
    methodology:
      "Aprendizado baseado em projetos. Cada módulo termina com algo funcionando: um script, uma API, um dashboard. Explico conceitos com analogias do cotidiano e muita prática guiada. Nas turmas coletivas, formamos squads que dividem desafios — o que simula o ambiente real de trabalho e reduz o preço por aluno.",
    collectiveHubs: [
      {
        id: "hub-l1",
        title: "Introdução ao Python",
        description: "Variáveis, loops, funções e primeiros projetos.",
        confirmedStudents: 3,
        maxStudents: 5,
        currentPrice: 30,
        fullPrice: 15,
        schedule: "Segundas, 19h30 · Online",
        modality: "online",
      },
      {
        id: "hub-l2",
        title: "Python para Análise de Dados",
        description: "Pandas, visualização e limpeza de datasets reais.",
        confirmedStudents: 5,
        maxStudents: 6,
        currentPrice: 32,
        fullPrice: 20,
        schedule: "Sábados, 10h · Online",
        modality: "online",
      },
    ],
  },
  "3": {
    headline: "Violão popular e clássico para todos os níveis",
    isVerified: true,
    hoursTaught: 760,
    studentsServed: 142,
    about:
      "Músico profissional há 12 anos, com passagens por orquestras e bandas de MPB no Rio de Janeiro. Dou aulas de violão para iniciantes absolutos até músicos que querem aprimorar fingerstyle e harmonia. Minha paixão é ver o aluno tocando a primeira música completa — seja no sertanejo, no rock ou na bossa nova.",
    methodology:
      "Equilibro teoria musical com repertório que o aluno gosta. Cada aula tem exercícios técnicos curtos e aplicação em músicas reais. Para turmas coletivas, montamos rodas de violão virtuais ou presenciais onde cada aluno traz um estilo — o grupo aprende repertório variado e divide o custo da aula.",
    collectiveHubs: [
      {
        id: "hub-r1",
        title: "Violão Iniciante — Primeiros Acordes",
        description: "Postura, afinação e 5 músicas para começar.",
        confirmedStudents: 2,
        maxStudents: 4,
        currentPrice: 20,
        fullPrice: 14,
        schedule: "Quartas, 18h · Presencial (Copacabana)",
        modality: "presencial",
      },
    ],
  },
  "4": {
    headline: "Matemática descomplicada para ENEM e vestibular",
    isVerified: true,
    hoursTaught: 1580,
    studentsServed: 230,
    about:
      "Licenciada em Matemática pela UFMG, com especialização em preparação para ENEM e vestibulares. Já ajudei mais de 200 alunos a aumentar a nota em até 40% em menos de 6 meses. Sei que muita gente tem bloqueio com matemática — meu trabalho é desmontar esse medo com explicações claras e muita paciência.",
    methodology:
      "Começo sempre pelo diagnóstico: onde você trava? A partir daí, uso mapas mentais, resolução comentada e listas progressivas de exercícios. Nas turmas coletivas, os alunos resolvem questões em grupo e aprendem com as dúvidas uns dos outros — o que reforça o conteúdo e deixa a aula mais dinâmica e barata.",
    collectiveHubs: [
      {
        id: "hub-f1",
        title: "Matemática ENEM — Funções e Gráficos",
        description: "Domine o conteúdo que mais cai na prova.",
        confirmedStudents: 4,
        maxStudents: 5,
        currentPrice: 18,
        fullPrice: 12,
        schedule: "Terças e Quintas, 17h · Online",
        modality: "online",
      },
      {
        id: "hub-f2",
        title: "Revisão Geral — 30 Dias para o ENEM",
        description: "Sprint intensivo com simulados semanais em grupo.",
        confirmedStudents: 6,
        maxStudents: 8,
        currentPrice: 16,
        fullPrice: 10,
        schedule: "Sábados, 14h · Online",
        modality: "online",
      },
    ],
  },
  "5": {
    headline: "Espanhol latino-americano com foco em conversação",
    isVerified: true,
    hoursTaught: 540,
    studentsServed: 78,
    about:
      "Nascido no Uruguai e radicado no Brasil há 15 anos, domino as nuances do espanhol rioplatense e o espanhol neutro. Trabalhei como intérprete em feiras comerciais e hoje ensino profissionais e estudantes que querem conversar com naturalidade — seja para negócios, viagens ou intercâmbio.",
    methodology:
      "Imersão desde a primeira aula: falamos espanhol 80% do tempo, com correções gentis e vocabulário contextualizado. Uso músicas, notícias e situações do mercado latino-americano. Nas turmas coletivas, simulamos reuniões, viagens em grupo e debates culturais — você ganha fluência e economia ao mesmo tempo.",
    collectiveHubs: [
      {
        id: "hub-a1",
        title: "Espanhol Básico — Primeiras Conversas",
        description: "Saudações, apresentações e situações do dia a dia.",
        confirmedStudents: 1,
        maxStudents: 5,
        currentPrice: 22,
        fullPrice: 14,
        schedule: "Segundas, 19h · Presencial (Moinhos de Vento)",
        modality: "presencial",
      },
    ],
  },
};

export function getTutorProfile(id: string): TutorProfile | undefined {
  const base = MOCK_TUTORS.find((t) => t.id === id);
  if (!base) return undefined;

  const details = TUTOR_PROFILE_DETAILS[id];
  if (!details) return undefined;

  return { ...base, ...details };
}

export function getAllTutorIds(): string[] {
  return Object.keys(TUTOR_PROFILE_DETAILS);
}
