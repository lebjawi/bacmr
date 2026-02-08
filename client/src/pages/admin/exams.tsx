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
import type { ExamPaper, Subject, Stream } from "@shared/schema";

export default function AdminExams() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamPaper | null>(null);
  const [formData, setFormData] = useState({
    year: "2026",
    session: "Normale",
    subjectId: "",
    streamId: "",
    content: "",
    isPublic: "true",
  });

  const { data: exams, isLoading } = useQuery<ExamPaper[]>({
    queryKey: ["/api/exams"],
    queryFn: () => contentApi.getExams(),
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => contentApi.getSubjects(),
  });

  const { data: streams } = useQuery<Stream[]>({
    queryKey: ["/api/streams"],
    queryFn: () => contentApi.getStreams(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateExam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
  });

  const openCreateDialog = () => {
    setEditingExam(null);
    setFormData({
      year: "2026",
      session: "Normale",
      subjectId: "",
      streamId: "",
      content: "",
      isPublic: "true",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (exam: ExamPaper) => {
    setEditingExam(exam);
    setFormData({
      year: String(exam.year),
      session: exam.session,
      subjectId: String(exam.subjectId),
      streamId: String(exam.streamId),
      content: exam.content || "",
      isPublic: String(exam.isPublic),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExam(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      year: Number(formData.year),
      session: formData.session,
      subjectId: Number(formData.subjectId),
      streamId: Number(formData.streamId),
      content: formData.content,
      isPublic: formData.isPublic === "true",
    };
    if (editingExam) {
      updateMutation.mutate({ id: editingExam.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getSubjectName = (subjectId: number) => {
    return subjects?.find((s) => s.id === subjectId)?.name || `Subject ${subjectId}`;
  };

  const getStreamName = (streamId: number) => {
    return streams?.find((s) => s.id === streamId)?.name || `Stream ${streamId}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold" data-testid="text-exams-title">
              Exams
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage exam papers
            </p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-exam">
            <Plus className="h-4 w-4 mr-2" />
            Add Exam
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
                  <TableHead>Year</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams?.map((exam) => (
                  <TableRow key={exam.id} data-testid={`row-exam-${exam.id}`}>
                    <TableCell className="font-medium">{exam.year}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.session}</Badge>
                    </TableCell>
                    <TableCell>{getSubjectName(exam.subjectId)}</TableCell>
                    <TableCell>{getStreamName(exam.streamId)}</TableCell>
                    <TableCell>
                      <Badge variant={exam.isPublic ? "default" : "secondary"}>
                        {exam.isPublic ? "Public" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(exam)}
                          data-testid={`button-edit-exam-${exam.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(exam.id)}
                          data-testid={`button-delete-exam-${exam.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!exams || exams.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No exams found. Add one to get started.
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
                {editingExam ? "Edit Exam" : "Add Exam"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    required
                    data-testid="input-exam-year"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <Select
                    value={formData.session}
                    onValueChange={(val) =>
                      setFormData({ ...formData, session: val })
                    }
                  >
                    <SelectTrigger data-testid="select-exam-session">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normale">Normale</SelectItem>
                      <SelectItem value="Complémentaire">Complémentaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, subjectId: val })
                  }
                >
                  <SelectTrigger data-testid="select-exam-subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stream">Stream</Label>
                <Select
                  value={formData.streamId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, streamId: val })
                  }
                >
                  <SelectTrigger data-testid="select-exam-stream">
                    <SelectValue placeholder="Select a stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams?.map((stream) => (
                      <SelectItem key={stream.id} value={String(stream.id)}>
                        {stream.name} ({stream.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.isPublic}
                  onValueChange={(val) =>
                    setFormData({ ...formData, isPublic: val })
                  }
                >
                  <SelectTrigger data-testid="select-exam-status">
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
                  data-testid="button-cancel-exam"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-exam"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingExam
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
