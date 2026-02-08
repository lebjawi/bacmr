import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useLanguage();

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
    }
  }, [isLoading, isError, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    queryClient.clear();
    setLocation("/");
  };

  const navigation = [
    { name: t('nav', 'dashboard'), href: '/app', icon: LayoutDashboard },
    { name: t('nav', 'subjects'), href: '/app/subjects', icon: BookOpen },
    { name: t('nav', 'exams'), href: '/app/exams', icon: GraduationCap },
    { name: t('nav', 'profile'), href: '/app/profile', icon: User },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h1 className="text-2xl font-serif font-bold text-sidebar-primary tracking-tighter">
          BACMR
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Série C • 2026</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + '/');
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive gap-3" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          {t('nav', 'signOut')}
        </Button>
      </div>
    </div>
  );

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
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-4 w-32 hidden md:block" />
            ) : (
              <span className="text-sm font-medium hidden md:block text-muted-foreground" data-testid="text-welcome">
                {t('nav', 'welcomeBack')}, {user?.fullName?.split(" ")[0] || "Student"}
              </span>
            )}
            <LanguageToggle variant="minimal" />
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
