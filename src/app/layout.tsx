// src/app/layout.tsx
"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shared/Sidebar";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {isLoginPage ? (
          // Login page - no sidebar, no margin
          <main className="w-full">{children}</main>
        ) : (
          // Dashboard pages - with sidebar
          <div className="flex min-h-screen w-full">
            <Sidebar />
            <main className="flex-1 ml-64 p-6 transition-all duration-300">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
