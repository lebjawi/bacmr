import Layout from "@/components/layout";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { contentApi, progressApi } from "@/lib/api";
import type { Subject, Chapter, Lesson, LessonProgress } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function SubjectDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/app/subjects/:id");
  const subjectId = params?.id ? parseInt(params.id) : 0;

  const { data: subject, isLoading: subjectLoading } = useQuery<Subject>({
    queryKey: ["/api/subjects", subjectId],
    queryFn: () => contentApi.getSubject(subjectId),
    enabled: subjectId > 0,
  });

  const { data: chapters, isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/subjects", subjectId, "chapters"],
    queryFn: () => contentApi.getChapters(subjectId),
    enabled: subjectId > 0,
  });

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress"],
    queryFn: () => progressApi.getProgress(),
  });

  const completedLessonIds = new Set(
    progress?.filter(p => p.completed).map(p => p.lessonId) ?? []
  );

  const isLoading = subjectLoading || chaptersLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/app/subjects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-subject-name">
                  {subject?.name || "Subject"}
                </h1>
                <p className="text-muted-foreground">{t('subjects', 'officialCurriculum')}</p>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : chapters && chapters.length > 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-1">
            <Accordion type="single" collapsible className="w-full" defaultValue={String(chapters[0]?.id)}>
              {chapters.map((chapter, index) => (
                <AccordionItem key={chapter.id} value={String(chapter.id)} className="border-b last:border-0 px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{chapter.title}</h3>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 pl-12">
                    <ChapterLessons chapterId={chapter.id} completedLessonIds={completedLessonIds} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-center text-muted-foreground">
            {t('subjects', 'noChapters')}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ChapterLessons({ chapterId, completedLessonIds }: { chapterId: number; completedLessonIds: Set<number> }) {
  const { t } = useLanguage();

  const { data: lessons, isLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/chapters", chapterId, "lessons"],
    queryFn: () => contentApi.getLessons(chapterId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('subjects', 'noLessons')}</p>;
  }

  return (
    <div className="space-y-2">
      {lessons.map((lesson) => {
        const isCompleted = completedLessonIds.has(lesson.id);
        return (
          <div key={lesson.id} className="flex items-center justify-between group p-2 hover:bg-muted/50 rounded-lg transition-colors" data-testid={`row-lesson-${lesson.id}`}>
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className={isCompleted ? "text-muted-foreground line-through decoration-border" : "text-foreground font-medium"}>
                {lesson.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {lesson.durationMinutes} {t('subjects', 'min')}
              </span>
              <Link href={`/app/lesson/${lesson.id}`}>
                <Button size="sm" variant={isCompleted ? "outline" : "default"}>
                  {isCompleted ? t('subjects', 'review') : t('subjects', 'start')}
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
