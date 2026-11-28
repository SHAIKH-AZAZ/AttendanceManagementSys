import { Flame } from 'lucide-react';
import { TOKENS } from '@/theme';

/** Consecutive attended lectures, newest first. Only ABSENT breaks a streak (late/excused/leave count as attended). */
export function lectureStreak(history: { status: string }[]) {
  const attended = (h: { status: string }) => h.status !== 'ABSENT';
  const idx = history.findIndex((h) => !attended(h));
  const current = idx === -1 ? history.length : idx;
  let best = 0;
  let run = 0;
  for (const h of history) best = Math.max(best, (run = attended(h) ? run + 1 : 0));
  return { current, best };
}

export function StreakBadge({ current, best }: { current: number; best: number }) {
  const hot = current >= 3;
  return (
    <div
      className="inline-flex items-center gap-3 rounded-xl border px-3 py-2"
      style={{
        borderColor: hot ? '#FCD9A8' : TOKENS.rule,
        background: hot ? 'linear-gradient(135deg,#FFF7ED,#FFEDD5)' : TOKENS.fill,
      }}
      aria-label={`${current} lecture attendance streak, best ${best}`}
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-full"
        style={{ background: hot ? '#F97316' : TOKENS.rule, color: hot ? '#fff' : TOKENS.steel }}
      >
        <Flame className={`h-5 w-5 ${hot ? 'motion-safe:animate-pulse' : ''}`} fill={hot ? 'currentColor' : 'none'} />
      </span>
      <div className="leading-tight">
        <p className="text-xl font-bold tracking-tight" style={{ color: hot ? '#9A3412' : TOKENS.ink }}>
          {current} <span className="text-xs font-semibold">{current === 1 ? 'lecture' : 'lectures'} in a row</span>
        </p>
        <p className="text-2xs text-slate-500">
          {current === 0 ? 'Attend your next lecture to start a streak' : current >= best ? 'Your best streak' : `Best: ${best}`}
        </p>
      </div>
    </div>
  );
}
