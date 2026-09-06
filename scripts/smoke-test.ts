#!/usr/bin/env npx tsx
/**
 * HTTP smoke tests for deployed or local Aprendiz Bay instances.
 *
 * Usage:
 *   BASE_URL=https://staging.aprendizbay.com.br npm run test:smoke
 *   BASE_URL=https://www.aprendizbay.com.br npm run test:smoke
 *   npm run dev && BASE_URL=http://localhost:3000 npm run test:smoke
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

interface SmokeCheck {
  name: string;
  run: () => Promise<void>;
}

function assertStatus(actual: number, expected: number | number[], context: string): void {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    throw new Error(`${context}: expected HTTP ${allowed.join(" or ")}, got ${actual}`);
  }
}

async function fetchStatus(path: string, init?: RequestInit): Promise<number> {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
  });
  return response.status;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path}: expected JSON 200, got ${response.status}`);
  }
  return (await response.json()) as T;
}

const checks: SmokeCheck[] = [
  {
    name: "homepage responds",
    async run() {
      assertStatus(await fetchStatus("/"), [200, 301, 302, 307, 308], "GET /");
    },
  },
  {
    name: "public config exposes Firebase client keys",
    async run() {
      const payload = await fetchJson<{
        configured?: boolean;
        firebase?: { projectId?: string };
      }>("/api/public-config");
      if (!payload.configured) {
        throw new Error("/api/public-config: configured=false");
      }
      if (!payload.firebase?.projectId) {
        throw new Error("/api/public-config: missing firebase.projectId");
      }
    },
  },
  {
    name: "marketing pages respond",
    async run() {
      for (const path of ["/login", "/signup", "/professores", "/como-funciona", "/contato"]) {
        assertStatus(await fetchStatus(path), [200, 301, 302, 307, 308], `GET ${path}`);
      }
    },
  },
  {
    name: "protected routes redirect unauthenticated users to login",
    async run() {
      for (const path of ["/dashboard", "/bookings", "/admin", "/tutor/dashboard"]) {
        const status = await fetchStatus(path);
        if (![301, 302, 303, 307, 308].includes(status)) {
          throw new Error(`${path}: expected auth redirect, got ${status}`);
        }
      }
    },
  },
  {
    name: "session API rejects missing bearer token",
    async run() {
      const response = await fetch(`${BASE_URL}/api/auth/session`, { method: "POST" });
      assertStatus(response.status, [401, 403, 500], "POST /api/auth/session without token");
    },
  },
  {
    name: "robots.txt is reachable",
    async run() {
      assertStatus(await fetchStatus("/robots.txt"), [200, 301, 302, 307, 308], "GET /robots.txt");
    },
  },
  {
    name: "sitemap.xml is reachable",
    async run() {
      assertStatus(await fetchStatus("/sitemap.xml"), [200, 301, 302, 307, 308], "GET /sitemap.xml");
    },
  },
];

async function main(): Promise<void> {
  console.log(`Smoke testing ${BASE_URL}\n`);
  const failures: string[] = [];

  for (const check of checks) {
    try {
      await check.run();
      console.log(`  ✓ ${check.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${check.name}: ${message}`);
      failures.push(`${check.name}: ${message}`);
    }
  }

  console.log("");
  if (failures.length > 0) {
    console.error(`Smoke tests failed (${failures.length}/${checks.length}).`);
    process.exit(1);
  }

  console.log(`All ${checks.length} smoke checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
