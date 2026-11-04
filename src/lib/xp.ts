export const XP = { correct: 10, speedBonus: 5, drillComplete: 20 } as const;

export function xpForAttempt(correct: boolean, timeMs: number, timeSec: number) {
  if (!correct) return 0;
  return XP.correct + (timeMs < (timeSec * 1000) / 2 ? XP.speedBonus : 0);
}
