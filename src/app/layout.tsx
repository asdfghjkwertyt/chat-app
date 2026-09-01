import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConnectHub — Encrypted Team Chat & Calls",
  description:
    "End-to-end encrypted chat and calls for your team. No phone number needed.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="mesh-bg text-white antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
