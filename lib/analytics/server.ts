import type { AnalyticsProps } from "@/lib/analytics/events";
import {
  serverPlausibleApiHost,
  serverPlausibleDomain,
} from "@/lib/observability/config";
import { getSiteOrigin } from "@/lib/seo/site-url";

export interface TrackServerEventInput {
  name: string;
  url?: string;
  props?: AnalyticsProps;
}

export function buildPlausibleEventPayload(
  input: TrackServerEventInput,
  env: NodeJS.ProcessEnv = process.env,
): { endpoint: string; body: Record<string, unknown> } | null {
  const domain = serverPlausibleDomain(env);
  if (!domain) {
    return null;
  }

  const origin = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || getSiteOrigin();
  return {
    endpoint: `${serverPlausibleApiHost(env)}/api/event`,
    body: {
      name: input.name,
      domain,
      url: input.url || `${origin}/`,
      ...(input.props ? { props: input.props } : {}),
    },
  };
}

export async function trackServerEvent(input: TrackServerEventInput): Promise<boolean> {
  const payload = buildPlausibleEventPayload(input);
  if (!payload) {
    return false;
  }

  try {
    const response = await fetch(payload.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AprendizBay/1.0 (server)",
      },
      body: JSON.stringify(payload.body),
    });
    return response.ok;
  } catch {
    return false;
  }
}
