import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALWAYSFRIDAY — Strategy, Brand & Digital Products",
  description:
    "We help companies clarify who they are, how they communicate, and how their products work. Intersection of strategy, brand and digital products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
