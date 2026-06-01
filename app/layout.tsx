import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "BTL Viva Helper",
  description: "Learning OS for the BTL Auction System viva preparation",
  icons: {
    icon: "/ltnc-cat.png",
    apple: "/ltnc-cat.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
