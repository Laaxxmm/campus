// All user-facing copy lives here so Hindi / regional translations can be added as sibling files.
export const en = {
  appName: "LearnCrew",
  nav: { today: "Today", mocks: "Mocks", progress: "Progress", board: "Board" },
  tpoNav: {
    overview: "Overview",
    heatmap: "Heatmap",
    students: "Students",
    atRisk: "At risk",
    reports: "Reports",
    import: "Import roster",
    batches: "Batches",
    college: "College",
  },
} as const;

export type Copy = typeof en;
export const t = en;
