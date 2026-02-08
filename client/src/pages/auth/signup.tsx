import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authApi, contentApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { Stream } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [streamId, setStreamId] = useState<string>("");
  const { t } = useLanguage();

  const { data: streams, isLoading: streamsLoading } = useQuery<Stream[]>({
    queryKey: ["/api/streams"],
    queryFn: () => contentApi.getStreams(),
  });

  const registerMutation = useMutation({
    mutationFn: () => authApi.register({
      fullName,
      email,
      password,
      streamId: streamId ? parseInt(streamId) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/app");
    },
  });

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-2xl font-serif font-bold text-primary">BACMR</Link>
            <LanguageToggle />
          </div>
          <CardTitle className="text-2xl font-serif">{t('auth', 'createAccount')}</CardTitle>
          <CardDescription>
            {t('auth', 'startJourney')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {registerMutation.isError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-signup-error">
                {registerMutation.error?.message || t('auth', 'registrationFailed')}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth', 'fullName')}</Label>
              <Input
                id="name"
                placeholder="Ahmed Ould..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
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
              <Label htmlFor="stream">{t('auth', 'stream')}</Label>
              {streamsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={streamId} onValueChange={setStreamId}>
                  <SelectTrigger data-testid="select-stream">
                    <SelectValue placeholder={t('auth', 'selectStream')} />
                  </SelectTrigger>
                  <SelectContent>
                    {streams?.map((stream) => (
                      <SelectItem key={stream.id} value={String(stream.id)}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[0.8rem] text-muted-foreground">
                {t('auth', 'streamHelp')}
              </p>
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
            <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-submit">
              {registerMutation.isPending ? t('auth', 'creatingAccount') : t('auth', 'createAccountBtn')}
            </Button>
            <div className="text-center text-sm">
              {t('auth', 'haveAccount')}{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                {t('auth', 'logIn')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
