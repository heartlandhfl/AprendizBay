"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { computeTutorProfileCompletion } from "@/lib/tutors/profile-completion";
import { subscribeToTutorProfile } from "@/lib/tutors/service";

export function useTutorProfile() {
  const { user } = useAuth();
  const [tutorDoc, setTutorDoc] = useState<FirestoreTutorDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTutorDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToTutorProfile(
      user.uid,
      (profile) => {
        setTutorDoc(profile);
        setLoading(false);
      },
      () => {
        setTutorDoc(null);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const completion = useMemo(() => computeTutorProfileCompletion(tutorDoc), [tutorDoc]);

  return {
    tutorDoc,
    loading,
    isProfileComplete: !!tutorDoc,
    completion,
  };
}
