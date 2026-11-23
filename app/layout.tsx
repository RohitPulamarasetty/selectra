import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Selectra — Evaluation workspace", template: "%s · Selectra" },
  description: "A collaborative application evaluation and selection workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
