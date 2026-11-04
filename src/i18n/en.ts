// All user-facing copy lives here so Hindi / regional translations can be added as sibling files.
export const en = {
  appName: "LearnCrew",
  nav: { today: "Today", mocks: "Mocks", progress: "Progress", profile: "Profile", board: "Leaderboard" },
  tpoNav: {
    overview: "Overview",
    heatmap: "Heatmap",
    students: "Students",
    atRisk: "At risk",
    reports: "Reports",
    mocks: "Mocks",
    import: "Import roster",
    batches: "Batches",
    college: "Settings",
  },
  login: {
    title: "Log in to LearnCrew",
    subtitle: "Use the email your college registered. We'll send a one-tap login link.",
    email: "College email",
    submit: "Send login link",
    notInvited: "This email isn't registered. Ask your TPO to add you.",
    genericError: "Couldn't send the link. Try again.",
    rateLimited: "Too many attempts. Please wait 15 minutes and try again.",
    checkTitle: "Check your email",
    checkBody: "We sent a login link. Open it on this phone. It works for 24 hours.",
    devHint: "Dev mode: the link is printed in the server console.",
  },
  onboarding: {
    title: "Welcome! Quick setup",
    name: "Your name",
    rollNo: "Roll number",
    batch: "Batch",
    target: "Target company",
    consentTitle: "Your data & consent (DPDP Act, 2023)",
    consentBody:
      "Your college has registered you on LearnCrew. We store your name, email, roll number and practice answers to show your progress and to share placement-readiness reports with your college's TPO. We do not sell your data or show ads. You can ask for deletion any time from the Privacy page.",
    consentCheck: "I agree to the above and to the Privacy Policy",
    submit: "Start practising",
    mustConsent: "Please tick consent to continue.",
  },
  offline: { banner: "You're offline. Keep answering — we'll sync when you're back online." },
  forbidden: { title: "Not allowed", body: "Your account can't open this page.", home: "Go to my home" },
} as const;

export type Copy = typeof en;
export const t = en;
