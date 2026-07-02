"use client";

import React, { useEffect, useRef, useState } from "react";
import { ElementInterface, SectionInterface } from "../../helpers";

interface StatItem { value: number; prefix?: string; suffix?: string; label: string; }

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const StatBlock = ({ item, animate }: { item: StatItem; animate: boolean }) => {
  const target = Number(item.value) || 0;
  const [display, setDisplay] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) { setDisplay(target); return; }
    const duration = 1500;
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animate, target]);

  return (
    <div className="stat-item">
      <div className="stat-value">{item.prefix || ""}{display.toLocaleString()}{item.suffix || ""}</div>
      <div className="stat-label">{item.label}</div>
    </div>
  );
};

export const StatsElement = ({ element, onEdit }: Props) => {
  const items: StatItem[] = Array.isArray(element.answers?.items) ? element.answers.items : [];
  const columns = Math.min(4, Math.max(2, parseInt(element.answers?.columns, 10) || 3));
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setAnimate(false); return; }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") { setAnimate(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setAnimate(true); observer.disconnect(); }
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) {
    if (onEdit) return <div className="stats-empty">Stats: add items to get started</div>;
    return null;
  }

  return (
    <div id={"el-" + element.id} className="stats" ref={ref} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 16 }}>
      {items.map((item, i) => <StatBlock key={i} item={item} animate={animate} />)}
    </div>
  );
};
