import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mindora Admin Console",
  description: "Administrative console for Mindora AI Second Brain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
