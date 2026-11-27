export type Language = "spanish" | "japanese";
export type Profile = { id: string; displayName: string; currentLanguage: Language };
export type Turn = { question: string; reply: string };
export type Performance = {
  phase: "listening" | "thinking" | "responding" | "idle";
  cue: string;
  mood?: string;
};
export type AudioChunk = {
  sequence: number;
  audio: string;
  alignment: { characters: string[]; startSeconds: number[]; endSeconds: number[] } | null;
};

declare const SWARA_API_BASE: string;
const base = typeof SWARA_API_BASE === "string" ? SWARA_API_BASE.replace(/\/$/, "") : "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function request(path: string, options: RequestInit, token?: string) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message || "The room is temporarily unavailable. Try again.");
  }
  return response;
}

export async function signIn(email: string, password: string, registration?: { displayName: string; currentLanguage: Language }): Promise<{ token: string; user: Profile }> {
  const response = await request(`/auth/${registration ? "register" : "login"}`, {
    method: "POST", body: JSON.stringify({ email, password, ...registration })
  });
  return response.json();
}

export async function loadProfile(token: string, signal: AbortSignal): Promise<{ user: Profile }> {
  return (await request("/auth/profile", { signal }, token)).json();
}

export async function changeLanguage(token: string, language: Language): Promise<{ user: Profile }> {
  return (await request("/auth/language", { method: "PUT", body: JSON.stringify({ language }) }, token)).json();
}

export async function loadHistory(token: string, language: Language, signal: AbortSignal): Promise<{ turns: Turn[]; archive?: Turn[] }> {
  return (await request(`/character/${language}/history`, { signal }, token)).json();
}

export async function startConversation(token: string, language: Language, signal: AbortSignal) {
  await request(`/character/${language}/new-conversation`, { method: "POST", signal }, token);
}

export async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error("The reply was interrupted. Try again.");
      pending += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const frame = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const name = /^event: ([^\r\n]+)/m.exec(frame)?.[1];
        const data = /^data: ([^\r\n]+)/m.exec(frame)?.[1];
        if (!name || !data) continue;
        if (name === "done") return;
        yield { name, value: JSON.parse(data) };
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function streamTurn(token: string, language: Language, message: string, voice: boolean, signal: AbortSignal) {
  const response = await request(`/character/${language}/message`, {
    method: "POST", headers: { Accept: "text/event-stream" }, body: JSON.stringify({ message, voice }), signal
  }, token);
  if (!response.body || !response.headers.get("Content-Type")?.includes("text/event-stream")) {
    throw new Error("The companion did not send a conversation stream.");
  }
  return readEvents(response.body);
}
