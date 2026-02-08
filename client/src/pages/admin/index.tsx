import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { contentApi, adminApi } from "@/lib/api";
import { Link } from "wouter";
import { BookOpen, FileText, GraduationCap, Layers, Users } from "lucide-react";
import type { Subject, Chapter, ExamPaper, User } from "@shared/schema";

export default function AdminDashboard() {
  const { data: subjects, isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => contentApi.getSubjects(),
  });

  const { data: users, isLoading: loadingUsers } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminApi.getUsers(),
  });

  const { data: exams, isLoading: loadingExams } = useQuery<ExamPaper[]>({
    queryKey: ["/api/exams"],
    queryFn: () => contentApi.getExams(),
  });

  const subjectIds = subjects?.map((s) => s.id) || [];
  const { data: allChapters, isLoading: loadingChapters } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/all-chapters", subjectIds],
    queryFn: async () => {
      if (!subjects || subjects.length === 0) return [];
      const results = await Promise.all(
        subjects.map((s) => contentApi.getChapters(s.id))
      );
      return results.flat();
    },
    enabled: !!subjects && subjects.length > 0,
  });

  const { data: allLessons, isLoading: loadingLessons } = useQuery({
    queryKey: ["/api/admin/all-lessons", allChapters?.map((c) => c.id)],
    queryFn: async () => {
      if (!allChapters || allChapters.length === 0) return [];
      const results = await Promise.all(
        allChapters.map((c) => contentApi.getLessons(c.id))
      );
      return results.flat();
    },
    enabled: !!allChapters && allChapters.length > 0,
  });

  const isLoading = loadingSubjects || loadingExams || loadingChapters || loadingLessons || loadingUsers;

  const stats = [
    {
      title: "Subjects",
      value: subjects?.length ?? 0,
      icon: BookOpen,
      href: "/admin/subjects",
      color: "text-teal-600",
    },
    {
      title: "Chapters",
      value: allChapters?.length ?? 0,
      icon: Layers,
      href: "/admin/subjects",
      color: "text-blue-600",
    },
    {
      title: "Lessons",
      value: allLessons?.length ?? 0,
      icon: FileText,
      href: "/admin/lessons",
      color: "text-purple-600",
    },
    {
      title: "Exams",
      value: exams?.length ?? 0,
      icon: GraduationCap,
      href: "/admin/exams",
      color: "text-orange-600",
    },
    {
      title: "Users",
      value: users?.length ?? 0,
      icon: Users,
      href: "/admin/users",
      color: "text-pink-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your curriculum content
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase()}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase()}`}>
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-serif font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/subjects">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="link-manage-subjects">
                <CardContent className="pt-6 flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">Manage Subjects</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/lessons">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="link-manage-lessons">
                <CardContent className="pt-6 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Manage Lessons</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/exams">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="link-manage-exams">
                <CardContent className="pt-6 flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Manage Exams</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/users">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="link-manage-users">
                <CardContent className="pt-6 flex items-center gap-3">
                  <Users className="h-5 w-5 text-pink-600" />
                  <span className="font-medium">Manage Users</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
