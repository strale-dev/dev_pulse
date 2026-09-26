import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGroteskHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Turn your public GitHub activity into a clear, visual developer dashboard — repositories, contributions, languages, and AI-powered insights.";

export const metadata: Metadata = {
  title: {
    default: "DevPulse",
    template: "%s · DevPulse",
  },
  description: siteDescription,
  openGraph: {
    title: "DevPulse",
    description: siteDescription,
    type: "website",
    locale: "en_US",
    siteName: "DevPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevPulse",
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        ibmPlexSans.variable,
        spaceGroteskHeading.variable
      )}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
