import type { Performance } from "./companion";

export const conversationIdleMs = 45_000;

export type AvatarModel = "Maria" | "Akira";
export type StageState = Performance["phase"] | "speaking" | "attentive";
export type Acting = {
  mode: "default" | "interaction";
  state: StageState;
  cue: string;
  mood: string;
  level: () => number;
  letter: () => string;
};

const activities = {
  Maria: [
    { name: "wave", duration: [2.5, 3.5] },
    { name: "sway", duration: [3.5, 5.3] },
    { name: "peek", duration: [2.6, 3.5] },
    { name: "skyline", duration: [3, 4.8] },
  ],
  Akira: [
    { name: "skyline", duration: [4, 6] },
    { name: "stretch", duration: [3.4, 5.2] },
    { name: "reflect", duration: [3, 4.8] },
    { name: "peek", duration: [2.5, 3.8] },
  ],
} as const;

type Activity = (typeof activities)[AvatarModel][number];

export function createIdlePerformance(
  model: AvatarModel,
  random = Math.random,
) {
  const choices = activities[model];
  let previous = -1;
  let next = 1.8 + random() * 2;
  let current:
    | { name: Activity["name"]; start: number; duration: number; side: number }
    | undefined;
  let resting = true;

  return (time: number, atEase: boolean) => {
    if (!atEase) {
      current = undefined;
      resting = false;
      return;
    }
    if (!resting) {
      resting = true;
      next = time + 1.8 + random() * 2;
    }
    if (current && time >= current.start + current.duration) {
      current = undefined;
      next = time + 4.5 + random() * 7;
    }
    if (!current && time >= next) {
      const index = Math.floor(
        random() * (choices.length - Number(previous >= 0)),
      );
      previous = previous >= 0 && index >= previous ? index + 1 : index;
      const {
        name,
        duration: [min, max],
      } = choices[previous]!;
      current = {
        name,
        start: time,
        duration: min + random() * (max - min),
        side: random() < 0.5 ? -1 : 1,
      };
    }
    if (!current) return;
    const age = time - current.start;
    const edge = Math.min(1, age / 0.7, (current.duration - age) / 0.9);
    return {
      name: current.name,
      age,
      side: current.side,
      weight: edge * edge * (3 - 2 * edge),
    };
  };
}
