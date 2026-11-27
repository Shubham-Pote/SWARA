import { expect, test } from "bun:test";
import { createIdlePerformance } from "./avatarBehavior";

test("each companion starts with a different profile, blends in and avoids repeating the last activity", () => {
  const maria = createIdlePerformance("Maria", () => 0);
  const akira = createIdlePerformance("Akira", () => 0);
  expect(maria(1, true)).toBeUndefined();
  expect(maria(2, true)).toMatchObject({ name: "wave", weight: 0 });
  expect(maria(3, true)).toMatchObject({ name: "wave", weight: 1 });
  expect(akira(3, true)?.name).toBe("skyline");
  expect(maria(5, true)).toBeUndefined();
  expect(maria(10, true)?.name).toBe("sway");
});

test("interaction interrupts an activity and default mode resumes with a fresh rest period", () => {
  const idle = createIdlePerformance("Maria", () => 0);
  expect(idle(3, true)?.name).toBe("wave");
  expect(idle(3.4, false)).toBeUndefined();
  expect(idle(80, false)).toBeUndefined();
  expect(idle(81, true)).toBeUndefined();
  expect(idle(83, true)?.name).toBe("sway");
});
