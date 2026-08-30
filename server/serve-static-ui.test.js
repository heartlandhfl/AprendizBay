const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { mensagensThreadRedirect } = require("./serve-static-ui");

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
