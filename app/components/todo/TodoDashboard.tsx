"use client";

import { useMemo } from "react";
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG, Priority, TaskStatus, Category } from "./types";

interface TodoDashboardProps {
  tasks: Task[];
}

interface PieSegment {
  label: string;
  count: number;
  color: string;
  percentage: number;
  startAngle: number;
  angle: number;
}

function colorClassToHex(colorClass: string): string {
  const c = colorClass.replace("bg-", "");
  if (c.includes("red")) return "#ef4444";
  if (c.includes("yellow")) return "#eab308";
  if (c.includes("blue")) return "#3b82f6";
  if (c.includes("emerald")) return "#10b981";
  if (c.includes("amber")) return "#f59e0b";
  if (c.includes("violet")) return "#8b5cf6";
  if (c.includes("pink")) return "#ec4899";
  if (c.includes("cyan")) return "#06b6d4";
  if (c.includes("purple")) return "#a855f7";
  if (c.includes("orange")) return "#f97316";
  if (c.includes("green")) return "#22c55e";
  return "#64748b";
}

function PieChart({
  data,
  title,
}: {
  data: { label: string; count: number; color: string }[];
  title: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="text-center text-[var(--muted)] py-8">Brak danych</div>
    );
  }

  let currentAngle = 0;
  const segments: PieSegment[] = data
    .filter((item) => item.count > 0)
    .map((item) => {
      const angle = (item.count / total) * 360;
      const segment: PieSegment = {
        ...item,
        percentage: (item.count / total) * 100,
        startAngle: currentAngle,
        angle,
      };
      currentAngle += angle;
      return segment;
    });

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">{title}</h4>
      <div className="relative w-32 h-32 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {segments.map((segment, index) => {
            const startRad = segment.startAngle * (Math.PI / 180);
            const endRad = (segment.startAngle + segment.angle) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);
            const largeArc = segment.angle > 180 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colorClassToHex(segment.color)}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[var(--foreground)]">{total}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${segment.color}`} />
            <span className="text-[var(--muted)]">
              {segment.label}: {segment.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodoDashboard({ tasks }: TodoDashboardProps) {
  const { priorityDistribution, statusDistribution, categoryDistribution } = useMemo(() => {
    const priorityDist = (Object.keys(PRIORITY_CONFIG) as Priority[]).map((key) => ({
      key,
      label: PRIORITY_CONFIG[key].label,
      count: tasks.filter((t) => t.priority === key && !t.completed && t.status !== "cancelled").length,
      color: PRIORITY_CONFIG[key].bgColor,
    }));

    const statusDist = (Object.keys(STATUS_CONFIG) as TaskStatus[]).map((key) => ({
      key,
      label: STATUS_CONFIG[key].label,
      count: tasks.filter((t) => t.status === key).length,
      color:
        key === "done"
          ? "bg-[var(--accent)]"
          : key === "in_progress"
          ? "bg-amber-500"
          : key === "cancelled"
          ? "bg-red-500"
          : "bg-[var(--muted)]",
    }));

    const categoryDist = (Object.keys(CATEGORY_CONFIG) as Category[]).map((key) => ({
      key,
      label: `${CATEGORY_CONFIG[key].emoji} ${CATEGORY_CONFIG[key].label}`,
      count: tasks.filter((t) => t.category === key).length,
      color: CATEGORY_CONFIG[key].color.replace("text-", "bg-"),
    }));

    return {
      priorityDistribution: priorityDist,
      statusDistribution: statusDist,
      categoryDistribution: categoryDist,
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--card-border)]">
        <PieChart data={priorityDistribution} title="Wg Priorytetu" />
      </div>
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--card-border)]">
        <PieChart data={statusDistribution} title="Wg Statusu" />
      </div>
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--card-border)]">
        <PieChart data={categoryDistribution} title="Wg Kategorii" />
      </div>
    </div>
  );
}
