import { describe, expect, it } from "vitest";
import {
  ACTION_LABELS,
  ADMIN_REVIEW_ACTIONS,
  STATUS_LABELS,
  VERIFICATION_STATUSES,
  actionRequiresReason,
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
  canAdminTransition,
  canTutorResubmit,
  isMarketplaceVisible,
  nextStatusForAction,
  resolveVerificationStatus,
  tutorStatusMessage,
  validateAdminReview,
  validateTutorResubmit,
} from "@/lib/tutors/verification";

describe("verification status model", () => {
  it("keeps the explicit status set", () => {
    expect(VERIFICATION_STATUSES).toEqual([
      "pending",
      "approved",
      "rejected",
      "changes_requested",
      "suspended",
    ]);
  });

  it("resolves legacy isVerified documents without verificationStatus", () => {
    expect(resolveVerificationStatus({ isVerified: true })).toBe("approved");
    expect(resolveVerificationStatus({ isVerified: false })).toBe("pending");
    expect(resolveVerificationStatus({})).toBe("pending");
  });

  it("prefers verificationStatus over a stale isVerified flag", () => {
    expect(
      resolveVerificationStatus({ isVerified: true, verificationStatus: "suspended" }),
    ).toBe("suspended");
    expect(
      resolveVerificationStatus({ isVerified: false, verificationStatus: "approved" }),
    ).toBe("approved");
  });

  it("only treats approved tutors as marketplace-visible", () => {
    expect(isMarketplaceVisible({ verificationStatus: "approved" })).toBe(true);
    expect(isMarketplaceVisible({ isVerified: true })).toBe(true);

    for (const status of ["pending", "rejected", "changes_requested", "suspended"] as const) {
      expect(isMarketplaceVisible({ verificationStatus: status, isVerified: true })).toBe(
        false,
      );
    }
  });

  it("exposes Portuguese labels for every status and admin action", () => {
    for (const status of VERIFICATION_STATUSES) {
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
    for (const action of ADMIN_REVIEW_ACTIONS) {
      expect(ACTION_LABELS[action].length).toBeGreaterThan(0);
    }
  });
});

describe("admin status transitions", () => {
  const cases = [
    { from: "pending", action: "approve", next: "approved" },
    { from: "pending", action: "reject", next: "rejected" },
    { from: "pending", action: "request_changes", next: "changes_requested" },
    { from: "changes_requested", action: "approve", next: "approved" },
    { from: "changes_requested", action: "reject", next: "rejected" },
    { from: "rejected", action: "approve", next: "approved" },
    { from: "rejected", action: "request_changes", next: "changes_requested" },
    { from: "approved", action: "suspend", next: "suspended" },
    { from: "approved", action: "reject", next: "rejected" },
    { from: "approved", action: "request_changes", next: "changes_requested" },
    { from: "suspended", action: "approve", next: "approved" },
    { from: "suspended", action: "reject", next: "rejected" },
  ] as const;

  it.each(cases)("allows $from → $action → $next", ({ from, action, next }) => {
    expect(canAdminTransition(from, action)).toBe(true);
    expect(nextStatusForAction(action)).toBe(next);
    expect(
      validateAdminReview({
        currentStatus: from,
        action,
        reason: actionRequiresReason(action) ? "Documento ilegível ou incompleto." : undefined,
      }).nextStatus,
    ).toBe(next);
  });

  const blocked = [
    { from: "pending", action: "suspend" },
    { from: "rejected", action: "suspend" },
    { from: "changes_requested", action: "suspend" },
    { from: "suspended", action: "request_changes" },
    { from: "suspended", action: "suspend" },
    { from: "approved", action: "approve" },
  ] as const;

  it.each(blocked)("rejects $from → $action", ({ from, action }) => {
    expect(canAdminTransition(from, action)).toBe(false);
    expect(() =>
      validateAdminReview({
        currentStatus: from,
        action,
        reason: "Motivo suficiente para a ação.",
      }),
    ).toThrow(/Não é possível/);
  });

  it("requires a reason for reject, request_changes and suspend", () => {
    expect(actionRequiresReason("reject")).toBe(true);
    expect(actionRequiresReason("request_changes")).toBe(true);
    expect(actionRequiresReason("suspend")).toBe(true);
    expect(actionRequiresReason("approve")).toBe(false);

    expect(() =>
      validateAdminReview({ currentStatus: "pending", action: "reject", reason: "curto" }),
    ).toThrow(/motivo/i);
    expect(() =>
      validateAdminReview({ currentStatus: "pending", action: "approve" }),
    ).not.toThrow();
  });

  it("rejects unknown admin actions", () => {
    expect(() =>
      validateAdminReview({ currentStatus: "pending", action: "self_approve" }),
    ).toThrow(/inválida/);
  });
});

describe("tutor resubmit transitions", () => {
  it("allows resubmit only from changes_requested or rejected", () => {
    expect(canTutorResubmit("changes_requested")).toBe(true);
    expect(canTutorResubmit("rejected")).toBe(true);
    expect(canTutorResubmit("pending")).toBe(false);
    expect(canTutorResubmit("approved")).toBe(false);
    expect(canTutorResubmit("suspended")).toBe(false);

    expect(validateTutorResubmit("changes_requested").nextStatus).toBe("pending");
    expect(validateTutorResubmit("rejected").nextStatus).toBe("pending");
    expect(() => validateTutorResubmit("approved")).toThrow(/reenviar/);
  });
});

describe("tutor-facing messages", () => {
  it("includes the review reason when the status needs one", () => {
    expect(tutorStatusMessage("rejected", "Documento vencido.").body).toContain(
      "Documento vencido.",
    );
    expect(tutorStatusMessage("changes_requested", "Envie o diploma.").body).toContain(
      "Envie o diploma.",
    );
    expect(tutorStatusMessage("suspended", "Denúncia confirmada.").body).toContain(
      "Denúncia confirmada.",
    );
    expect(tutorStatusMessage("pending").body).toMatch(/não aparecerá na busca/i);
    expect(tutorStatusMessage("approved").tone).toBe("success");
  });
});

describe("applyAdminVerificationReview", () => {
  function createFakeDb(existing: Record<string, unknown> | null) {
    let updated: Record<string, unknown> | null = null;
    const db = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: existing !== null,
                  data: () => existing ?? undefined,
                };
              },
              async update(payload: Record<string, unknown>) {
                updated = payload;
              },
            };
          },
        };
      },
    };
    const FieldValue = {
      serverTimestamp: () => "TIMESTAMP",
      delete: () => "DELETE",
    };
    return { db, FieldValue, getUpdated: () => updated };
  }

  it("writes approved + isVerified true and records the reviewer", async () => {
    const fake = createFakeDb({ isVerified: false, verificationStatus: "pending" });

    const result = await applyAdminVerificationReview(fake, {
      tutorId: "tutor-1",
      adminUid: "admin-1",
      action: "approve",
    });

    expect(result).toEqual({
      tutorId: "tutor-1",
      status: "approved",
      previousStatus: "pending",
    });
    expect(fake.getUpdated()).toMatchObject({
      verificationStatus: "approved",
      isVerified: true,
      reviewedBy: "admin-1",
      reviewedAt: "TIMESTAMP",
      verificationReason: "DELETE",
    });
  });

  it("writes rejected with reason and isVerified false", async () => {
    const fake = createFakeDb({ verificationStatus: "pending" });

    await applyAdminVerificationReview(fake, {
      tutorId: "tutor-1",
      adminUid: "admin-1",
      action: "reject",
      reason: "O documento enviado está ilegível.",
    });

    expect(fake.getUpdated()).toMatchObject({
      verificationStatus: "rejected",
      isVerified: false,
      reviewedBy: "admin-1",
      verificationReason: "O documento enviado está ilegível.",
    });
  });

  it("suspends only an approved tutor and hides them from the marketplace", async () => {
    const fake = createFakeDb({ isVerified: true, verificationStatus: "approved" });

    const result = await applyAdminVerificationReview(fake, {
      tutorId: "tutor-1",
      adminUid: "admin-9",
      action: "suspend",
      reason: "Perfil denunciado por alunos.",
    });

    expect(result.status).toBe("suspended");
    expect(fake.getUpdated()).toMatchObject({
      verificationStatus: "suspended",
      isVerified: false,
    });
  });

  it("never lets a tutor approve themselves", async () => {
    const fake = createFakeDb({ verificationStatus: "pending" });

    await expect(
      applyAdminVerificationReview(fake, {
        tutorId: "tutor-1",
        adminUid: "tutor-1",
        action: "approve",
      }),
    ).rejects.toThrow(/própria verificação/);
  });

  it("does not let a missing tutor be reviewed", async () => {
    const fake = createFakeDb(null);

    await expect(
      applyAdminVerificationReview(fake, {
        tutorId: "missing",
        adminUid: "admin-1",
        action: "approve",
      }),
    ).rejects.toThrow("Professor não encontrado.");
  });
});

describe("applyTutorVerificationResubmit", () => {
  it("returns the application to pending without letting the tutor set approved", async () => {
    let updated: Record<string, unknown> | null = null;
    const db = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({ verificationStatus: "changes_requested", isVerified: false }),
                };
              },
              async update(payload: Record<string, unknown>) {
                updated = payload;
              },
            };
          },
        };
      },
    };

    const result = await applyTutorVerificationResubmit(
      { db, FieldValue: { serverTimestamp: () => "TIMESTAMP", delete: () => "DELETE" } },
      { tutorId: "tutor-1" },
    );

    expect(result.status).toBe("pending");
    expect(updated).toMatchObject({
      verificationStatus: "pending",
      isVerified: false,
    });
    expect(updated).not.toHaveProperty("reviewedBy");
  });
});
