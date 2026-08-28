import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | undefined;

function getOrInitApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK is only available in the browser.");
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
