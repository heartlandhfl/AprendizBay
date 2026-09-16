import { NextResponse } from "next/server";
import { publicObservabilityConfigFromEnv } from "@/lib/observability/config";
import { getPaymentProvider } from "@/lib/payments/gateway/factory";
import { getMercadoPagoPublicKey } from "@/lib/payments/mercadopago";
import { getPlatformFeePercent } from "@/lib/payments/fees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

export async function GET() {
  const firebase = publicFirebaseConfig();
  return NextResponse.json({
    firebase,
    configured: Boolean(String(firebase.apiKey).trim()),
    platformFeePercent: getPlatformFeePercent(),
    paymentProvider: getPaymentProvider(),
    mercadopagoPublicKey: getMercadoPagoPublicKey(),
    observability: publicObservabilityConfigFromEnv(),
  });
}
