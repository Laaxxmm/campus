/** Client-safe drill DTO types (no answers before grading). */
export type DrillQuestionDto = { id: string; index: number; section: string; topic: string; stem: string; options: string[]; timeSec: number };
export type AttemptResultDto = {
  questionId: string;
  correct: boolean;
  chosenDisplayed: number | null;
  correctDisplayed: number;
  explanation: string;
  shortcut: string | null;
  xp: number;
};

