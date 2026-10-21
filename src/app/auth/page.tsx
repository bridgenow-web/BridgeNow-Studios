import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-sky-wash" />}>
      <AuthScreen />
    </Suspense>
  );
}
