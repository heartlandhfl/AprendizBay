import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/lib/auth/errors";

describe("getAuthErrorMessage", () => {
  it("maps Firebase Auth popup errors", () => {
    expect(getAuthErrorMessage({ code: "auth/popup-closed-by-user" })).toBe(
      "Login com Google cancelado.",
    );
  });

  it("maps Firestore permission errors", () => {
    expect(getAuthErrorMessage({ code: "permission-denied" })).toContain(
      "Não foi possível salvar seu cadastro",
    );
  });

  it("returns explicit Error messages", () => {
    expect(getAuthErrorMessage(new Error("Perfil já cadastrado."))).toBe("Perfil já cadastrado.");
  });
});
