import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Pastebin Lite",
    description: "Share text with generic constraints",
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
