import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hey Milo AI — Tu Productor de Video con IA (heymilo.ai)",
  description: "Milo crea, dirige y produce tus videos con IA escena por escena. Paga solo por los minutos de video que renderizas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="bg-[#090a0f] text-zinc-100 min-h-screen antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
