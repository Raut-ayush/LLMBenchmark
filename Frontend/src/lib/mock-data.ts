// Mock data for Local LLMx frontend (backend wired later)

export type ModelStatus = "installed" | "downloading" | "not_installed";

export interface Model {
  name: string;
  size: string;
  size_gb: number;
  status: ModelStatus;
  context_length: number;
  modified_at: string;
  family: string;
  min_ram_gb: number;
  recommended_vram_gb: number;
  parameters: string;
}

export const MOCK_MODELS: Model[] = [
  { name: "qwen2.5-coder:3b", size: "1.9 GB", size_gb: 1.9, status: "installed", context_length: 4096, modified_at: "2026-06-18T10:32:00Z", family: "Qwen", min_ram_gb: 4, recommended_vram_gb: 4, parameters: "3B" },
  { name: "llama3.2:3b", size: "2.0 GB", size_gb: 2.0, status: "installed", context_length: 8192, modified_at: "2026-06-12T14:11:00Z", family: "Llama", min_ram_gb: 4, recommended_vram_gb: 4, parameters: "3B" },
  { name: "phi3:mini", size: "2.3 GB", size_gb: 2.3, status: "installed", context_length: 4096, modified_at: "2026-05-30T09:01:00Z", family: "Phi", min_ram_gb: 4, recommended_vram_gb: 4, parameters: "3.8B" },
  { name: "mistral:7b", size: "4.1 GB", size_gb: 4.1, status: "not_installed", context_length: 8192, modified_at: "—", family: "Mistral", min_ram_gb: 8, recommended_vram_gb: 8, parameters: "7B" },
  { name: "llama3.1:8b", size: "4.7 GB", size_gb: 4.7, status: "not_installed", context_length: 8192, modified_at: "—", family: "Llama", min_ram_gb: 8, recommended_vram_gb: 8, parameters: "8B" },
  { name: "qwen2.5:14b", size: "9.0 GB", size_gb: 9.0, status: "not_installed", context_length: 32768, modified_at: "—", family: "Qwen", min_ram_gb: 16, recommended_vram_gb: 12, parameters: "14B" },
  { name: "llama3.1:70b", size: "40 GB", size_gb: 40, status: "not_installed", context_length: 8192, modified_at: "—", family: "Llama", min_ram_gb: 64, recommended_vram_gb: 48, parameters: "70B" },
];

export interface BenchmarkResult {
  session_id: string;
  model: string;
  mode: "cold" | "warm" | "both";
  prompt_name: string;
  load_time_sec: number;
  time_to_first_token_sec: number;
  prompt_tokens: number;
  output_tokens: number;
  prompt_tps: number;
  generation_tps: number;
  total_time_sec: number;
  avg_cpu_percent: number;
  peak_cpu_percent: number;
  avg_ram_used_gb: number;
  peak_ram_used_gb: number;
  avg_gpu_util_percent: number;
  peak_gpu_util_percent: number;
  avg_gpu_memory_mb: number;
  peak_gpu_memory_mb: number;
  avg_gpu_temp_c: number;
  peak_gpu_temp_c: number;
  avg_gpu_power_w: number;
  peak_gpu_power_w: number;
  status: "completed" | "running" | "failed";
  created_at: string;
}

export const MOCK_RESULTS: BenchmarkResult[] = [
  {
    session_id: "sess_001", model: "qwen2.5-coder:3b", mode: "warm", prompt_name: "coding/fibonacci",
    load_time_sec: 0.53, time_to_first_token_sec: 0.61, prompt_tokens: 87, output_tokens: 1000,
    prompt_tps: 382.3, generation_tps: 12.4, total_time_sec: 81.2,
    avg_cpu_percent: 17.1, peak_cpu_percent: 78.3, avg_ram_used_gb: 12.8, peak_ram_used_gb: 13.1,
    avg_gpu_util_percent: 33.3, peak_gpu_util_percent: 98.0, avg_gpu_memory_mb: 2379, peak_gpu_memory_mb: 2379,
    avg_gpu_temp_c: 67.9, peak_gpu_temp_c: 72.0, avg_gpu_power_w: 14.6, peak_gpu_power_w: 18.2,
    status: "completed", created_at: "2026-06-20T18:22:00Z",
  },
  {
    session_id: "sess_002", model: "llama3.2:3b", mode: "cold", prompt_name: "embedded/sensor-loop",
    load_time_sec: 2.41, time_to_first_token_sec: 1.12, prompt_tokens: 142, output_tokens: 800,
    prompt_tps: 298.1, generation_tps: 14.7, total_time_sec: 56.8,
    avg_cpu_percent: 22.4, peak_cpu_percent: 85.1, avg_ram_used_gb: 11.2, peak_ram_used_gb: 12.0,
    avg_gpu_util_percent: 45.6, peak_gpu_util_percent: 96.4, avg_gpu_memory_mb: 2580, peak_gpu_memory_mb: 2610,
    avg_gpu_temp_c: 70.1, peak_gpu_temp_c: 74.5, avg_gpu_power_w: 16.8, peak_gpu_power_w: 21.4,
    status: "completed", created_at: "2026-06-20T15:04:00Z",
  },
  {
    session_id: "sess_003", model: "phi3:mini", mode: "warm", prompt_name: "coding/binary-search",
    load_time_sec: 0.48, time_to_first_token_sec: 0.55, prompt_tokens: 65, output_tokens: 600,
    prompt_tps: 412.8, generation_tps: 18.2, total_time_sec: 33.4,
    avg_cpu_percent: 14.6, peak_cpu_percent: 64.2, avg_ram_used_gb: 10.5, peak_ram_used_gb: 11.0,
    avg_gpu_util_percent: 28.7, peak_gpu_util_percent: 88.3, avg_gpu_memory_mb: 2105, peak_gpu_memory_mb: 2150,
    avg_gpu_temp_c: 65.4, peak_gpu_temp_c: 69.1, avg_gpu_power_w: 12.9, peak_gpu_power_w: 16.0,
    status: "completed", created_at: "2026-06-19T22:48:00Z",
  },
  {
    session_id: "sess_004", model: "qwen2.5-coder:3b", mode: "cold", prompt_name: "coding/fibonacci",
    load_time_sec: 2.84, time_to_first_token_sec: 1.45, prompt_tokens: 87, output_tokens: 1000,
    prompt_tps: 365.1, generation_tps: 11.8, total_time_sec: 85.4,
    avg_cpu_percent: 19.2, peak_cpu_percent: 82.1, avg_ram_used_gb: 13.0, peak_ram_used_gb: 13.4,
    avg_gpu_util_percent: 38.4, peak_gpu_util_percent: 97.2, avg_gpu_memory_mb: 2410, peak_gpu_memory_mb: 2430,
    avg_gpu_temp_c: 69.2, peak_gpu_temp_c: 73.4, avg_gpu_power_w: 15.1, peak_gpu_power_w: 19.0,
    status: "completed", created_at: "2026-06-18T11:15:00Z",
  },
];

export const MOCK_PROMPTS = [
  { id: "coding/fibonacci", label: "Coding · Fibonacci", text: "Write a Python function that returns the nth Fibonacci number using memoization." },
  { id: "coding/binary-search", label: "Coding · Binary Search", text: "Implement a generic binary search in TypeScript with proper edge case handling." },
  { id: "embedded/sensor-loop", label: "Embedded · Sensor Loop", text: "Write a C program for an Arduino that reads a DHT22 sensor every 2 seconds and prints to serial." },
  { id: "reasoning/logic", label: "Reasoning · Logic Puzzle", text: "Three boxes are labeled apples, oranges, and mixed. All labels are wrong. How do you fix them with one pick?" },
];

export const HARDWARE_MATRIX = [
  { tier: "Light (4 GB RAM)", models: ["qwen2.5-coder:3b", "llama3.2:3b", "phi3:mini"], note: "Runs on most laptops, CPU friendly" },
  { tier: "Mid (8–16 GB RAM)", models: ["mistral:7b", "llama3.1:8b"], note: "GPU recommended for usable speed" },
  { tier: "Heavy (16–32 GB RAM + GPU)", models: ["qwen2.5:14b"], note: "8–12 GB VRAM needed" },
  { tier: "Workstation (64 GB+ RAM, 48 GB VRAM)", models: ["llama3.1:70b"], note: "Multi-GPU or quantized only" },
];

export const PROCESS_STEPS = [
  { id: 1, title: "Install Ollama", desc: "Download the Ollama runtime for your OS and pick a model folder." },
  { id: 2, title: "Validate runtime", desc: "Run a health check to confirm the local Ollama server responds on port 11434." },
  { id: 3, title: "Choose a model", desc: "Use the hardware matrix to pick a model that fits your machine." },
  { id: 4, title: "Pull the model", desc: "Stream the weights into your local model folder." },
  { id: 5, title: "Warm up", desc: "Load the model once to populate KV cache and confirm tokens stream." },
  { id: 6, title: "Run a benchmark", desc: "Pick a prompt set, set context + tokens, then start a cold/warm run." },
  { id: 7, title: "Review results", desc: "Compare runs, export CSV/JSON, and tune for your workload." },
];
