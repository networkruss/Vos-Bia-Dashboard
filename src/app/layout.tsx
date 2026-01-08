// src/app/layout.tsx
"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shared/Sidebar";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { useState } from "react"; // Import useState to manage sidebar state
import { cn } from "@/lib/utils"; // Import utility for dynamic classes

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

  // State to track if sidebar is collapsed
  const [collapsed, setCollapsed] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isLoginPage ? (
            <main className="w-full">{children}</main>
          ) : (
            <div className="flex min-h-screen w-full">
              {/* Pass state and setter to Sidebar so it can toggle itself */}
              <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

              {/* Adjust margin dynamically: ml-16 (collapsed) vs ml-64 (expanded) */}
              <main
                className={cn(
                  "flex-1 p-6 transition-all duration-300",
                  collapsed ? "ml-16" : "ml-64"
                )}
              >
                {children}
              </main>
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
