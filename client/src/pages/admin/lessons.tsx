import { useState } from "react";
import AdminLayout from "@/components/admin-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { contentApi, adminApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Subject, Chapter, Lesson } from "@shared/schema";

interface LessonWithChapter extends Lesson {
  chapterTitle: string;
}

export default function AdminLessons() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    chapterId: "",
    durationMinutes: "15",
    order: "0",
    isPublic: "true",
    content: "",
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => contentApi.getSubjects(),
  });

  const { data: allChapters } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/all-chapters", subjects?.map((s) => s.id)],
    queryFn: async () => {
      if (!subjects || subjects.length === 0) return [];
      const results = await Promise.all(
        subjects.map((s) => contentApi.getChapters(s.id))
      );
      return results.flat();
    },
    enabled: !!subjects && subjects.length > 0,
  });

  const { data: allLessons, isLoading } = useQuery<LessonWithChapter[]>({
    queryKey: ["/api/admin/all-lessons", allChapters?.map((c) => c.id)],
    queryFn: async () => {
      if (!allChapters || allChapters.length === 0) return [];
      const results = await Promise.all(
        allChapters.map(async (chapter) => {
          const lessons: Lesson[] = await contentApi.getLessons(chapter.id);
          return lessons.map((l) => ({
            ...l,
            chapterTitle: chapter.title,
          }));
        })
      );
      return results.flat();
    },
    enabled: !!allChapters && allChapters.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createLesson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-lessons"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateLesson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-lessons"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-lessons"] });
    },
  });

  const openCreateDialog = () => {
    setEditingLesson(null);
    setFormData({
      title: "",
      chapterId: "",
      durationMinutes: "15",
      order: "0",
      isPublic: "true",
      content: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      chapterId: String(lesson.chapterId),
      durationMinutes: String(lesson.durationMinutes),
      order: String(lesson.order),
      isPublic: String(lesson.isPublic),
      content: lesson.content || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLesson(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      chapterId: Number(formData.chapterId),
      durationMinutes: Number(formData.durationMinutes),
      order: Number(formData.order),
      isPublic: formData.isPublic === "true",
      content: formData.content,
    };
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold" data-testid="text-lessons-title">
              Lessons
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage lessons across all chapters
            </p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-lesson">
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLessons?.map((lesson) => (
                  <TableRow key={lesson.id} data-testid={`row-lesson-${lesson.id}`}>
                    <TableCell className="font-medium">{lesson.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lesson.chapterTitle}
                    </TableCell>
                    <TableCell>{lesson.durationMinutes} min</TableCell>
                    <TableCell>
                      <Badge variant={lesson.isPublic ? "default" : "secondary"}>
                        {lesson.isPublic ? "Public" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{lesson.order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lesson)}
                          data-testid={`button-edit-lesson-${lesson.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          data-testid={`button-delete-lesson-${lesson.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!allLessons || allLessons.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No lessons found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? "Edit Lesson" : "Add Lesson"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Introduction to Algebra"
                  required
                  data-testid="input-lesson-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Select
                  value={formData.chapterId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, chapterId: val })
                  }
                >
                  <SelectTrigger data-testid="select-lesson-chapter">
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {allChapters?.map((chapter) => (
                      <SelectItem key={chapter.id} value={String(chapter.id)}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: e.target.value })
                    }
                    data-testid="input-lesson-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: e.target.value })
                    }
                    data-testid="input-lesson-order"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPublic">Status</Label>
                <Select
                  value={formData.isPublic}
                  onValueChange={(val) =>
                    setFormData({ ...formData, isPublic: val })
                  }
                >
                  <SelectTrigger data-testid="select-lesson-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Public</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  data-testid="button-cancel-lesson"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-lesson"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingLesson
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
