// vercel.ts — config oficial Vercel (substitui vercel.json)

const config = {
  buildCommand: "next build",
  framework: "nextjs",
  crons: [
    { path: "/api/cron/reminders", schedule: "0 7 * * *" },   // 7h todo dia: bom dia + treino
    { path: "/api/cron/streaks", schedule: "0 23 * * *" },     // 23h todo dia: alerta streak em risco
    { path: "/api/cron/overdue", schedule: "0 9 * * *" },      // 9h todo dia: cobrar inadimplentes
    { path: "/api/cron/reset-weekly", schedule: "0 0 * * 1" }, // segunda 00h: reset ranking
  ],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default config;