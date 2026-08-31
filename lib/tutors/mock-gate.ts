export type MockTutorEnv = {
  NODE_ENV?: string;
  ENABLE_MOCK_TUTORS?: string;
  NEXT_PUBLIC_ENABLE_MOCK_TUTORS?: string;
  ALLOW_DEV_SEED?: string;
};

function truthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isProductionNodeEnv(env: MockTutorEnv = process.env): boolean {
  return env.NODE_ENV === "production";
}

export function isDevelopmentOrTestNodeEnv(env: MockTutorEnv = process.env): boolean {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

/**
 * Mock tutors may appear only in development/test, and only when a flag is set.
 * Production can never enable mocks — even if ENABLE_MOCK_TUTORS is present.
 */
export function hasExplicitMockTutorFlag(env: MockTutorEnv = process.env): boolean {
  return (
    truthyFlag(env.ENABLE_MOCK_TUTORS) ||
    truthyFlag(env.NEXT_PUBLIC_ENABLE_MOCK_TUTORS) ||
    truthyFlag(env.ALLOW_DEV_SEED)
  );
}

export function areMockTutorsEnabled(env: MockTutorEnv = process.env): boolean {
  if (isProductionNodeEnv(env) || !isDevelopmentOrTestNodeEnv(env)) {
    return false;
  }

  return (
    truthyFlag(env.ENABLE_MOCK_TUTORS) || truthyFlag(env.NEXT_PUBLIC_ENABLE_MOCK_TUTORS)
  );
}

export function assertDevSeedAllowed(env: MockTutorEnv = process.env): void {
  if (isProductionNodeEnv(env)) {
    throw new Error(
      "O seed de tutores mock não pode rodar em produção. Use dados reais do Firestore.",
    );
  }

  if (!hasExplicitMockTutorFlag(env)) {
    throw new Error(
      "Defina ENABLE_MOCK_TUTORS=true ou ALLOW_DEV_SEED=true para gravar tutores de desenvolvimento no Firestore.",
    );
  }
}
