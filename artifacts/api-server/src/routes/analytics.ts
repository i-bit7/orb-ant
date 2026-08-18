import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface Visit {
  timestamp: number;
  userAgent: string;
  referrer: string;
}

// In-memory store (resets on server restart — acceptable for a personal project)
const visits: Visit[] = [];
const MAX_STORED = 5000;

router.post("/analytics/visit", (req, res) => {
  const visit: Visit = {
    timestamp: Date.now(),
    userAgent: String(req.headers["user-agent"] ?? ""),
    referrer: String(req.headers["referer"] ?? ""),
  };
  visits.push(visit);
  if (visits.length > MAX_STORED) visits.shift();
  res.json({ ok: true });
});

router.get("/analytics", (_req, res) => {
  const now = Date.now();
  const dayMs = 86_400_000;

  // Visits per day for the last 7 days
  const visitsPerDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    visitsPerDay[key] = 0;
  }
  for (const v of visits) {
    const d = new Date(v.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (key in visitsPerDay) visitsPerDay[key]++;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  res.json({
    total: visits.length,
    today: visits.filter((v) => v.timestamp >= todayStart.getTime()).length,
    visitsPerDay: Object.entries(visitsPerDay).map(([date, count]) => ({
      date,
      count,
    })),
    recent: visits
      .slice(-20)
      .reverse()
      .map((v) => ({
        timestamp: v.timestamp,
        userAgent: v.userAgent.slice(0, 80),
        referrer: v.referrer.slice(0, 80),
      })),
  });
});

export default router;
