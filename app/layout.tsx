import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Roamly — Travel plans made personal",
  description: "Create thoughtful travel plans around the way you like to explore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
