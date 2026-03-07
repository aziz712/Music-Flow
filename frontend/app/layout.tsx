import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
    title: "Music Flow | Modern Music App",
    description: "Your high-performance personal music transmission platform.",
    manifest: "/manifest.json",
    icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/icon-192.png",
    },
};

export const viewport = {
    themeColor: "#000000",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className="antialiased font-sans" suppressHydrationWarning>
                <AppLayout>
                    {children}
                </AppLayout>
            </body>
        </html>
    );
}
