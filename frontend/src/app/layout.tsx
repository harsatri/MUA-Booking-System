import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MUA Booking — Makeup Artist Profesional",
    template: "%s | MUA Booking",
  },
  description:
    "Lihat pricelist dan booking makeup artist profesional untuk pernikahan, wisuda, dan acara spesialmu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="border-t border-petal/60 py-8 text-center text-sm text-ink-soft">
            MUA Booking · Dibuat dengan cinta.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
