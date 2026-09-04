import { describe, expect, it } from "vitest";
import {
  accountSetupPathForRole,
  accountSetupRedirectTarget,
  isAccountSetupComplete,
  isLecturerAccountSetupComplete,
  isStudentAccountSetupComplete,
  postLoginDestination,
  shouldEnforceAccountSetup,
  signupDestinationForRole,
} from "@/lib/auth/account-setup";
import type { UserDoc } from "@/lib/auth/types";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

function userDoc(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    role: "student",
    displayName: "Ana Silva",
    email: "ana@test.com",
    createdAt: { seconds: 0, nanoseconds: 0 } as UserDoc["createdAt"],
    ...overrides,
  };
}

function completeStudentProfile(): StudentLearningProfile {
  return {
    city: "São Paulo",
    state: "SP",
    phone: "11999999999",
    preferredSubject: "Matemática",
    preferredLevel: "Ensino médio",
    preferredModality: "online",
    learningObjective: "Reforço escolar",
  };
}

function completeTutorDoc(): FirestoreTutorDoc {
  return {
    userId: "tutor-1",
    name: "Professor",
    subject: "Matemática",
    city: "São Paulo",
    state: "SP",
    bio: "Professor com mais de dez anos de experiência.",
    avatarUrl: "https://example.com/avatar.jpg",
    individualPrice: 80,
    collectivePrice: 30,
    modality: "online",
    credentialFileName: "diploma.pdf",
    isVerified: false,
    isOnline: true,
    rating: 0,
    reviewCount: 0,
  };
}

describe("account setup completion", () => {
  it("requires full student setup for new profiles", () => {
    expect(
      isStudentAccountSetupComplete(userDoc(), {
        preferredSubject: "Inglês",
        preferredModality: "online",
      }),
    ).toBe(true);
    expect(isStudentAccountSetupComplete(userDoc(), completeStudentProfile())).toBe(true);
    expect(isStudentAccountSetupComplete(userDoc(), {})).toBe(false);
  });

  it("uses tutor profile completion for lecturers", () => {
    expect(isLecturerAccountSetupComplete(null)).toBe(false);
    expect(isLecturerAccountSetupComplete({ ...completeTutorDoc(), bio: "curta" })).toBe(false);
    expect(isLecturerAccountSetupComplete(completeTutorDoc())).toBe(true);
  });

  it("does not force admin or facilitator through student setup", () => {
    expect(
      isAccountSetupComplete({
        role: "admin",
        userDoc: userDoc({ role: "admin" }),
      }),
    ).toBe(true);
    expect(
      isAccountSetupComplete({
        role: "facilitator",
        userDoc: userDoc({ role: "facilitator" }),
      }),
    ).toBe(true);
  });
});

describe("account setup routing", () => {
  it("routes signups to setup pages", () => {
    expect(signupDestinationForRole("student")).toBe("/account/setup");
    expect(signupDestinationForRole("lecturer")).toBe("/tutor/onboarding");
    expect(signupDestinationForRole("admin")).toBe("/admin");
  });

  it("routes incomplete students to setup after login", () => {
    expect(
      postLoginDestination({
        role: "student",
        userDoc: userDoc(),
        learningProfile: {},
      }),
    ).toBe("/account/setup");
  });

  it("routes complete students to dashboard after login", () => {
    expect(
      postLoginDestination({
        role: "student",
        userDoc: userDoc(),
        learningProfile: completeStudentProfile(),
      }),
    ).toBe("/dashboard");
  });

  it("routes legacy students with learning profile to dashboard", () => {
    expect(
      postLoginDestination({
        role: "student",
        userDoc: userDoc(),
        learningProfile: {
          preferredSubject: "Inglês",
          preferredModality: "online",
        },
      }),
    ).toBe("/dashboard");
  });

  it("routes incomplete lecturers to onboarding and complete lecturers to dashboard", () => {
    expect(
      postLoginDestination({
        role: "lecturer",
        userDoc: userDoc({ role: "lecturer" }),
        tutorDoc: { ...completeTutorDoc(), credentialFileName: "" },
      }),
    ).toBe("/tutor/onboarding");

    expect(
      postLoginDestination({
        role: "lecturer",
        userDoc: userDoc({ role: "lecturer" }),
        tutorDoc: completeTutorDoc(),
      }),
    ).toBe("/tutor/dashboard");
  });

  it("honors requested paths only after setup is complete", () => {
    expect(
      postLoginDestination({
        role: "student",
        userDoc: userDoc(),
        learningProfile: completeStudentProfile(),
        requestedPath: "/bookings",
      }),
    ).toBe("/bookings");

    expect(
      postLoginDestination({
        role: "student",
        userDoc: userDoc(),
        learningProfile: {},
        requestedPath: "/bookings",
      }),
    ).toBe("/account/setup");
  });
});

describe("account setup guards", () => {
  it("maps setup paths by role", () => {
    expect(accountSetupPathForRole("student")).toBe("/account/setup");
    expect(accountSetupPathForRole("lecturer")).toBe("/tutor/onboarding");
    expect(accountSetupPathForRole("admin")).toBeNull();
  });

  it("protects authenticated application routes", () => {
    expect(shouldEnforceAccountSetup("/dashboard", "student")).toBe(true);
    expect(shouldEnforceAccountSetup("/bookings", "student")).toBe(true);
    expect(shouldEnforceAccountSetup("/search", "student")).toBe(true);
    expect(shouldEnforceAccountSetup("/mensagens", "student")).toBe(true);
    expect(shouldEnforceAccountSetup("/tutor/dashboard", "lecturer")).toBe(true);
    expect(shouldEnforceAccountSetup("/bookings", "lecturer")).toBe(true);
  });

  it("does not protect public or setup routes", () => {
    expect(shouldEnforceAccountSetup("/login", "student")).toBe(false);
    expect(shouldEnforceAccountSetup("/signup", "student")).toBe(false);
    expect(shouldEnforceAccountSetup("/account/setup", "student")).toBe(false);
    expect(shouldEnforceAccountSetup("/tutor/onboarding", "lecturer")).toBe(false);
    expect(shouldEnforceAccountSetup("/professores/matematica/sao-paulo", "student")).toBe(false);
    expect(shouldEnforceAccountSetup("/tutor/abc123", "student")).toBe(false);
  });

  it("avoids redirect loops on setup routes", () => {
    expect(
      accountSetupRedirectTarget({
        pathname: "/account/setup",
        role: "student",
        userDoc: userDoc(),
        learningProfile: {},
      }),
    ).toBeNull();

    expect(
      accountSetupRedirectTarget({
        pathname: "/account/setup",
        role: "student",
        userDoc: userDoc(),
        learningProfile: completeStudentProfile(),
      }),
    ).toBe("/dashboard");

    expect(
      accountSetupRedirectTarget({
        pathname: "/dashboard",
        role: "student",
        userDoc: userDoc(),
        learningProfile: {},
      }),
    ).toBe("/account/setup");
  });
});
