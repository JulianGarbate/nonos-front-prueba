import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NONOS",
  description: "Ecosistema de cuidado para adultos mayores",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F7FAF8] text-[#181C1B]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
