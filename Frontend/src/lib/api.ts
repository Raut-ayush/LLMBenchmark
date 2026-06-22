const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export type ChatRole = "user" | "assistant";

export interface InstalledModel {
  name: string;
  model?: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  details?: {
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface SessionSummary {
  session_id: string;
  title: string;
  model: string;
  created_at?: string;
  updated_at?: string;
  message_count: number;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface SendMessageResponse {
  success: boolean;
  session_id: string;
  title: string;
  message_count: number;
  response: string;
}

export interface HealthStatus {
  api: string;
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
}

export interface RecommendedModel {
  name: string;
  parameters: string;
  ram_required: number;
  vram_required: number;
  category: string;
  recommended: boolean;
}

export interface RecommendedModelsResponse {
  system: {
    ram_gb: number;
    gpu_vram_gb: number;
  };
  models: RecommendedModel[];
}

export interface PullModelResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ModelActionResponse {
  success: boolean;
  model: string;
  error?: string;
}

export interface InspectModelResponse extends ModelActionResponse {
  details?: unknown;
}

export interface RunningModelsResponse {
  count: number;
  models: InstalledModel[];
  ollama_running?: boolean;
  error?: string;
}

interface ModelsResponse {
  models: InstalledModel[];
  ollama_running?: boolean;
  error?: string;
}

interface SessionsResponse {
  count: number;
  sessions: SessionSummary[];
}

interface SessionMessagesResponse {
  messages: ChatMessage[];
}

interface CreateSessionResponse {
  success: boolean;
  session_id: string;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function getModels(): Promise<InstalledModel[]> {
  const data = await apiRequest<ModelsResponse>("/models");
  return data.models ?? [];
}

export async function getHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>("/health");
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  return apiRequest<OllamaStatus>("/ollama/status");
}

export async function getRecommendedModels(): Promise<RecommendedModelsResponse> {
  return apiRequest<RecommendedModelsResponse>("/recommended-models");
}

export async function pullModel(model: string): Promise<PullModelResponse> {
  return apiRequest<PullModelResponse>("/models/pull", {
    method: "POST",
    body: JSON.stringify({ model }),
  });
}

export async function getRunningModels(): Promise<RunningModelsResponse> {
  return apiRequest<RunningModelsResponse>("/models/running");
}

export async function loadModel(model: string): Promise<ModelActionResponse> {
  return apiRequest<ModelActionResponse>("/models/load", {
    method: "POST",
    body: JSON.stringify({ model }),
  });
}

export async function unloadModel(model: string): Promise<ModelActionResponse> {
  return apiRequest<ModelActionResponse>("/models/unload", {
    method: "POST",
    body: JSON.stringify({ model }),
  });
}

export async function inspectModel(model: string): Promise<InspectModelResponse> {
  return apiRequest<InspectModelResponse>(`/models/${encodeURIComponent(model)}`);
}

export async function deleteModel(model: string): Promise<ModelActionResponse> {
  return apiRequest<ModelActionResponse>(`/models/${encodeURIComponent(model)}`, {
    method: "DELETE",
  });
}

export async function getInstalledModelNames(): Promise<string[]> {
  const models = await getModels();
  return models.map((model) => model.name).filter(Boolean);
}

export async function getSessions(): Promise<SessionSummary[]> {
  const data = await apiRequest<SessionsResponse>("/chat/sessions");
  return data.sessions ?? [];
}

export async function createSession(): Promise<string> {
  const data = await apiRequest<CreateSessionResponse>("/chat/session/create", {
    method: "POST",
  });

  return data.session_id;
}

export async function getSession(sessionId: string): Promise<ChatMessage[]> {
  const data = await apiRequest<SessionMessagesResponse>(`/chat/session/${sessionId}`);

  return data.messages ?? [];
}

export async function sendMessage(
  sessionId: string,
  model: string,
  message: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>("/chat/session/message", {
    method: "POST",
    signal,
    body: JSON.stringify({
      session_id: sessionId,
      model,
      message,
    }),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiRequest(`/chat/session/${sessionId}`, {
    method: "DELETE",
  });
}
