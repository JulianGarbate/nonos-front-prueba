import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PREFS_SCRIPT } from "@/lib/preferences";
import { FeedbackProvider } from "@/components/feedback";
import ConexionBanner from "@/components/ConexionBanner";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "NONOS", template: "%s · NONOS" },
  description: "Ecosistema de cuidado para adultos mayores: familia, cuidadores y tecnología cerca cuando hace falta.",
  applicationName: "NONOS",
  appleWebApp: { capable: true, title: "NONOS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1513" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${openSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#contenido"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand shadow-lift transition focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <AuthProvider>
          <FeedbackProvider>
            <ConexionBanner />
            {children}
          </FeedbackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
