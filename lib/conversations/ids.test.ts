import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conversationIdFor, otherParticipantName, previewMessage } from "./ids";
import { mapConversationDoc, mapMessageDoc } from "./map";

describe("conversation helpers", () => {
  it("builds a stable student_tutor conversation id", () => {
    assert.equal(conversationIdFor("aluno123", "prof456"), "aluno123_prof456");
  });

  it("shows the other participant name from each side", () => {
    const conversation = {
      studentId: "aluno123",
      tutorId: "prof456",
      studentName: "Ana Souza",
      tutorName: "Mariana Silva",
    };

    assert.equal(otherParticipantName(conversation, "aluno123"), "Mariana Silva");
    assert.equal(otherParticipantName(conversation, "prof456"), "Ana Souza");
    assert.equal(
      otherParticipantName({ studentId: "a", tutorId: "b" }, "a"),
      "Professor",
    );
  });

  it("truncates long message previews", () => {
    assert.equal(previewMessage("Oi, professor!"), "Oi, professor!");
    assert.equal(previewMessage("abcdefghij", 6), "abcde…");
  });

  it("maps conversation and message documents", () => {
    const conversation = mapConversationDoc("aluno123_prof456", {
      studentId: "aluno123",
      tutorId: "prof456",
      participantIds: ["aluno123", "prof456"],
      studentName: "Ana",
      tutorName: "Mariana",
      lastMessage: "Olá!",
    });

    assert.equal(conversation.id, "aluno123_prof456");
    assert.deepEqual(conversation.participantIds, ["aluno123", "prof456"]);
    assert.equal(conversation.lastMessage, "Olá!");

    const message = mapMessageDoc("msg1", {
      senderId: "aluno123",
      text: "Podemos marcar uma aula?",
    });

    assert.equal(message.senderId, "aluno123");
    assert.equal(message.text, "Podemos marcar uma aula?");
  });
});
