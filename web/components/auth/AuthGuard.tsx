"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FullPageSpinner } from "@/components/ui/Spinner";

/** Wraps authenticated app pages. Redirects to /login client-side when
 * there is no valid session, once auth has resolved. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <FullPageSpinner />;
  }

  if (status === "unauthenticated") {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}
