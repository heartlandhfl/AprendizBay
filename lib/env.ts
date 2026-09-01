/**
 * String bag for helpers that read selected process.env keys.
 * Narrower and more accurate than NodeJS.ProcessEnv, which Next.js
 * augments with a required readonly NODE_ENV.
 */
export type EnvRecord = Record<string, string | undefined>;
