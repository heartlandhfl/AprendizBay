import { describe, expect, it } from "vitest";
import { describeOffPlatformWarning, detectOffPlatformSignals } from "./moderation";

describe("detectOffPlatformSignals", () => {
  it("does not flag legitimate schedule and price numbers", () => {
    expect(detectOffPlatformSignals("Podemos marcar às 19h? São 3 aulas, R$ 70 cada.")).toEqual([]);
    expect(detectOffPlatformSignals("Tenho 8 vagas na turma das 8h30.")).toEqual([]);
    expect(detectOffPlatformSignals("A aula custa 90 reais e dura 50 minutos.")).toEqual([]);
  });

  it("detects phone numbers, emails, Pix keys and payment instructions", () => {
    expect(detectOffPlatformSignals("Me liga no (11) 98765-4321")).toContain("phone");
    expect(detectOffPlatformSignals("Meu e-mail é ana.souza@email.com")).toContain("email");
    expect(
      detectOffPlatformSignals("Minha chave Pix: 550e8400-e29b-41d4-a716-446655440000"),
    ).toEqual(expect.arrayContaining(["pix_key"]));
    expect(detectOffPlatformSignals("Paga no meu pix e a gente resolve fora da plataforma.")).toEqual(
      expect.arrayContaining(["pix_key", "payment_instruction"]),
    );
    expect(detectOffPlatformSignals("Me chama no WhatsApp")).toContain("external_contact");
  });

  it("describes a warning in Brazilian Portuguese", () => {
    const warning = describeOffPlatformWarning(["phone"]);
    expect(warning).toMatch(/fora da Aprendiz Bay/);
    expect(warning).toMatch(/Horários, preços/);
    expect(describeOffPlatformWarning([])).toBe("");
  });
});
