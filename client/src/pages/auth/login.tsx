import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useLanguage();

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/app");
      }
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-2xl font-serif font-bold text-primary">BACMR</Link>
            <LanguageToggle />
          </div>
          <CardTitle className="text-2xl font-serif">{t('auth', 'welcomeBack')}</CardTitle>
          <CardDescription>
            {t('auth', 'enterEmail')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {loginMutation.isError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-login-error">
                {loginMutation.error?.message || t('auth', 'loginFailed')}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth', 'email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth', 'password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-submit">
              {loginMutation.isPending ? t('auth', 'signingIn') : t('auth', 'signIn')}
            </Button>
            <div className="text-center text-sm">
              {t('auth', 'noAccount')}{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                {t('auth', 'signUp')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
