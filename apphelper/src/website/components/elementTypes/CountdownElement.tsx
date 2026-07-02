"use client";

import React, { useEffect, useState } from "react";
import { ElementInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
}

const isFalse = (v: unknown) => v === false || v === "false";

const getTarget = (answers: Record<string, unknown>): number | null => {
  if (answers.mode === "date") {
    const parsed = answers.targetDate ? Date.parse(answers.targetDate as string) : NaN;
    return isNaN(parsed) ? null : parsed;
  }
  const day = parseInt(String(answers.dayOfWeek ?? 0), 10) || 0;
  const [h, m] = String(answers.time || "10:00").split(":").map((n) => parseInt(n, 10) || 0);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diff = (day - now.getDay() + 7) % 7;
  target.setDate(target.getDate() + diff);
  // Roll to next week only after a ~1h grace period past the target time.
  if (target.getTime() < now.getTime() - 60 * 60 * 1000) target.setDate(target.getDate() + 7);
  return target.getTime();
};

const Tile = ({ value, label }: { value: number; label: string }) => (
  <div className="countdown-tile">
    <span className="countdown-value">{String(Math.max(0, value)).padStart(2, "0")}</span>
    <span className="countdown-label">{label}</span>
  </div>
);

export const CountdownElement = ({ element }: Props) => {
  const answers = element.answers || {};
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const title = answers.title;

  if (now === null) {
    // SSR/first paint placeholder keeps markup stable to avoid hydration mismatch.
    return <div id={"el-" + element.id} className="countdown"><div className="countdown-tiles" /></div>;
  }

  const target = getTarget(answers);
  const remaining = target === null ? 0 : target - now;

  if (target === null || remaining <= 0) {
    return (
      <div id={"el-" + element.id} className="countdown">
        {title && <div className="countdown-title">{title}</div>}
        <div className="countdown-complete">{answers.completedText || "Starting now!"}</div>
      </div>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const showDays = !isFalse(answers.showDays);
  const showHours = !isFalse(answers.showHours);

  return (
    <div id={"el-" + element.id} className="countdown">
      {title && <div className="countdown-title">{title}</div>}
      <div className="countdown-tiles">
        {showDays && <Tile value={days} label="Days" />}
        {showHours && <Tile value={hours} label="Hours" />}
        <Tile value={minutes} label="Minutes" />
        <Tile value={seconds} label="Seconds" />
      </div>
    </div>
  );
};
