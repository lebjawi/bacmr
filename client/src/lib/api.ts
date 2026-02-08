import { queryClient } from "./queryClient";

const API_BASE = "/api";

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    fetchJSON("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; fullName: string; streamId?: number; sessionYear?: number; language?: string }) =>
    fetchJSON("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => fetchJSON("/auth/logout", { method: "POST" }),
  me: () => fetchJSON("/auth/me"),
};

// Content
export const contentApi = {
  getStreams: () => fetchJSON("/streams"),
  getSubjects: (streamId?: number) =>
    fetchJSON(`/subjects${streamId ? `?streamId=${streamId}` : ""}`),
  getSubject: (id: number) => fetchJSON(`/subjects/${id}`),
  getChapters: (subjectId: number) => fetchJSON(`/subjects/${subjectId}/chapters`),
  getLessons: (chapterId: number) => fetchJSON(`/chapters/${chapterId}/lessons`),
  getLesson: (id: number) => fetchJSON(`/lessons/${id}`),
  getExams: (streamId?: number, subjectId?: number) => {
    const params = new URLSearchParams();
    if (streamId) params.set("streamId", String(streamId));
    if (subjectId) params.set("subjectId", String(subjectId));
    const qs = params.toString();
    return fetchJSON(`/exams${qs ? `?${qs}` : ""}`);
  },
  getExam: (id: number) => fetchJSON(`/exams/${id}`),
};

// Progress
export const progressApi = {
  getProgress: () => fetchJSON("/progress"),
  markComplete: (lessonId: number) =>
    fetchJSON("/progress", {
      method: "POST",
      body: JSON.stringify({ lessonId, completed: true }),
    }),
};

// Admin
export const adminApi = {
  createSubject: (data: any) =>
    fetchJSON("/admin/subjects", { method: "POST", body: JSON.stringify(data) }),
  updateSubject: (id: number, data: any) =>
    fetchJSON(`/admin/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubject: (id: number) =>
    fetchJSON(`/admin/subjects/${id}`, { method: "DELETE" }),

  createChapter: (data: any) =>
    fetchJSON("/admin/chapters", { method: "POST", body: JSON.stringify(data) }),
  updateChapter: (id: number, data: any) =>
    fetchJSON(`/admin/chapters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteChapter: (id: number) =>
    fetchJSON(`/admin/chapters/${id}`, { method: "DELETE" }),

  createLesson: (data: any) =>
    fetchJSON("/admin/lessons", { method: "POST", body: JSON.stringify(data) }),
  updateLesson: (id: number, data: any) =>
    fetchJSON(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLesson: (id: number) =>
    fetchJSON(`/admin/lessons/${id}`, { method: "DELETE" }),

  createExam: (data: any) =>
    fetchJSON("/admin/exams", { method: "POST", body: JSON.stringify(data) }),
  updateExam: (id: number, data: any) =>
    fetchJSON(`/admin/exams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExam: (id: number) =>
    fetchJSON(`/admin/exams/${id}`, { method: "DELETE" }),

  getUsers: () => fetchJSON("/admin/users"),
  updateUser: (id: number, data: any) =>
    fetchJSON(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};
