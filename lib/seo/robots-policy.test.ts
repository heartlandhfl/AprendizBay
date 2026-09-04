import { describe, expect, it } from "vitest";
import { buildRobotsPolicy, ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-policy";

describe("buildRobotsPolicy", () => {
  it("points crawlers at the sitemap and blocks private surfaces", () => {
    const robots = buildRobotsPolicy("https://www.aprendizbay.com.br");

    expect(robots.sitemap).toBe("https://www.aprendizbay.com.br/sitemap.xml");
    expect(robots.rules.allow).toBe("/");
    expect(robots.rules.disallow).toEqual([...ROBOTS_DISALLOW_PATHS]);
    expect(robots.rules.disallow).toContain("/admin");
    expect(robots.rules.disallow).toContain("/configuracoes");
    expect(robots.rules.disallow).toContain("/dashboard");
    expect(robots.rules.disallow).toContain("/mensagens");
    expect(robots.rules.disallow).toContain("/tutor/dashboard");
  });
});
