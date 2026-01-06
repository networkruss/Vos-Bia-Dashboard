// src/components/shared/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Package,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  Presentation, // Added for Ad-Hoc Analysis
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  role?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Executive Dashboard",
    href: "/bi/executive",
    icon: LayoutDashboard,
    role: ["executive"],
  },
  // --- ADDED EXECUTIVE V2 (Ad-Hoc) HERE ---
  {
    title: "Executive Dashboard V2 (test)",
    href: "/bi/executive-v2",
    icon: Presentation,
    role: ["executive"],
  },
  {
    title: "Manager Dashboard",
    href: "/bi/manager",
    icon: TrendingUp,
    role: ["manager", "executive"],
  },
  {
    title: "Manager V2 (Test)",
    href: "/bi/manager-v2",
    icon: Activity,
    role: ["manager", "executive"],
  },
  {
    title: "Supervisor Dashboard",
    href: "/bi/supervisor",
    icon: Users,
    role: ["supervisor", "executive"],
  },
  {
    title: "Salesman Dashboard",
    href: "/bi/encoder",
    icon: Package,
    role: ["encoder", "executive"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isCOO, setIsCOO] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);

      // Get user role from localStorage (only on client side)
      if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
            setIsCOO(user.isCOO || false);
          } catch (e) {
            console.error("Error parsing user data:", e);
          }
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    router.push("/");
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    // If no role specified, show to everyone
    if (!item.role) return true;

    // Show item if user's role is in the allowed roles
    return item.role.includes(userRole);
  });

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold">VOS BI</h1>
              <p className="text-xs text-muted-foreground">Sales Dashboard</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Don't render sidebar on login page
  if (pathname === "/") {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold">VOS BIA</h1>
              <p className="text-xs text-muted-foreground">
                {isCOO ? "Executive Access" : "Sales Dashboard"}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold mx-auto">
            V
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100",
                isActive && "bg-blue-50 text-blue-600 font-medium",
                !isActive && "text-gray-700",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t p-2 space-y-1">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-all hover:bg-gray-100",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
