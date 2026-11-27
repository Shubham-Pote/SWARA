import { request } from "./companion";
import type { Language } from "./companion";

type ActivityKind = "exchange" | "lesson" | "reading";
export type DashboardData = {
  today: string;
  activeDays: string[];
  streak: number;
  bestStreak: number;
  exchanges: number;
  lessons: number;
  readings: number;
  xp: number;
  recent: { kind: ActivityKind; title?: string | null; at: string; articleId?: string }[];
};

export async function loadDashboard(token: string, language: Language, signal: AbortSignal): Promise<DashboardData> {
  return (await request(`/dashboard/${language}`, { signal }, token)).json();
}

const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function practiceWeek(today: string, activeDays: string[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + index - 6);
    const key = date.toISOString().slice(0, 10);
    return { key, name: weekday.format(date), label: fullDay.format(date), active: activeDays.includes(key) };
  });
}

export function recentActivity(events: Readonly<DashboardData["recent"]>) {
  const rows = [];
  const exchanges = new Map<string, { count: number }>();
  for (const event of events) {
    const date = new Date(event.at).toISOString().slice(0, 10);
    if (event.kind === "exchange") {
      const existing = exchanges.get(date);
      if (existing) {
        existing.count++;
        continue;
      }
    }
    const row = { ...event, date, count: 1 };
    rows.push(row);
    if (event.kind === "exchange") exchanges.set(date, row);
  }
  return rows;
}

export function nextPractice(language: Language, data: DashboardData | null) {
  const spanish = language === "spanish";
  const name = spanish ? "Spanish" : "Japanese";
  const latest = data?.recent.find(event => event.kind !== "exchange" && event.title?.trim());
  if (latest?.title) return {
    title: latest.kind === "reading" ? "Talk about what you read" : "Use what you learned",
    topic: latest.title.slice(0, 160),
    prompt: `I worked on “${latest.title.slice(0, 160)}” recently. Help me talk about the topic in simple ${name}.`,
  };

  if (!data?.exchanges) return {
    title: spanish ? "A hello in Mexico City" : "A hello in Tokyo",
    detail: spanish
      ? "Meet María outside a record shop and introduce yourself in Spanish."
      : "Meet Akira in a Tokyo bookshop and introduce yourself in Japanese.",
    prompt: spanish
      ? "Let's meet outside a record shop in Mexico City. Help me introduce myself naturally in Spanish."
      : "Let's meet in a Tokyo bookshop. Help me introduce myself naturally in Japanese.",
  };

  return {
    title: spanish ? "The day’s best track" : "A page from today",
    detail: spanish
      ? "Tell María about one moment you’d put on repeat. Try it in Spanish."
      : "Tell Akira about one moment from today. Try describing it in Japanese.",
    prompt: `Let's talk about my day in ${name}. Ask me one question at a time and help me answer naturally.`,
  };
}
