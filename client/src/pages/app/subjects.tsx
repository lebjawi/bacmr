import Layout from "@/components/layout";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { contentApi, progressApi } from "@/lib/api";
import type { Subject, LessonProgress } from "@shared/schema";
import * as Icons from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Subjects() {
  const { t } = useLanguage();

  const { data: subjects, isLoading, isError } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => contentApi.getSubjects(),
  });

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress"],
    queryFn: () => progressApi.getProgress(),
  });

  const completedLessonIds = new Set(
    progress?.filter(p => p.completed).map(p => p.lessonId) ?? []
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">{t('subjects', 'yourSubjects')}</h1>
            <p className="text-muted-foreground mt-2">{t('subjects', 'selectSubject')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-full border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-40 mb-4" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">{t('subjects', 'yourSubjects')}</h1>
            <p className="text-muted-foreground mt-2">{t('subjects', 'failedLoad')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('subjects', 'yourSubjects')}</h1>
          <p className="text-muted-foreground mt-2">{t('subjects', 'selectSubject')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects?.map((subject) => {
            const IconComponent = (Icons as any)[subject.icon] || Icons.Book;
            
            return (
              <Link key={subject.id} href={`/app/subjects/${subject.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border" data-testid={`card-subject-${subject.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-serif">{subject.name}</CardTitle>
                    <div className="p-2 bg-secondary rounded-lg text-secondary-foreground">
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SubjectChapterCount subjectId={subject.id} completedLessonIds={completedLessonIds} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function SubjectChapterCount({ subjectId, completedLessonIds }: { subjectId: number; completedLessonIds: Set<number> }) {
  const { t } = useLanguage();

  const { data: chapters } = useQuery<{ id: number; title: string }[]>({
    queryKey: ["/api/subjects", subjectId, "chapters"],
    queryFn: () => contentApi.getChapters(subjectId),
  });

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {chapters ? `${chapters.length} ${t('subjects', 'chapters')}` : t('common', 'loading')}
      </p>
      <div className="w-full bg-secondary h-2 rounded-full mt-4 overflow-hidden">
        <div className="bg-primary h-full rounded-full" style={{ width: '0%' }}></div>
      </div>
      <div className="text-xs text-muted-foreground mt-1 text-right">
        {completedLessonIds.size > 0 ? `${completedLessonIds.size} ${t('subjects', 'lessonsDone')}` : t('subjects', 'notStarted')}
      </div>
    </>
  );
}
