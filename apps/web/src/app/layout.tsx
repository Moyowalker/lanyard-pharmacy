import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lanyard Storefront",
  description: "Shared storefront foundation for the Lanyard Pharmacy web experience.",
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
