import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi, contentApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { User, Stream } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try { return await authApi.me(); } catch { return null; }
    },
    retry: false,
  });

  const { data: streams } = useQuery<Stream[]>({
    queryKey: ["/api/streams"],
    queryFn: () => contentApi.getStreams(),
  });

  const streamName = streams?.find(s => s.id === user?.streamId)?.name;
  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    queryClient.clear();
    setLocation("/");
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('profile', 'profileSettings')}</h1>
          <p className="text-muted-foreground mt-2">{t('profile', 'manageAccount')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile', 'personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('profile', 'fullName')}</Label>
                {userLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input defaultValue={user?.fullName || ""} disabled data-testid="input-fullname" />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('profile', 'email')}</Label>
                {userLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input defaultValue={user?.email || ""} disabled data-testid="input-email" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile', 'academicSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
               <Label>{t('profile', 'currentStream')}</Label>
               {userLoading ? (
                 <Skeleton className="h-10 w-full" />
               ) : (
                 <div className="p-3 border rounded-md bg-muted/50 font-medium" data-testid="text-stream">
                   {streamName || t('profile', 'notSelected')}
                 </div>
               )}
               <p className="text-xs text-muted-foreground">{t('profile', 'contactSupport')}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="font-medium">{t('profile', 'sessionYear')}</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-session-year">
                {user?.sessionYear || 2026}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile', 'account')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="gap-2" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              {t('nav', 'signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
