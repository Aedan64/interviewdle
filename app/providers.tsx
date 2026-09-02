"use client";

import { ClerkProvider } from "@clerk/clerk-react";

export function Providers({ children, publishableKey }: { children: React.ReactNode; publishableKey: string }) {
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
