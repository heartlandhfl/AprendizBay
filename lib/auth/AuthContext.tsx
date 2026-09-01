"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { ensureFirebaseApp } from "@/lib/firebase/client";
import type { UserDoc } from "@/lib/auth/types";
import { ensureOwnPublicProfile } from "@/lib/users/public-profile";

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let cancelled = false;

    void ensureFirebaseApp().then((app) => {
      if (cancelled) {
        return;
      }

      if (!app) {
        setAuthLoading(false);
        return;
      }

      unsubscribeAuth = onAuthStateChanged(getAuth(app), (nextUser) => {
        setUser(nextUser);
        setAuthLoading(false);

        if (!nextUser) {
          setUserDoc(null);
          setProfileLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let unsubscribeProfile = () => {};
    let cancelled = false;
    setProfileLoading(true);

    void ensureFirebaseApp().then((app) => {
      if (cancelled || !app) {
        if (!cancelled) {
          setUserDoc(null);
          setProfileLoading(false);
        }
        return;
      }

      const userRef = doc(getFirestore(app), "users", user.uid);
      unsubscribeProfile = onSnapshot(
        userRef,
        (snapshot) => {
          const nextDoc = snapshot.exists() ? (snapshot.data() as UserDoc) : null;
          setUserDoc(nextDoc);
          setProfileLoading(false);

          if (nextDoc) {
            void ensureOwnPublicProfile(user.uid, {
              displayName: nextDoc.displayName,
              photoUrl: nextDoc.photoUrl,
            }).catch(() => {
              // Existing accounts get a public profile on the next successful write.
            });
          }
        },
        () => {
          setUserDoc(null);
          setProfileLoading(false);
        },
      );
    });

    return () => {
      cancelled = true;
      unsubscribeProfile();
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      userDoc,
      loading: authLoading || (!!user && profileLoading),
    }),
    [authLoading, profileLoading, user, userDoc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
