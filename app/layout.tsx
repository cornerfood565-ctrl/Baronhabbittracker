import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baron Habits — Build your consistency",
  description: "A calm, powerful space to build habits and track your progress."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
