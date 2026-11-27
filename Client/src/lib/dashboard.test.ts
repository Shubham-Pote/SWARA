import { expect, test } from "bun:test";
import { nextPractice, practiceWeek, recentActivity, type DashboardData } from "./dashboard";

test("the practice path crosses the year boundary in UTC and ends on the API day", () => {
  const week = practiceWeek("2026-01-03", ["2025-12-31", "2026-01-03"]);
  expect(week).toHaveLength(7);
  expect(week[0]?.key).toBe("2025-12-28");
  expect(week.at(-1)?.key).toBe("2026-01-03");
  expect(week.filter(day => day.active).map(day => day.key)).toEqual(["2025-12-31", "2026-01-03"]);
});

test("a recent reading supplies the conversation topic even after a newer exchange", () => {
  const data: DashboardData = { today: "2026-01-03", activeDays: [], streak: 0, bestStreak: 0,
    exchanges: 0, readings: 1, lessons: 0, xp: 0,
    recent: [
      { kind: "exchange", at: "2026-01-03T15:00:00Z" },
      { kind: "reading", title: "The night market", at: "2026-01-03T12:00:00Z" },
    ] };
  const practice = nextPractice("japanese", data);
  expect(practice.topic).toBe("The night market");
  expect(practice.prompt).toContain("The night market");
  expect(practice.prompt).toContain("Japanese");
});

test("recent activity groups same-day exchanges around completed work in UTC", () => {
  const events = [
    { kind: "exchange", at: "2026-01-03T00:10:00Z" },
    { kind: "exchange", at: "2026-01-02T23:55:00Z" },
    { kind: "lesson", at: "2026-01-02T21:00:00Z", title: "Introductions" },
    { kind: "exchange", at: "2026-01-02T20:00:00Z" },
  ] as const satisfies readonly DashboardData["recent"][number][];
  expect(recentActivity(events)).toEqual([
    { ...events[0], date: "2026-01-03", count: 1 },
    { ...events[1], date: "2026-01-02", count: 2 },
    { ...events[2], date: "2026-01-02", count: 1 },
  ]);
});

test("each companion offers a different introduction in the language being practiced", () => {
  const spanish = nextPractice("spanish", null);
  const japanese = nextPractice("japanese", null);
  expect(spanish.title).not.toBe(japanese.title);
  expect(spanish.prompt).toContain("record shop in Mexico City");
  expect(spanish.prompt).toContain("Spanish");
  expect(japanese.prompt).toContain("Tokyo bookshop");
  expect(japanese.prompt).toContain("Japanese");
});
