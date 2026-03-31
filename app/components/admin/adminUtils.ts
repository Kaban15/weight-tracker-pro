"use client";

/** Pick the most recent date between lastSignIn and lastActivityAt */
export function getEffectiveActivity(
  lastSignIn: string | null,
  lastActivityAt: string | null
): string | null {
  if (!lastSignIn && !lastActivityAt) return null;
  if (!lastSignIn) return lastActivityAt;
  if (!lastActivityAt) return lastSignIn;
  // Compare: lastSignIn is ISO datetime, lastActivityAt is YYYY-MM-DD
  const signInDate = lastSignIn.split("T")[0];
  return signInDate > lastActivityAt ? lastSignIn : lastActivityAt;
}

/** Format a date as Polish relative time string */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Nigdy";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Dzisiaj";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 14) return "Tydzień temu";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tyg. temu`;
  if (diffDays < 60) return "Miesiąc temu";
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mies. temu`;
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"} temu`;
}

/** Return Tailwind dot color class based on recency */
export function getActivityDotClass(dateStr: string | null): string {
  if (!dateStr) return "bg-slate-600";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "bg-emerald-500";
  if (diffDays < 7) return "bg-amber-500";
  return "bg-slate-500";
}
