import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lanyard Admin",
  description: "Shared admin foundation for pharmacy operations and branch workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
