/** 24×24 stroke icons used by the app shell. One source, no extra network requests. */
export const NAV_ICON_PATHS = {
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  projects: ["M3 7h18v13H3z", "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M3 12.5h18"],
  details: ["M9 6h12", "M9 12h12", "M9 18h12", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  progress: ["M3 21h18", "M6 18v-6", "M11 18V6", "M16 18V9", "M20 18v-4"],
  financial: [
    "M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4",
    "M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3",
    "M21 12h-4a2 2 0 0 0 0 4h4z",
  ],
  taxes: ["M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z", "M9 8h6", "M9 12h6", "M9 16h3"],
  dcn: ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  clients: [
    "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16",
    "M15 9h4a1 1 0 0 1 1 1v11",
    "M2 21h20",
    "M8 8h3",
    "M8 12h3",
    "M8 16h3",
  ],
  partners: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  regions: ["M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  stages: ["M12 3 3 7.5l9 4.5 9-4.5z", "M3 12l9 4.5 9-4.5", "M3 16.5 12 21l9-4.5"],
  users: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
  rls: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "M9 12l2 2 4-4"],
  audit: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  profile: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
    "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M6.7 18.3a6 6 0 0 1 10.6 0",
  ],
  key: ["M20 8.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z", "M12.3 11.7 3 21", "M6 18l2.5 2.5", "M8.5 15.5 11 18"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  collapse: ["M11 17l-5-5 5-5", "M18 17l-5-5 5-5"],
  expand: ["M13 17l5-5-5-5", "M6 17l5-5-5-5"],
  chevron: ["M6 9l6 6 6-6"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
} as const satisfies Record<string, readonly string[]>;

export type NavIconName = keyof typeof NAV_ICON_PATHS;
