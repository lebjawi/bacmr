import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  BookOpen,
  Briefcase,
  Globe,
  Download,
  Search,
  Users,
  Plus,
  MoreHorizontal,
  Pencil,
  Key,
  UserCheck,
  UserX,
} from "lucide-react";

interface AdminStats {
  totalPdfs: number;
  readyPdfs: number;
  queuedJobs: number;
  runningJobs: number;
}

interface PdfItem {
  id: string;
  title: string;
  subject: string;
  stream: string;
  year: number;
  status: string;
  pages: number;
  chunks: number;
  uploadedAt: string;
}

interface JobItem {
  id: string;
  pdfId: string;
  pdfTitle: string;
  status: string;
  pagesDone: number;
  totalPages: number;
  chunksDone: number;
  totalChunks: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

interface DiscoveredBook {
  title: string;
  pdfUrl: string;
  educationLevel: "elementary" | "secondary" | "high_school";
  yearNumber: number;
  subject: string;
  specialization: string | null;
  edition: string | null;
  sourcePageUrl: string;
}

interface DiscoverResponse {
  books: DiscoveredBook[];
  total: number;
}

interface ImportResponse {
  results: unknown[];
  summary: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  };
}

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
}

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  elementary: "Elementary",
  secondary: "Secondary",
  high_school: "High School",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    UPLOADED: "bg-muted text-muted-foreground",
    INGESTING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    READY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    QUEUED: "bg-muted text-muted-foreground",
    RUNNING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Badge
      variant="outline"
      className={variants[status] || ""}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {status}
    </Badge>
  );
}

function StatsCards({ stats, isLoading }: { stats?: AdminStats; isLoading: boolean }) {
  const cards = [
    { label: "Total PDFs", value: stats?.totalPdfs ?? 0, icon: FileText },
    { label: "Ready PDFs", value: stats?.readyPdfs ?? 0, icon: CheckCircle },
    { label: "Queued Jobs", value: stats?.queuedJobs ?? 0, icon: Clock },
    { label: "Running Jobs", value: stats?.runningJobs ?? 0, icon: Loader2 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                {card.value}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PdfUploadForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState("");
  const [year, setYear] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [yearNumber, setYearNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/pdfs", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pdfs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      setFile(null);
      setTitle("");
      setSubject("");
      setStream("");
      setYear("");
      setEducationLevel("");
      setYearNumber("");
      setSpecialization("");
      toast({ title: "PDF uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.pdf$/i, ""));
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleSubmit = () => {
    if (!file || !title) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (subject) formData.append("subject", subject);
    if (stream) formData.append("stream", stream);
    if (year) formData.append("year", year);
    if (educationLevel) formData.append("educationLevel", educationLevel);
    if (yearNumber) formData.append("yearNumber", yearNumber);
    if (specialization) formData.append("specialization", specialization);
    uploadMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
          <Upload className="h-5 w-5" />
          Upload PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dropzone-upload"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-file"
          />
          <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          {file ? (
            <p className="text-sm font-medium" data-testid="text-selected-file">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag & drop a PDF here, or click to browse
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="PDF title"
              data-testid="input-title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mathématiques">Mathématiques</SelectItem>
                <SelectItem value="Physique-Chimie">Physique-Chimie</SelectItem>
                <SelectItem value="Sciences Naturelles">Sciences Naturelles</SelectItem>
                <SelectItem value="Philosophie">Philosophie</SelectItem>
                <SelectItem value="Français">Français</SelectItem>
                <SelectItem value="العربية">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Stream</label>
            <Select value={stream} onValueChange={setStream}>
              <SelectTrigger data-testid="select-stream">
                <SelectValue placeholder="Select stream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Série C">Série C</SelectItem>
                <SelectItem value="Série D">Série D</SelectItem>
                <SelectItem value="Série A">Série A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Year / Edition</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
              data-testid="input-year"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Education Level</label>
            <Select value={educationLevel} onValueChange={setEducationLevel}>
              <SelectTrigger data-testid="select-education-level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elementary">Elementary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="high_school">High School</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Year Number</label>
            <Input
              type="number"
              min={1}
              max={7}
              value={yearNumber}
              onChange={(e) => setYearNumber(e.target.value)}
              placeholder="1-7"
              data-testid="input-year-number"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Specialization</label>
            <Select value={specialization} onValueChange={setSpecialization}>
              <SelectTrigger data-testid="select-specialization">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="O">O</SelectItem>
                <SelectItem value="TM">TM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || !title || uploadMutation.isPending}
          data-testid="button-upload"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload />
              Upload PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function PdfLibraryTab() {
  const { toast } = useToast();

  const { data: pdfs, isLoading } = useQuery<PdfItem[]>({
    queryKey: ["/api/admin/pdfs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/pdfs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pdfs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "PDF deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <PdfUploadForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            <BookOpen className="h-5 w-5" />
            PDF Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !pdfs || pdfs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-pdfs">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No PDFs uploaded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdfs.map((pdf) => (
                  <TableRow key={pdf.id} data-testid={`row-pdf-${pdf.id}`}>
                    <TableCell className="font-medium">{pdf.title}</TableCell>
                    <TableCell className="text-muted-foreground">{pdf.subject || "\u2014"}</TableCell>
                    <TableCell>
                      <StatusBadge status={pdf.status} />
                    </TableCell>
                    <TableCell>{pdf.pages ?? "\u2014"}</TableCell>
                    <TableCell>{pdf.chunks ?? "\u2014"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {pdf.uploadedAt ? new Date(pdf.uploadedAt).toLocaleDateString() : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-view-pdf-${pdf.id}`}
                        >
                          <Eye />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(pdf.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-pdf-${pdf.id}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IngestionJobsTab() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs, isLoading } = useQuery<JobItem[]>({
    queryKey: ["/api/admin/jobs"],
    refetchInterval: (query) => {
      const data = query.state.data as JobItem[] | undefined;
      const hasRunning = data?.some((j) => j.status === "RUNNING");
      return hasRunning ? 3000 : false;
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/jobs/dispatch");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Processing started", description: "All queued jobs will be processed automatically" });
    },
    onError: (error: Error) => {
      toast({ title: "Dispatch failed", description: error.message, variant: "destructive" });
    },
  });

  const requeueMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/jobs/${id}/requeue`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Job requeued" });
    },
    onError: (error: Error) => {
      toast({ title: "Requeue failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Ingestion Jobs
        </h3>
        <Button
          onClick={() => dispatchMutation.mutate()}
          disabled={dispatchMutation.isPending}
          data-testid="button-dispatch-job"
        >
          {dispatchMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play />
          )}
          Process All Queued
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-jobs">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No ingestion jobs yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>PDF Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Pages Done</TableHead>
                  <TableHead>Chunks Done</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const progress =
                    job.totalChunks > 0
                      ? Math.round((job.chunksDone / job.totalChunks) * 100)
                      : 0;

                  return (
                    <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {job.id.length > 8 ? `${job.id.slice(0, 8)}...` : job.id}
                      </TableCell>
                      <TableCell className="font-medium">{job.pdfTitle}</TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.pagesDone}/{job.totalPages}
                      </TableCell>
                      <TableCell>
                        {job.chunksDone}/{job.totalChunks}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(job.status === "FAILED" || job.status === "PAUSED") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => requeueMutation.mutate(job.id)}
                              disabled={requeueMutation.isPending}
                              data-testid={`button-requeue-job-${job.id}`}
                            >
                              <RotateCcw />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedJobId(job.id)}
                            data-testid={`button-view-job-${job.id}`}
                          >
                            <Eye />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedJobId && jobs && (
        <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && setSelectedJobId(null)}>
          <DialogContent className="max-w-lg" data-testid="dialog-job-details">
            {(() => {
              const selectedJob = jobs.find((j) => j.id === selectedJobId);
              if (!selectedJob) return null;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>Job Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Job ID</label>
                      <p className="font-mono text-sm break-all" data-testid="text-job-id">
                        {selectedJob.id}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">PDF Title</label>
                      <p className="font-medium" data-testid="text-pdf-title">
                        {selectedJob.pdfTitle}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Status</label>
                      <div data-testid="badge-job-status">
                        <StatusBadge status={selectedJob.status} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Progress</label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Pages: <span data-testid="text-pages-done">{selectedJob.pagesDone}</span>/{<span data-testid="text-total-pages">{selectedJob.totalPages}</span>}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Chunks: <span data-testid="text-chunks-done">{selectedJob.chunksDone}</span>/{<span data-testid="text-total-chunks">{selectedJob.totalChunks}</span>}</span>
                        </div>
                      </div>
                    </div>

                    {selectedJob.status === "FAILED" && selectedJob.errorMessage && (
                      <div className="space-y-2 p-3 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="section-error">
                        <label className="text-sm font-semibold">Error Message</label>
                        <p className="text-sm break-words" data-testid="text-error-message">
                          {selectedJob.errorMessage}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Created At</label>
                        <p data-testid="text-created-at">
                          {new Date(selectedJob.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Updated At</label>
                        <p data-testid="text-updated-at">
                          {new Date(selectedJob.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedJobId(null)}
                        data-testid="button-close-dialog"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function KoutoubiTab() {
  const { toast } = useToast();
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editableBooks, setEditableBooks] = useState<DiscoveredBook[] | null>(null);

  const {
    data: discoverData,
    isLoading: isDiscovering,
    isFetched,
    refetch,
  } = useQuery<DiscoverResponse>({
    queryKey: ["/api/admin/koutoubi/discover"],
    enabled: false,
  });

  useEffect(() => {
    if (discoverData?.books) {
      setEditableBooks(discoverData.books.map((b) => ({ ...b })));
    }
  }, [discoverData]);

  const importMutation = useMutation({
    mutationFn: async (booksToImport: DiscoveredBook[]) => {
      const res = await apiRequest("POST", "/api/admin/koutoubi/import", { books: booksToImport });
      return res.json() as Promise<ImportResponse>;
    },
    onSuccess: (result) => {
      setImportResult(result.summary);
      setSelectedBooks(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pdfs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Import complete", description: `${result.summary.imported} imported, ${result.summary.duplicates} duplicates, ${result.summary.errors} errors` });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const updateBook = (pdfUrl: string, field: keyof DiscoveredBook, value: string | number | null) => {
    setEditableBooks((prev) => {
      if (!prev) return prev;
      return prev.map((b) => b.pdfUrl === pdfUrl ? { ...b, [field]: value } : b);
    });
  };

  const filteredBooks = useMemo(() => {
    if (!editableBooks) return [];
    return editableBooks.filter((b) => {
      if (filterLevel !== "all" && b.educationLevel !== filterLevel) return false;
      if (filterSubject !== "all" && b.subject !== filterSubject) return false;
      return true;
    });
  }, [editableBooks, filterLevel, filterSubject]);

  const allSubjects = useMemo(() => {
    if (!editableBooks) return [];
    return Array.from(new Set(editableBooks.map((b) => b.subject))).sort();
  }, [editableBooks]);

  const allSelected = filteredBooks.length > 0 && filteredBooks.every((b) => selectedBooks.has(b.pdfUrl));

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedBooks);
      filteredBooks.forEach((b) => newSet.delete(b.pdfUrl));
      setSelectedBooks(newSet);
    } else {
      const newSet = new Set(selectedBooks);
      filteredBooks.forEach((b) => newSet.add(b.pdfUrl));
      setSelectedBooks(newSet);
    }
  };

  const toggleBook = (pdfUrl: string) => {
    const newSet = new Set(selectedBooks);
    if (newSet.has(pdfUrl)) {
      newSet.delete(pdfUrl);
    } else {
      newSet.add(pdfUrl);
    }
    setSelectedBooks(newSet);
  };

  const handleImport = () => {
    if (!editableBooks || selectedBooks.size === 0) return;
    const booksToImport = editableBooks.filter((b) => selectedBooks.has(b.pdfUrl));
    importMutation.mutate(booksToImport);
  };

  const truncateUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      return path.length > 40 ? `...${path.slice(-40)}` : path;
    } catch {
      return url.length > 40 ? `...${url.slice(-40)}` : url;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            <Globe className="h-5 w-5" />
            Koutoubi Curriculum Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-koutoubi-description">
            Discover and import official textbooks from koutoubi.mr. This will scan the website for
            available curriculum PDFs and allow you to selectively import them into the library.
          </p>

          <Button
            onClick={() => {
              setImportResult(null);
              setEditableBooks(null);
              refetch();
            }}
            disabled={isDiscovering}
            data-testid="button-discover-books"
          >
            {isDiscovering ? (
              <>
                <Loader2 className="animate-spin" />
                Scanning koutoubi.mr...
              </>
            ) : (
              <>
                <Search />
                Discover Books
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 flex-wrap" data-testid="text-import-results">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium">Import Results:</span>
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {importResult.imported} imported
              </Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                {importResult.duplicates} duplicates
              </Badge>
              {importResult.errors > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {importResult.errors} errors
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isFetched && editableBooks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <BookOpen className="h-5 w-5" />
              Discovered Books ({editableBooks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Education Level</label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-level">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="elementary">Elementary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="high_school">High School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-subject">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {allSubjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 ml-auto flex-wrap">
                <Button
                  variant="outline"
                  onClick={toggleSelectAll}
                  data-testid="button-toggle-select-all"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedBooks.size === 0 || importMutation.isPending}
                  data-testid="button-import-selected"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download />
                      Import Selected ({selectedBooks.size})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-discovered">
                <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No books match the current filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all-header"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Education Level</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Edition</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book, idx) => (
                    <TableRow key={book.pdfUrl} data-testid={`row-book-${idx}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBooks.has(book.pdfUrl)}
                          onCheckedChange={() => toggleBook(book.pdfUrl)}
                          data-testid={`checkbox-book-${idx}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>
                        <Select
                          value={book.educationLevel}
                          onValueChange={(val) => updateBook(book.pdfUrl, "educationLevel", val)}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-level-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="elementary">Elementary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="high_school">High School</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={7}
                          value={book.yearNumber}
                          onChange={(e) => updateBook(book.pdfUrl, "yearNumber", parseInt(e.target.value) || 0)}
                          className="w-[70px]"
                          data-testid={`input-year-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={book.subject}
                          onChange={(e) => updateBook(book.pdfUrl, "subject", e.target.value)}
                          className="w-[150px]"
                          data-testid={`input-subject-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={book.specialization || "_none"}
                          onValueChange={(val) => updateBook(book.pdfUrl, "specialization", val === "_none" ? null : val)}
                        >
                          <SelectTrigger className="w-[100px]" data-testid={`select-spec-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">None</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="O">O</SelectItem>
                            <SelectItem value="TM">TM</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{book.edition || "\u2014"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {truncateUrl(book.pdfUrl)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AdminUser {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

function UsersTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("student");

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState("");

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const { data: usersList, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; firstName?: string; lastName?: string; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDialog(false);
      setNewUsername("");
      setNewPassword("");
      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setNewRole("student");
      toast({ title: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditDialog(false);
      setEditingUser(null);
      toast({ title: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeletingUserId(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      setShowResetDialog(false);
      setResetPasswordUserId(null);
      setResetPasswordValue("");
      toast({ title: "Password reset successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateUser = () => {
    if (!newUsername || !newPassword) return;
    createUserMutation.mutate({
      username: newUsername,
      password: newPassword,
      email: newEmail || undefined,
      firstName: newFirstName || undefined,
      lastName: newLastName || undefined,
      role: newRole,
    });
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditUsername(user.username || "");
    setEditEmail(user.email || "");
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditRole(user.role);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      data: {
        username: editUsername,
        email: editEmail,
        firstName: editFirstName,
        lastName: editLastName,
        role: editRole,
      },
    });
  };

  const openResetDialog = (userId: string) => {
    setResetPasswordUserId(userId);
    setResetPasswordValue("");
    setShowResetDialog(true);
  };

  const handleResetPassword = () => {
    if (!resetPasswordUserId || !resetPasswordValue) return;
    resetPasswordMutation.mutate({ userId: resetPasswordUserId, password: resetPasswordValue });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </h3>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-user">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !usersList || usersList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-users">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No users yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((u) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="font-medium">{u.username || "\u2014"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "\u2014"}</TableCell>
                    <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "\u2014"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-role-${u.id}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={u.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}
                        data-testid={`badge-status-${u.id}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${u.id}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(u)} data-testid={`action-edit-${u.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetDialog(u.id)} data-testid={`action-reset-password-${u.id}`}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.isActive ? (
                            <DropdownMenuItem
                              onClick={() => updateUserMutation.mutate({ userId: u.id, data: { isActive: false } })}
                              data-testid={`action-toggle-active-${u.id}`}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateUserMutation.mutate({ userId: u.id, data: { isActive: true } })}
                              data-testid={`action-toggle-active-${u.id}`}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingUserId(u.id)}
                            data-testid={`action-delete-${u.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with username and password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username *</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                data-testid="input-new-username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password *</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                data-testid="input-new-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-new-firstname"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-new-lastname"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateUser}
              disabled={!newUsername || !newPassword || createUserMutation.isPending}
              className="w-full"
              data-testid="button-create-user"
            >
              {createUserMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Username"
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email"
                data-testid="input-edit-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-edit-firstname"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-edit-lastname"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUserMutation.isPending}
              className="w-full"
              data-testid="button-save-edit"
            >
              {updateUserMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Enter new password"
                data-testid="input-reset-password"
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={!resetPasswordValue || resetPasswordMutation.isPending}
              className="w-full"
              data-testid="button-confirm-reset"
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border border-destructive-border"
              onClick={() => deletingUserId && deleteUserMutation.mutate(deletingUserId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && user.role === "admin",
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Admin Dashboard</h1>
          </div>
          <Button variant="outline" asChild>
            <a href="/" data-testid="link-back-home">Back to Home</a>
          </Button>
        </div>

        <StatsCards stats={stats} isLoading={statsLoading} />

        <Tabs defaultValue="pdfs">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="pdfs" data-testid="tab-pdfs">
              <FileText className="h-4 w-4 mr-1.5" />
              PDF Library
            </TabsTrigger>
            <TabsTrigger value="jobs" data-testid="tab-jobs">
              <Briefcase className="h-4 w-4 mr-1.5" />
              Ingestion Jobs
            </TabsTrigger>
            <TabsTrigger value="koutoubi" data-testid="tab-koutoubi">
              <Globe className="h-4 w-4 mr-1.5" />
              Koutoubi
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-1.5" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs">
            <PdfLibraryTab />
          </TabsContent>

          <TabsContent value="jobs">
            <IngestionJobsTab />
          </TabsContent>

          <TabsContent value="koutoubi">
            <KoutoubiTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
