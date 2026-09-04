import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyEmailContent from "@/components/auth/VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
