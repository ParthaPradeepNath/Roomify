import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthModalHost } from "@/components/AuthModalHost";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const instrument = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Roomify | AI Floor Plan to 3D Visualization",
  description:
    "Upload a 2D floor plan and generate a photorealistic 3D architectural render with Roomify.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <AuthModalHost />
        </AuthProvider>
      </body>
    </html>
  );
}
