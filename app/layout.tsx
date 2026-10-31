import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "IllegalHub — Moderation Wiki",
  description: "Публичная база знаний и стандарты модерации Discord-сервера."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}