import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Sparkles, CheckCircle2, Loader2, Mic, MicOff, Paperclip, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { contentApi, progressApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { Lesson as LessonType, LessonProgress, AiConversation, AiMessage } from "@shared/schema";

function renderMarkdown(text: string) {
  const blocks = text.split("\n\n");
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-3">{trimmed.slice(2)}</h1>;
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split("\n").filter(l => l.trim().startsWith("- ") || l.trim().startsWith("* "));
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-2">
          {items.map((item, j) => <li key={j}>{renderInline(item.replace(/^[-*]\s*/, ""))}</li>)}
        </ul>
      );
    }
    const lines = trimmed.split("\n");
    return <p key={i} className="my-2 leading-relaxed">{lines.map((line, j) => <span key={j}>{renderInline(line)}{j < lines.length - 1 && <br />}</span>)}</p>;
  });
}

function renderInline(text: string) {
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return <>{parts}</>;
}

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

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  attachment?: { name: string; type: string; url: string };
}

export default function Lesson() {
  const { t, lang } = useLanguage();
  const [, params] = useRoute("/app/lesson/:id");
  const lessonId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState<'read' | 'ask'>('read');
  const isMobile = useIsMobile();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelWidth, setPanelWidth] = useState(35);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: lesson, isLoading } = useQuery<LessonType>({
    queryKey: ["/api/lessons", lessonId],
    queryFn: () => contentApi.getLesson(lessonId),
    enabled: lessonId > 0,
  });

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress"],
    queryFn: () => progressApi.getProgress(),
  });

  const isCompleted = progress?.some(p => p.lessonId === lessonId && p.completed) ?? false;

  const markCompleteMutation = useMutation({
    mutationFn: () => progressApi.markComplete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
  });

  useEffect(() => {
    if (!lessonId) return;
    fetchJSON(`/ai/conversations?lessonId=${lessonId}`)
      .then((convs: AiConversation[]) => {
        if (convs.length > 0) {
          setConversationId(convs[0].id);
          return fetchJSON(`/ai/conversations/${convs[0].id}/messages`);
        }
        return null;
      })
      .then((msgs: AiMessage[] | null) => {
        if (msgs) {
          setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })));
        }
      })
      .catch(() => {});
  }, [lessonId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(100);
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            try {
              const result = await fetchJSON("/ai/transcribe", {
                method: "POST",
                body: JSON.stringify({ audio: base64 }),
              });
              if (result.transcript) {
                setChatInput(prev => prev + (prev ? " " : "") + result.transcript);
                inputRef.current?.focus();
              }
            } catch (err) {
              console.error("Transcription failed:", err);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setIsTranscribing(false);
        }
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAttachment({ file, preview });
    if (e.target) e.target.value = "";
  }, []);

  const removeAttachment = useCallback(() => {
    if (attachment) {
      URL.revokeObjectURL(attachment.preview);
      setAttachment(null);
    }
  }, [attachment]);

  const handleSendMessage = useCallback(async () => {
    if ((!chatInput.trim() && !attachment) || isStreaming) return;

    const userMessage = chatInput.trim();
    const currentAttachment = attachment;
    setChatInput("");
    setAttachment(null);
    setIsStreaming(true);

    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await fetchJSON("/ai/conversations", {
          method: "POST",
          body: JSON.stringify({ lessonId }),
        });
        convId = conv.id;
        setConversationId(conv.id);
      } catch {
        setIsStreaming(false);
        return;
      }
    }

    let displayContent = userMessage;
    if (currentAttachment) {
      displayContent = userMessage ? `${userMessage}\n[Attached: ${currentAttachment.file.name}]` : `[Attached: ${currentAttachment.file.name}]`;
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: displayContent,
      attachment: currentAttachment ? { name: currentAttachment.file.name, type: currentAttachment.file.type, url: currentAttachment.preview } : undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsg: ChatMessage = { id: Date.now() + 1, role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    let messageContent = userMessage;
    if (currentAttachment && currentAttachment.file.type.startsWith("image/")) {
      messageContent = userMessage ? `${userMessage} [Student attached an image: ${currentAttachment.file.name}]` : `[Student attached an image: ${currentAttachment.file.name}]`;
    }

    try {
      const response = await fetch(`${API_BASE}/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: messageContent || "Help me with this lesson",
          lessonTitle: lesson?.title,
          lessonContent: lesson?.content,
          language: lang,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = { ...last, content: t("lesson", "errorMessage") };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      if (currentAttachment) {
        URL.revokeObjectURL(currentAttachment.preview);
      }
    }
  }, [chatInput, isStreaming, conversationId, lessonId, lesson, attachment]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRightPercent = 100 - (x / rect.width) * 100;
      if (newRightPercent >= 20 && newRightPercent <= 60) {
        setPanelWidth(newRightPercent);
      }
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const lessonTitle = lesson?.title || t("common", "loading");

  const lessonContentJSX = (
    <div className="h-full overflow-y-auto bg-card p-6 md:p-12 w-full">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <article className="prose prose-slate lg:prose-lg dark:prose-invert max-w-none">
          {lesson?.content ? renderMarkdown(lesson.content) : (
            <p className="text-muted-foreground">{t("lesson", "noContent")}</p>
          )}
        </article>
      )}
      <div className="mt-8 flex items-center gap-4">
        {!isCompleted ? (
          <Button
            onClick={() => markCompleteMutation.mutate()}
            disabled={markCompleteMutation.isPending}
            className="gap-2"
            data-testid="button-mark-complete"
          >
            <CheckCircle2 className="w-4 h-4" />
            {markCompleteMutation.isPending ? t("lesson", "marking") : t("lesson", "markComplete")}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-medium" data-testid="text-completed">
            <CheckCircle2 className="w-5 h-5" />
            {t("lesson", "completed")}
          </div>
        )}
      </div>
      <div className="h-24" />
    </div>
  );

  const aiChatJSX = (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{t("lesson", "tutorName")}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("lesson", "tutorHelp")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg rounded-tl-none p-3 text-sm">
              {t("lesson", "tutorGreeting")}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] space-y-2`}>
              {msg.attachment && msg.attachment.type.startsWith("image/") && (
                <img
                  src={msg.attachment.url}
                  alt={msg.attachment.name}
                  className={`max-w-[200px] max-h-[150px] rounded-lg object-cover ${msg.role === "user" ? "ml-auto" : ""}`}
                />
              )}
              <div
                className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted rounded-tl-none"
                }`}
                data-testid={`chat-message-${msg.role}-${msg.id}`}
              >
                {msg.content || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("lesson", "thinking")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-border mt-auto">
        {attachment && (
          <div className="px-4 pt-3 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm">
              {attachment.file.type.startsWith("image/") && (
                <img src={attachment.preview} alt="" className="w-8 h-8 rounded object-cover" />
              )}
              <span className="truncate max-w-[150px]">{attachment.file.name}</span>
              <button onClick={removeAttachment} className="text-muted-foreground hover:text-foreground" data-testid="button-remove-attachment">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              data-testid="input-file-attachment"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              data-testid="button-attachment"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`shrink-0 ${isRecording ? "text-red-500 animate-pulse" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming || isTranscribing}
              data-testid="button-voice-input"
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              placeholder={isTranscribing ? t("lesson", "transcribing") : t("lesson", "askQuestion")}
              className="flex-1"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isStreaming || isTranscribing}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isStreaming || (!chatInput.trim() && !attachment)}
              className="shrink-0"
              data-testid="button-send-message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border bg-background flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("lesson", "lesson")}</span>
            <h1 className="text-sm md:text-base font-bold font-serif text-primary truncate max-w-[200px] md:max-w-md" data-testid="text-lesson-title">
              {lessonTitle}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex md:hidden bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab('read')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'read' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
              data-testid="button-tab-read"
            >
              {t("lesson", "read")}
            </button>
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'ask' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
              data-testid="button-tab-ask"
            >
              {t("lesson", "askAI")}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div className={`flex-1 overflow-hidden ${activeTab === 'read' ? 'block' : 'hidden'}`}>
              {lessonContentJSX}
            </div>
            <div className={`flex-1 overflow-hidden ${activeTab === 'ask' ? 'flex flex-col' : 'hidden'}`}>
              {aiChatJSX}
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            <div style={{ width: `${100 - panelWidth}%` }} className="min-w-0 overflow-hidden">
              {lessonContentJSX}
            </div>
            <div
              className="w-1.5 bg-border hover:bg-primary/50 active:bg-primary transition-colors cursor-col-resize flex-shrink-0 select-none"
              onMouseDown={handleMouseDown}
              data-testid="panel-divider"
            />
            <div style={{ width: `${panelWidth}%` }} className="min-w-0 overflow-hidden">
              {aiChatJSX}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
