import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Square, Trash2, MessageSquare, Sparkles, User, Bot } from "lucide-react";
import {
  createSession,
  deleteSession,
  getInstalledModelNames,
  getSession,
  getSessions,
  sendMessage,
  type ChatRole,
  type SessionSummary,
} from "@/lib/api";

export const Route = createFileRoute("/use")({
  head: () => ({
    meta: [
      { title: "Use · Local LLMx" },
      {
        name: "description",
        content: "Chat with your local model — fully persisted, fully private.",
      },
    ],
  }),
  component: UsePage,
});

interface Msg {
  id: string;
  role: ChatRole;
  content: string;
  tokens?: number;
}

async function fetchSession(sessionId: string): Promise<Msg[]> {
  const messages = await getSession(sessionId);

  return messages.map((msg) => ({
    id: crypto.randomUUID(),
    role: msg.role,
    content: msg.content,
  }));
}

function UsePage() {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [currentSessionTitle, setCurrentSessionTitle] = useState("New Chat");
  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const [modelsList, sessionList] = await Promise.all([
          getInstalledModelNames(),
          getSessions(),
        ]);

        if (!mounted) return;

        setAvailableModels(modelsList);
        setSessions(sessionList);

        if (sessionList.length > 0) {
          await openSession(sessionList[0].session_id, sessionList, modelsList);
        } else if (modelsList.length > 0) {
          await createAndOpenNewChat(modelsList);
        } else {
          setCurrentSessionId("");
          setCurrentSessionTitle("New Chat");
          setModel("");
          setMessages([]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load chat data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSessions = async () => {
    const list = await getSessions();
    setSessions(list);
    return list;
  };

  const openSession = async (
    sessionId: string,
    sessionList: SessionSummary[] = sessions,
    modelsList: string[] = availableModels,
  ) => {
    const summary = sessionList.find((s) => s.session_id === sessionId);
    const detailMessages = await fetchSession(sessionId);

    setCurrentSessionId(sessionId);
    setCurrentSessionTitle(summary?.title || "New Chat");

    const sessionModel = summary?.model && summary.model !== "unknown" ? summary.model : "";

    setModel((prev) => sessionModel || prev || modelsList[0] || "");
    setMessages(detailMessages);
    setInput("");
  };

  const createAndOpenNewChat = async (modelsList: string[] = availableModels) => {
    const newSessionId = await createSession();
    const updatedSessions = await refreshSessions();

    await openSession(newSessionId, updatedSessions, modelsList);
    return newSessionId;
  };

  const deleteCurrentChat = async () => {
    if (!currentSessionId || sending) return;

    try {
      setError(null);
      await deleteSession(currentSessionId);

      const updatedSessions = await refreshSessions();

      if (updatedSessions.length > 0) {
        await openSession(updatedSessions[0].session_id, updatedSessions);
      } else {
        await createAndOpenNewChat();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const newChat = async () => {
    if (sending) return;
    try {
      setError(null);
      await createAndOpenNewChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const send = async () => {
    if (!input.trim() || sending) return;

    setError(null);

    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      activeSessionId = await createAndOpenNewChat();
    }

    const text = input.trim();
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        content: "Generating…",
      },
    ]);

    setInput("");
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendMessage(activeSessionId, model, text, controller.signal);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: result.response || "" } : msg,
        ),
      );

      const updatedSessions = await refreshSessions();
      const updatedSession = updatedSessions.find((s) => s.session_id === activeSessionId);

      setCurrentSessionTitle(updatedSession?.title || result.title || "New Chat");

      const persistedMessages = await fetchSession(activeSessionId);
      setMessages(persistedMessages);

      if (updatedSession?.model && updatedSession.model !== "unknown") {
        setModel(updatedSession.model);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: "Error contacting backend. Please try again in a moment.",
                }
              : msg,
          ),
        );
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setSending(false);
    }
  };

  const sessionList = sessions;

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-rows-[auto_1fr_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-1">
      <div className="flex flex-col lg:row-span-3">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card/40 px-6 py-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-primary" />

            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 w-[230px] text-xs" disabled={!availableModels.length}>
                <SelectValue
                  placeholder={availableModels.length ? "Select model" : "No models installed"}
                />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              persisted · local
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={newChat} disabled={sending}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              New Chat
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={deleteCurrentChat}
              disabled={!currentSessionId || sending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Loading Local LLMx…</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Syncing models, sessions, and chat history from your backend.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Talk to {model || "your model"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything stays on your machine. Ask anything to get started.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                        : "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                    }
                  >
                    {m.content || <span className="text-muted-foreground">▌</span>}
                  </div>

                  {m.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card/40 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message your local model… (Enter to send, Shift+Enter for newline)"
                className="min-h-[80px] resize-none pr-14 font-mono text-sm"
                disabled={sending || !model}
              />

              <div className="absolute bottom-2 right-2 flex gap-1">
                {sending ? (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={stop}
                    className="h-9 w-9"
                    type="button"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={() => void send()}
                    disabled={!input.trim() || !model}
                    className="h-9 w-9 bg-gradient-primary text-primary-foreground shadow-glow"
                    type="button"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden border-l border-border bg-card/30 p-4 lg:block">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="px-2">
            <CardTitle className="text-sm">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-2 text-xs">
            <Row k="Title" v={currentSessionTitle} />
            <Row k="Model" v={model || "—"} mono />
            <Row k="Messages" v={messages.length.toString()} />
            <Row k="Status" v={sending ? "Generating…" : "Idle"} />
            <Row k="Session ID" v={currentSessionId ? currentSessionId.slice(0, 8) : "—"} mono />
          </CardContent>
        </Card>

        <Card className="mt-4 border-0 bg-transparent shadow-none">
          <CardHeader className="px-2">
            <CardTitle className="text-sm">Chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-2">
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {sessionList.length > 0 ? (
                sessionList.map((session) => {
                  const active = session.session_id === currentSessionId;

                  return (
                    <button
                      key={session.session_id}
                      type="button"
                      onClick={() => void openSession(session.session_id)}
                      disabled={sending}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-foreground">
                            {session.title || "New Chat"}
                          </div>
                          <div className="mt-1 truncate text-[11px] text-muted-foreground">
                            {session.model || "unknown model"}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {session.message_count}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="px-2 text-xs text-muted-foreground">No saved chats yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 border-0 bg-transparent shadow-none">
          <CardHeader className="px-2">
            <CardTitle className="text-sm">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-2 text-xs text-muted-foreground">
            {messages
              .filter((m) => m.role === "user")
              .slice(-6)
              .reverse()
              .map((m) => (
                <div key={m.id} className="truncate rounded-md bg-muted/30 px-2 py-1.5">
                  {m.content}
                </div>
              ))}

            {messages.length === 0 && <p>No conversation yet.</p>}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>{v}</span>
    </div>
  );
}
