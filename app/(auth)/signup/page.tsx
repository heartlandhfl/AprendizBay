import SignupForm from "@/components/auth/SignupForm";
import type { SignupRole } from "@/lib/auth/types";

function resolveDefaultRole(role?: string): SignupRole {
  return role === "tutor" ? "tutor" : "student";
}

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { role?: string };
}) {
  return <SignupForm defaultRole={resolveDefaultRole(searchParams?.role)} />;
}
