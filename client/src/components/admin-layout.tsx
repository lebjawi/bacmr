import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  Shield,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: user, isLoading, isError } = useQuery<UserType | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e: any) {
        if (e.message?.includes("401") || e.message?.includes("Unauthorized") || e.message?.includes("Not authenticated")) {
          return null;
        }
        throw e;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      setLocation("/auth/login");
    } else if (!isLoading && user && user.role !== "admin") {
      setLocation("/app");
    }
  }, [isLoading, isError, user, setLocation]);

  if (!isLoading && (!user || user.role !== "admin")) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    queryClient.clear();
    setLocation("/");
  };

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Subjects", href: "/admin/subjects", icon: BookOpen },
    { name: "Lessons", href: "/admin/lessons", icon: FileText },
    { name: "Exams", href: "/admin/exams", icon: GraduationCap },
    { name: "Users", href: "/admin/users", icon: Users },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" />
          <h1 className="text-2xl font-serif font-bold text-white tracking-tighter">
            BACMR Admin
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">Content Management</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href + "/"));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
              onClick={() => setIsMobileOpen(false)}
              data-testid={`link-admin-${item.name.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-1">
        <Link
          href="/app"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          data-testid="link-back-to-app"
        >
          <BookOpen className="h-5 w-5" />
          Back to App
        </Link>
        <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-red-400 gap-3" onClick={handleSignOut} data-testid="button-admin-signout">
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block w-64 fixed h-full z-30">
        <SidebarContent />
      </div>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-20 px-4 flex items-center justify-between md:justify-end">
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)} data-testid="button-admin-mobile-menu">
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-4 w-32 hidden md:block" />
            ) : (
              <span className="text-sm font-medium hidden md:block text-muted-foreground" data-testid="text-admin-welcome">
                Admin: {user?.fullName || "Admin"}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
