import type { Metadata } from "next";

import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";

export const metadata: Metadata = {
  title: "Roamly — Travel plans made personal",
  description: "Create thoughtful travel plans around the way you like to explore.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
