"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Package,
  LogOut,
  Presentation,
  PanelLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

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
  {
    title: "Divisions Head Dashboard (test)",
    href: "/bi/divisionshead",
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
    title: "Supervisor Dashboard",
    href: "/bi/supervisor",
    icon: Users,
    role: ["supervisor", "executive"],
  },
  {
    title: "Salesman Dashboard",
    href: "/bi/salesman",
    icon: Package,
    role: ["salesman", "executive"],
  },
];

// Define props to accept state from the parent layout
interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [isCOO, setIsCOO] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Force system theme logic
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("system");
  }, [setTheme]);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
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

  const filteredNavItems = navItems.filter((item) => {
    if (!item.role) return true;
    return item.role.includes(userRole);
  });

  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="flex h-16 items-center justify-between border-b px-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold dark:text-gray-100">VOS BIA</h1>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Sales Dashboard
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Hide sidebar on login page
  if (pathname === "/") {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300 dark:bg-gray-900 dark:border-gray-800",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* HEADER: Logo + Collapse Button */}
      <div
        className={cn(
          "flex h-16 items-center border-b dark:border-gray-800",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-600 text-white font-bold">
              V
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                VOS BIA
              </h1>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                {isCOO ? "Executive Access" : "Sales Dashboard"}
              </p>
            </div>
          </div>
        )}

        {/* COLLAPSE BUTTON - Beside the text when expanded */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors",
            collapsed && "w-full" // Centers the icon when sidebar is collapsed
          )}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
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

      {/* FOOTER: Logout Only */}
      <div className="border-t p-2 space-y-1 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
