import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Toaster } from "react-hot-toast";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PipeCraft — Visual CI/CD Editor",
  description:
    "PipeCraft is a drag-and-drop visual CI/CD pipeline editor. Build GitHub Actions workflows without writing YAML.",
  keywords: [
    "CI/CD",
    "GitHub Actions",
    "workflow",
    "pipeline",
    "visual editor",
    "no-code",
    "DevOps",
    "drag and drop",
    "YAML",
    "pipeline as code",
  ],
  authors: [{ name: "PipeCraft" }],
  creator: "PipeCraft",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366F1'/><path d='M8 8h12a4 4 0 0 1 0 8H8V8z' fill='%23fff' opacity='.9'/><circle cx='24' cy='24' r='3' fill='%23fff' opacity='.5'/></svg>",
    shortcut: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366F1'/><path d='M8 8h12a4 4 0 0 1 0 8H8V8z' fill='%23fff' opacity='.9'/><circle cx='24' cy='24' r='3' fill='%23fff' opacity='.5'/></svg>",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PipeCraft",
    title: "PipeCraft — Visual CI/CD Editor",
    description:
      "Design GitHub Actions pipelines visually without writing YAML. Drag and drop, real-time validation, runner cost estimates.",
    images: [
      {
        url: "https://assets.pipecraft.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "PipeCraft — Visual CI/CD Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PipeCraft — Visual CI/CD Editor",
    description:
      "Design GitHub Actions pipelines visually without writing YAML.",
    images: ["https://assets.pipecraft.dev/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0D08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body
        className="antialiased min-h-screen bg-[#0B0D08] text-white font-sans selection:bg-lime-500/30 selection:text-white"
        style={{
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          // Force dark mode
        }}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#131610",
              color: "#E6EADF",
              border: "1px solid #2A3022",
              borderRadius: 8,
            },
          }}
        />
      </body>
    </html>
  );
}
