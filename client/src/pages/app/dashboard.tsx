import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlayCircle, Clock, CheckCircle2, ArrowRight, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { authApi, contentApi, progressApi } from "@/lib/api";
import type { User, Subject, LessonProgress } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useLanguage();

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try { return await authApi.me(); } catch { return null; }
    },
    retry: false,
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", user?.streamId],
    queryFn: () => contentApi.getSubjects(user?.streamId ?? undefined),
    enabled: !!user,
  });

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress"],
    queryFn: () => progressApi.getProgress(),
    enabled: !!user,
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;
  const firstName = user?.fullName?.split(" ")[0] || "Student";

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          {userLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="text-3xl font-serif font-bold text-primary" data-testid="text-greeting">
              {t('dashboard', 'goodMorning')}, {firstName}.
            </h1>
          )}
          <p className="text-muted-foreground mt-2">
            {subjects && subjects.length > 0
              ? `${t('dashboard', 'continuePrep')} ${subjects[0].name}.`
              : t('dashboard', 'continueGeneric')}
          </p>
        </div>

        <section className="bg-primary text-primary-foreground rounded-xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              <PlayCircle className="w-4 h-4" />
              <span>{t('dashboard', 'getStarted')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold">
              {t('dashboard', 'continueLearning')}
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              {completedCount > 0
                ? t('dashboard', 'completedLessons').replace('{count}', String(completedCount))
                : t('dashboard', 'startFirst')}
            </p>
            <div className="pt-2">
              <Link href="/app/subjects">
                <Button size="lg" variant="secondary" className="font-semibold gap-2" data-testid="button-browse-subjects">
                  {t('dashboard', 'browseSubjects')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard', 'lessonsCompleted')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-count">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard', 'keepStreak')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard', 'subjectsLabel')}</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-subjects-count">{subjects?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard', 'inCurriculum')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard', 'progress')}</CardTitle>
              <GraduationCap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-progress">
                {completedCount > 0 ? `${completedCount} ${t('dashboard', 'done')}` : t('dashboard', 'justStarted')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard', 'greatProgress')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
