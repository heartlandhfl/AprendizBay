const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  mensagensThreadRedirect,
  aulasLessonRedirect,
  NOT_FOUND_TEXT,
  NOT_FOUND_JSON,
} = require("./serve-static-ui");

describe("mensagensThreadRedirect", () => {
  it("rewrites a thread path to the Hostinger query fallback", () => {
    assert.equal(
      mensagensThreadRedirect("/mensagens/aluno123_prof456"),
      "/mensagens?conversa=aluno123_prof456",
    );
  });

  it("ignores the conversation list and nested paths", () => {
    assert.equal(mensagensThreadRedirect("/mensagens"), null);
    assert.equal(mensagensThreadRedirect("/mensagens/a/b"), null);
    assert.equal(mensagensThreadRedirect("/tutor/1"), null);
  });
});

describe("aulasLessonRedirect", () => {
  it("rewrites a lesson path to the Hostinger query fallback", () => {
    assert.equal(
      aulasLessonRedirect("/aulas/booking-123"),
      "/aulas?aula=booking-123",
    );
  });

  it("ignores the lesson index and nested paths", () => {
    assert.equal(aulasLessonRedirect("/aulas"), null);
    assert.equal(aulasLessonRedirect("/aulas/a/b"), null);
    assert.equal(aulasLessonRedirect("/bookings"), null);
  });
});

describe("Portuguese 404 fallbacks", () => {
  it("uses Portuguese copy for missing pages and APIs", () => {
    assert.equal(NOT_FOUND_TEXT, "Página não encontrada");
    assert.deepEqual(NOT_FOUND_JSON, { error: "não encontrado" });
  });
});
