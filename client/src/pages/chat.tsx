import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Send,
  Plus,
  Bot,
  Sparkles,
  BookOpen,
  FileText,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Calculator,
  Atom,
  Leaf,
} from "lucide-react";

interface Citation {
  pdfTitle: string;
  pageStart: number;
  pageEnd: number;
  sourceRef: string;
  distance: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  subject: string;
  icon: typeof Calculator;
  messages: ChatMessage[];
  createdAt: Date;
}

const subjectIcons: Record<string, typeof Calculator> = {
  Math: Calculator,
  Physics: Atom,
  Biology: Leaf,
  General: BookOpen,
};

function getSuggestedQuestions(t: (key: string) => string) {
  return [
    { text: t("chat.suggestNewton"), icon: Atom },
    { text: t("chat.suggestDNA"), icon: Leaf },
    { text: t("chat.suggestComplex"), icon: Calculator },
    { text: t("chat.suggestPhotosynthesis"), icon: Leaf },
  ];
}

function detectSubject(message: string): { subject: string; icon: typeof Calculator } {
  const lower = message.toLowerCase();
  if (lower.match(/newton|force|physics|velocity|acceleration|optic|thermo/))
    return { subject: "Physics", icon: Atom };
  if (lower.match(/dna|biology|cell|photosynthesis|organism|replication/))
    return { subject: "Biology", icon: Leaf };
  if (lower.match(/equation|math|calcul|algebra|geometry|number|integral/))
    return { subject: "Math", icon: Calculator };
  return { subject: "General", icon: BookOpen };
}

function parseSteps(content: string): { isSteps: boolean; steps: string[]; intro?: string } {
  const lines = content.split("\n");
  const stepLines: string[] = [];
  const introLines: string[] = [];
  let foundStep = false;

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (match) {
      foundStep = true;
      stepLines.push(match[2]);
    } else if (!foundStep && line.trim()) {
      introLines.push(line.trim());
    }
  }

  if (stepLines.length >= 2) {
    return {
      isSteps: true,
      steps: stepLines,
      intro: introLines.length > 0 ? introLines.join(" ") : undefined,
    };
  }
  return { isSteps: false, steps: [], intro: content };
}

function groupSessionsByDate(sessions: ChatSession[], t: (key: string) => string): Record<string, ChatSession[]> {
  const groups: Record<string, ChatSession[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const session of sessions) {
    const sessionDate = new Date(
      session.createdAt.getFullYear(),
      session.createdAt.getMonth(),
      session.createdAt.getDate()
    );
    let label: string;
    if (sessionDate.getTime() === today.getTime()) label = t("chat.today");
    else if (sessionDate.getTime() === yesterday.getTime()) label = t("chat.yesterday");
    else label = sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
  }
  return groups;
}

function LoadingDots() {
  return (
    <div className="flex items-start gap-3" data-testid="loading-indicator">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="bg-card border border-card-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function StepByStepCard({ content, onFollowUp }: { content: string; onFollowUp: (q: string) => void }) {
  const parsed = parseSteps(content);

  if (!parsed.isSteps) {
    return (
      <div className="space-y-3">
        <div className="bg-card border border-card-border rounded-lg">
          <div className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFollowUp("Can you explain this in more detail?")}
            className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5 hover-elevate"
          >
            Explain in more detail
          </button>
          <button
            onClick={() => onFollowUp("Give me a practice problem")}
            className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5 hover-elevate"
          >
            Give me a practice problem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-card-border rounded-lg">
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Step-by-Step Explanation
            </span>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {parsed.intro && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{parsed.intro}</p>
          )}
          <div className="space-y-0">
            {parsed.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  {i < parsed.steps.length - 1 && (
                    <div className="w-px h-full min-h-[16px] bg-border my-1" />
                  )}
                </div>
                <p className="text-sm leading-relaxed pt-1 pb-3">{renderFormulas(step)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFollowUp("Can you show me an example?")}
          className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5 hover-elevate"
        >
          Show me an example
        </button>
        <button
          onClick={() => onFollowUp("What about edge cases?")}
          className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5 hover-elevate"
        >
          What about edge cases?
        </button>
        <button
          onClick={() => onFollowUp("Give me a practice problem")}
          className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5 hover-elevate"
        >
          Practice problem
        </button>
      </div>
    </div>
  );
}

function renderFormulas(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function CitationCards({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {citations.map((c, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-xs bg-muted/40 border border-border rounded-md px-3 py-2"
          data-testid={`citation-card-${i}`}
        >
          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div>
            <span className="font-medium">{c.pdfTitle}</span>
            <span className="text-muted-foreground ml-1.5">
              pp. {c.pageStart}–{c.pageEnd}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] ml-1 no-default-hover-elevate">
            {Math.round((1 - c.distance) * 100)}%
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const suggestedQuestions = getSuggestedQuestions(t);
  const [, setLocation] = useLocation();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedTextbook, setSelectedTextbook] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: textbookData } = useQuery<{ levels: string[]; textbooks: { id: string; title: string; subject: string; educationLevel: string; yearNumber: number; specialization: string }[] }>({
    queryKey: ["/api/textbooks"],
  });

  const { data: chapterData } = useQuery<{ chapters: { id: string; label: string; pageStart: number; pageEnd: number }[] }>({
    queryKey: ["/api/textbooks", selectedTextbook, "chapters"],
    queryFn: async () => {
      const res = await fetch(`/api/textbooks/${selectedTextbook}/chapters`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chapters");
      return res.json();
    },
    enabled: !!selectedTextbook,
  });

  const filteredTextbooks = textbookData?.textbooks.filter(
    t => !selectedLevel || t.educationLevel === selectedLevel
  ) || [];

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  const latestCitations = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].citations?.length) {
        return messages[i].citations!;
      }
    }
    return [];
  })();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const chapterInfo = selectedChapter && chapterData?.chapters
        ? chapterData.chapters.find(c => c.id === selectedChapter)
        : null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          language,
          pdfFileId: selectedTextbook || undefined,
          educationLevel: selectedLevel || undefined,
          pageStart: chapterInfo?.pageStart,
          pageEnd: chapterInfo?.pageEnd,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data: { answer: string; citations: Citation[]; hasContext: boolean }) => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        citations: data.citations,
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s
        )
      );
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, chatMutation.isPending, scrollToBottom]);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text || inputValue).trim();
      if (!msg || chatMutation.isPending) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
        timestamp: new Date(),
      };

      if (!activeSessionId) {
        const detected = detectSubject(msg);
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: msg.length > 40 ? msg.slice(0, 40) + "..." : msg,
          subject: detected.subject,
          icon: detected.icon,
          messages: [userMsg],
          createdAt: new Date(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        chatMutation.mutate(msg);
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s
          )
        );
        chatMutation.mutate(msg);
      }

      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [inputValue, activeSessionId, chatMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setInputValue("");
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-primary" />
          <p className="text-muted-foreground text-sm">{t("chat.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const groupedSessions = groupSessionsByDate(sessions, t);

  return (
    <div className="h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-sidebar">
        <div className="p-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="flex items-center gap-1.5 text-primary">
              <BookOpen className="w-4 h-4" />
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="font-bold text-sm">BACMR</span>
          </div>
          <Button
            onClick={handleNewSession}
            className="w-full gap-2"
            data-testid="button-new-session"
          >
            <Plus className="w-4 h-4" />
            {t("chat.newSession")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {Object.entries(groupedSessions).map(([label, groupSessions]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {groupSessions.map((session) => {
                    const Icon = session.icon;
                    const isActive = session.id === activeSessionId;
                    return (
                      <button
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={`w-full flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover-elevate ${
                          isActive ? "bg-primary/10" : ""
                        }`}
                        data-testid={`session-item-${session.id}`}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-[11px] text-muted-foreground">{session.subject}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{t("chat.noSessions")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{activeSession?.subject || t("chat.allSubjects")}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">
              {activeSession?.title || t("chat.newChat")}
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            <a href="/" className="text-xs text-muted-foreground" data-testid="link-home">
              {t("chat.home")}
            </a>
            {user && (
              <span className="text-xs text-muted-foreground">
                {user.firstName || user.email || "Student"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v === "all" ? "" : v); setSelectedTextbook(""); setSelectedChapter(""); }}>
            <SelectTrigger className="w-[180px]" data-testid="select-level">
              <SelectValue placeholder={t("chat.allLevels")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chat.allLevels")}</SelectItem>
              <SelectItem value="elementary">{t("chat.elementary")}</SelectItem>
              <SelectItem value="secondary">{t("chat.secondary")}</SelectItem>
              <SelectItem value="high_school">{t("chat.highSchool")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTextbook} onValueChange={(v) => { setSelectedTextbook(v === "all" ? "" : v); setSelectedChapter(""); }} disabled={filteredTextbooks.length === 0}>
            <SelectTrigger className="w-[220px]" data-testid="select-textbook">
              <SelectValue placeholder={t("chat.allTextbooks")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chat.allTextbooks")}</SelectItem>
              {filteredTextbooks.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedChapter}
            onValueChange={(v) => setSelectedChapter(v === "all" ? "" : v)}
            disabled={!selectedTextbook || !chapterData?.chapters?.length}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-chapter">
              <SelectValue placeholder={t("chat.allChapters")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chat.allChapters")}</SelectItem>
              {(chapterData?.chapters || []).map(ch => (
                <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && !chatMutation.isPending && (
              <div className="flex flex-col items-center justify-center pt-12 pb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("chat.greeting")}</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                  {t("chat.greetingDesc")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q.text}
                      onClick={() => handleSend(q.text)}
                      className="flex items-center gap-3 text-left rounded-lg border border-border bg-card px-4 py-3 text-sm hover-elevate"
                      data-testid={`suggested-question-${q.text.slice(0, 20)}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <q.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end" data-testid={`message-user-${msg.id}`}>
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3" data-testid={`message-assistant-${msg.id}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <StepByStepCard content={msg.content} onFollowUp={handleSend} />
                      <CitationCards citations={msg.citations || []} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {chatMutation.isPending && <LoadingDots />}

            {chatMutation.isError && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-destructive" />
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-destructive">
                    {chatMutation.error.message || "Something went wrong. Please try again."}
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                className="min-h-[44px] max-h-[120px] resize-none flex-1"
                rows={1}
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || chatMutation.isPending}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              {t("chat.disclaimer")}
            </p>
          </div>
        </div>
      </main>

      <aside className="hidden xl:flex flex-col w-72 border-l border-border bg-sidebar">
        <div className="p-3 border-b border-sidebar-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t("chat.curriculumContext")}
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("chat.sourceMaterial")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                {latestCitations.length > 0 ? (
                  <div className="space-y-2">
                    {latestCitations.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium leading-tight">{c.pdfTitle}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("chat.pages")} {c.pageStart}–{c.pageEnd}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("chat.noSourcesYet")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("chat.currentChapter")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <p className="text-sm font-medium">
                  {activeSession?.subject || t("chat.selectTopic")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeSession ? `${t("chat.exploring")} ${activeSession.title}` : t("chat.startConversation")}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: activeSession ? "35%" : "0%" }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("chat.keyFormulas")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="space-y-1.5">
                  {[
                    { label: "Newton's 2nd Law", formula: "F = ma" },
                    { label: "Kinetic Energy", formula: "E = \u00BDmv\u00B2" },
                    { label: "Quadratic", formula: "x = (-b\u00B1\u221A(b\u00B2-4ac))/2a" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleSend(`Explain the formula: ${item.formula}`)}
                      className="w-full flex items-center justify-between text-left rounded-md px-2 py-1.5 hover-elevate"
                    >
                      <span className="text-xs">{item.label}</span>
                      <code className="text-[10px] font-mono text-primary">{item.formula}</code>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg bg-gradient-to-br from-primary to-secondary p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary-foreground" />
                <span className="text-xs font-semibold text-primary-foreground uppercase tracking-wider">
                  {t("chat.examTip")}
                </span>
              </div>
              <p className="text-xs text-primary-foreground/90 leading-relaxed">
                {t("chat.examTipText")}
              </p>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
