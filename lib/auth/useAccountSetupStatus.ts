"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  accountSetupPathForRole,
  isAccountSetupComplete,
} from "@/lib/auth/account-setup";
import { normalizeRole } from "@/lib/auth/roles";
import { subscribeToStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { subscribeToTutorProfile } from "@/lib/tutors/service";

export function useAccountSetupStatus() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile | null>(null);
  const [tutorDoc, setTutorDoc] = useState<FirestoreTutorDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const role = normalizeRole(userDoc?.role);

  useEffect(() => {
    if (!user || !userDoc) {
      setLearningProfile(null);
      setTutorDoc(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    let pending = 0;
    let cancelled = false;

    const markLoaded = () => {
      pending -= 1;
      if (!cancelled && pending <= 0) {
        setProfileLoading(false);
      }
    };

    let unsubscribeLearning = () => {};
    let unsubscribeTutor = () => {};

    if (role === "student") {
      pending += 1;
      unsubscribeLearning = subscribeToStudentLearningProfile(
        user.uid,
        (profile) => {
          setLearningProfile(profile);
          markLoaded();
        },
        () => {
          setLearningProfile({});
          markLoaded();
        },
      );
    } else if (role === "lecturer") {
      pending += 1;
      unsubscribeTutor = subscribeToTutorProfile(
        user.uid,
        (profile) => {
          setTutorDoc(profile);
          markLoaded();
        },
        () => {
          setTutorDoc(null);
          markLoaded();
        },
      );
    } else {
      setProfileLoading(false);
    }

    return () => {
      cancelled = true;
      unsubscribeLearning();
      unsubscribeTutor();
    };
  }, [role, user, userDoc]);

  const isComplete = useMemo(
    () =>
      isAccountSetupComplete({
        role,
        userDoc,
        learningProfile,
        tutorDoc,
      }),
    [learningProfile, role, tutorDoc, userDoc],
  );

  const setupPath = accountSetupPathForRole(role);

  return {
    role,
    userDoc,
    learningProfile,
    tutorDoc,
    isComplete,
    setupPath,
    loading: authLoading || (!!user && !!userDoc && profileLoading),
  };
}
