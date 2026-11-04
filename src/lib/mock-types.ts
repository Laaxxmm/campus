/** Client-safe mock DTOs. Nothing here may carry the correct answer before the attempt has ended. */
export type BlueprintRow = { section: string; topic?: string; count: number; difficulty: [number, number]; timeSec: number };

export type MockSummaryDto = {
  id: string;
  company: string;
  title: string;
  durationSec: number;
  questionCount: number;
  sections: { section: string; count: number }[];
  negativeMark: number;
  markCorrect: number;
  sectional: boolean;
  instructions: string | null;
  scheduled?: { opensAt: string; closesAt: string } | null;
  activeAttemptId: string | null;
  best: { marks: number; maxMarks: number; attemptId: string } | null;
};

export type MockQuestionDto = { id: string; index: number; section: string; stem: string; options: string[] };
export type MockAnswerDto = { choice: number | null; flagged: boolean; visited: boolean; timeMs: number }; // choice = displayed index

export type MockAttemptDto = {
  attemptId: string;
  mockId: string;
  title: string;
  company: string;
  negativeMark: number;
  markCorrect: number;
  sectional: boolean;
  serverNow: string;
  startedAt: string;
  endsAt: string;
  sectionEndsAt: Record<string, string> | null;
  sections: string[];
  questions: MockQuestionDto[];
  answers: Record<string, MockAnswerDto>;
  ended: boolean;
};

export type MockReviewItem = {
  id: string;
  index: number;
  section: string;
  stem: string;
  options: string[];
  yourChoice: number | null; // displayed index
  correctChoice: number; // displayed index
  correct: boolean;
  flagged: boolean;
  timeMs: number;
  explanation: string;
  shortcut: string | null;
};

export type SectionScore = { section: string; total: number; correct: number; wrong: number; skipped: number; marks: number; timeMs: number };

export type MockResultDto = {
  attemptId: string;
  mockId: string;
  title: string;
  company: string;
  marks: number;
  maxMarks: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number | null; // correct / attempted
  avgTimeSec: number;
  percentile: number | null; // within college, same mock
  takers: number;
  autoSubmitted: boolean;
  tabSwitches: number;
  sections: SectionScore[];
  review: MockReviewItem[];
};
