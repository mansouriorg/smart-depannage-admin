// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Import des styles Tailwind
import { cn } from "@/lib/utils";

// Configuration de la police
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Smart Admin | Espace Supervision",
  description: "Plateforme de gestion des interventions techniques.",
  icons: {
    icon: "/favicon.ico", // Si vous en avez un
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={cn(
          "min-h-screen bg-stone-50 font-sans antialiased text-stone-900",
          inter.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}