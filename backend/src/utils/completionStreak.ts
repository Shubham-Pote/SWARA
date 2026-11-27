export function countConsecutiveCompletionDays(completions: readonly { completedAt?: Date }[]): number {
  let streak = 0;
  let previousDay: Date | undefined;

  for (const { completedAt } of completions) {
    if (!completedAt) continue;
    const day = new Date(completedAt);
    day.setHours(0, 0, 0, 0);

    if (previousDay) {
      if (day.getTime() === previousDay.getTime()) continue;
      const expected = new Date(previousDay);
      expected.setDate(expected.getDate() - 1);
      if (day.getTime() !== expected.getTime()) break;
    }

    streak += 1;
    previousDay = day;
  }

  return streak;
}
