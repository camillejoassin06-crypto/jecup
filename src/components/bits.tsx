import type { MasteryState, Subject } from "@/types";
import { DISCIPLINES } from "@/data/academic";
import { MASTERY_COLOR, MASTERY_LABEL, effectiveScore, masteryLevel } from "@/engine/memoryAgent";
import { cn } from "@/lib/utils";

export function SubjectDot({ subject, className }: { subject?: Subject; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ background: subject?.color ?? "#adb5bd" }} />;
}

export function SubjectTag({ subject }: { subject?: Subject }) {
  if (!subject) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <SubjectDot subject={subject} />
      {subject.name}
    </span>
  );
}

export function SubjectEmoji({ subject }: { subject?: Subject }) {
  return <span aria-hidden>{subject ? DISCIPLINES[subject.discipline].emoji : "📘"}</span>;
}

export function MasteryBadge({ state, className }: { state?: MasteryState; className?: string }) {
  const score = effectiveScore(state);
  const level = masteryLevel(score, state?.attempts ?? 0);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", MASTERY_COLOR[level], className)}>
      {MASTERY_LABEL[level]}
      {state?.attempts ? <span className="opacity-70">· {score}</span> : null}
    </span>
  );
}

/** Anneau de progression (0–100). */
export function Ring({ value, size = 56, stroke = 6, color = "hsl(var(--primary))", label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute text-xs font-bold">{label ?? `${value}%`}</span>
    </div>
  );
}
