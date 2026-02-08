import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api";
import type { ExamPaper, Subject } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function Exams() {
  const { t } = useLanguage();

  const { data: exams, isLoading: examsLoading } = useQuery<ExamPaper[]>({
    queryKey: ["/api/exams"],
    queryFn: () => contentApi.getExams(),
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => contentApi.getSubjects(),
  });

  const subjectMap = new Map(subjects?.map(s => [s.id, s.name]) ?? []);

  return (
    <Layout>
      <div className="space-y-6">
         <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('exams', 'examArchive')}</h1>
          <p className="text-muted-foreground mt-2">{t('exams', 'practiceWith')}</p>
        </div>

        {examsLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg hidden md:block" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : exams && exams.length > 0 ? (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:bg-muted/30 transition-colors" data-testid={`card-exam-${exam.id}`}>
                <CardContent className="flex items-center justify-between p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-secondary rounded-lg hidden md:block">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{subjectMap.get(exam.subjectId) || "Subject"}</h3>
                        <Badge variant="outline">{exam.year}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('exams', 'session')} {exam.session}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                      <Download className="w-4 h-4" /> PDF
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Eye className="w-4 h-4" /> {t('exams', 'view')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('exams', 'noExams')}
          </div>
        )}
      </div>
    </Layout>
  );
}
