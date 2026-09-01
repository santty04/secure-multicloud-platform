import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Secure Multicloud Platform";

export const metadata: Metadata = {
  title: appName,
  description: "Administración segura de infraestructura multicloud (Azure y AWS).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetBrainsMono.variable} dark`}>
      <body className="min-h-screen bg-smp-bg font-sans text-[14px] leading-[1.45] text-smp-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
