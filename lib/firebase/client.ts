import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type PublicFirebaseConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const FIREBASE_NOT_CONFIGURED =
  "Firebase não está configurado. Defina NEXT_PUBLIC_FIREBASE_* nas variáveis de ambiente do Hostinger.";

function bakedConfig(): PublicFirebaseConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function hasFirebaseApiKey(config: PublicFirebaseConfig | null | undefined): boolean {
  return Boolean(config?.apiKey?.trim());
}

let configPromise: Promise<PublicFirebaseConfig | null> | null = null;
let resolvedConfig: PublicFirebaseConfig | null = null;
let firebaseApp: FirebaseApp | undefined;

function pickValidConfig(config: PublicFirebaseConfig | null | undefined): PublicFirebaseConfig | null {
  return hasFirebaseApiKey(config) ? (config as PublicFirebaseConfig) : null;
}

export async function loadPublicFirebaseConfig(): Promise<PublicFirebaseConfig | null> {
  if (resolvedConfig) {
    return resolvedConfig;
  }

  if (typeof window === "undefined") {
    resolvedConfig = pickValidConfig(bakedConfig());
    return resolvedConfig;
  }

  if (!configPromise) {
    configPromise = fetch("/api/public-config")
      .then(async (response) => {
        if (!response.ok) {
          return pickValidConfig(bakedConfig());
        }

        const data = (await response.json()) as { firebase?: PublicFirebaseConfig };
        return pickValidConfig(data.firebase) ?? pickValidConfig(bakedConfig());
      })
      .catch(() => pickValidConfig(bakedConfig()))
      .then((config) => {
        resolvedConfig = config;
        return config;
      });
  }

  return configPromise;
}

export async function ensureFirebaseApp(): Promise<FirebaseApp | null> {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const config = await loadPublicFirebaseConfig();
  if (!config) {
    return null;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  return firebaseApp;
}

export async function requireFirebaseApp(): Promise<FirebaseApp> {
  const app = await ensureFirebaseApp();
  if (!app) {
    throw new Error(FIREBASE_NOT_CONFIGURED);
  }
  return app;
}

export function whenFirebaseReady(
  start: () => () => void,
  onUnavailable?: () => void,
): () => void {
  let inner = () => {};
  let cancelled = false;

  void ensureFirebaseApp()
    .then((app) => {
      if (cancelled) {
        return;
      }
      if (!app) {
        onUnavailable?.();
        return;
      }
      inner = start();
    })
    .catch(() => {
      if (!cancelled) {
        onUnavailable?.();
      }
    });

  return () => {
    cancelled = true;
    inner();
  };
}

function getOrInitApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK is only available in the browser.");
  }

  const config = pickValidConfig(resolvedConfig) ?? pickValidConfig(bakedConfig());
  if (!config) {
    throw new Error(FIREBASE_NOT_CONFIGURED);
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  return firebaseApp;
}

function createLazyService<T extends object>(initializer: () => T): T {
  let service: T | undefined;

  return new Proxy({} as T, {
    get(_target, property) {
      if (!service) {
        service = initializer();
      }

      const value = Reflect.get(service, property, service);
      return typeof value === "function" ? value.bind(service) : value;
    },
  });
}

export const app = createLazyService(() => getOrInitApp());
export const auth: Auth = createLazyService(() => getAuth(getOrInitApp()));
export const db: Firestore = createLazyService(() => getFirestore(getOrInitApp()));
export const storage: FirebaseStorage = createLazyService(() =>
  getStorage(getOrInitApp()),
);
