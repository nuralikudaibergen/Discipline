import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurali — Plan. Learn. Repeat.",
  description:
    "A premium daily planning & language learning workspace. Build streaks, master vocabulary, and own your week.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
