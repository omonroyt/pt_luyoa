/**
 * ES: Íconos de línea de la interfaz (24 × 24, trazo de 2 px). Son decorativos: el texto o
 *     el aria-label del control que los contiene da el significado.
 * EN: Interface line icons (24 × 24, 2 px stroke). They are decorative: the text or the
 *     aria-label of the control that holds them carries the meaning.
 */
const PATHS = {
  sliders: [
    "M4 21v-7",
    "M4 10V3",
    "M12 21v-9",
    "M12 8V3",
    "M20 21v-5",
    "M20 12V3",
    "M2 14h4",
    "M10 8h4",
    "M18 16h4",
  ],
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  sun: [
    "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z",
    "M12 2v2",
    "M12 20v2",
    "m4.93 4.93 1.41 1.41",
    "m17.66 17.66 1.41 1.41",
    "M2 12h2",
    "M20 12h2",
    "m6.34 17.66-1.41 1.41",
    "m19.07 4.93-1.41 1.41",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"],
  send: ["m5 12 7-7 7 7", "M12 19V5"],
  stop: ["M7 7h10v10H7z"],
  check: ["M20 6 9 17l-5-5"],
  alert: [
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  sparkles: [
    "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
    "M19 3v4",
    "M17 5h4",
    "M5 17v4",
    "M3 19h4",
  ],
  trendingUp: ["M22 7 13.5 15.5 8.5 10.5 2 17", "M16 7h6v6"],
  calendar: [
    "M8 2v4",
    "M16 2v4",
    "M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  ],
  store: ["M3 10l2-6h14l2 6z", "M4 10v10h16V10", "M9 20v-6h6v6"],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  trophy: [
    "M8 21h8",
    "M12 17v4",
    "M7 4h10v5a5 5 0 0 1-10 0z",
    "M17 5h3v2a3 3 0 0 1-3 3",
    "M7 5H4v2a3 3 0 0 0 3 3",
  ],
  megaphone: [
    "M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z",
    "M16 8a5 5 0 0 1 0 8",
    "M19 5a9 9 0 0 1 0 14",
  ],
  pie: ["M21 12A9 9 0 1 1 12 3v9z", "M15 3.5A9 9 0 0 1 20.5 9H15z"],
  database: [
    "M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3z",
    "M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5",
    "M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3",
  ],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-4"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  chevronDown: ["m6 9 6 6 6-6"],
  arrowRight: ["M5 12h14", "m12 5 7 7-7 7"],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  table: ["M3 3h18v18H3z", "M3 9h18", "M3 15h18", "M9 3v18"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
