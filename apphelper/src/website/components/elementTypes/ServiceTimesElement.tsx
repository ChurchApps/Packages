"use client";

import { useEffect, useState } from "react";
import { ApiHelper } from "../../..";
import { ElementInterface, SectionInterface } from "../../helpers";

interface ServiceTimeItem { id: string; name?: string; }
interface ServiceGroup { serviceId: string; serviceName?: string; campusName?: string; times?: ServiceTimeItem[]; }

interface Props {
  element: ElementInterface;
  churchId: string;
  churchName?: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const DAY_URLS: Record<string, string> = {
  sunday: "https://schema.org/Sunday",
  monday: "https://schema.org/Monday",
  tuesday: "https://schema.org/Tuesday",
  wednesday: "https://schema.org/Wednesday",
  thursday: "https://schema.org/Thursday",
  friday: "https://schema.org/Friday",
  saturday: "https://schema.org/Saturday"
};
const DAY_RE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
const TIME_RE = /\b(1[0-2]|[1-9]):([0-5][0-9])\s*(AM|PM)\b/i;

const to24h = (h: number, m: string, ap: string) => {
  let hour = h;
  const isPM = ap.toUpperCase() === "PM";
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return String(hour).padStart(2, "0") + ":" + m;
};

const buildJsonLd = (services: ServiceGroup[], churchName?: string) => {
  const events: any[] = [];
  services.forEach((s) => {
    (s.times || []).forEach((t) => {
      const text = ((s.serviceName || "") + " " + (t.name || "")).trim();
      const day = DAY_RE.exec(text);
      const time = TIME_RE.exec(text);
      if (!day || !time) return;
      events.push({
        "@type": "Event",
        name: s.serviceName || t.name || "Service",
        eventSchedule: {
          "@type": "Schedule",
          byDay: DAY_URLS[day[1].toLowerCase()],
          startTime: to24h(parseInt(time[1], 10), time[2], time[3]),
          repeatFrequency: "P1W"
        },
        ...(churchName ? { location: { "@type": "Place", name: churchName } } : {})
      });
    });
  });
  return events.length ? { "@context": "https://schema.org", "@graph": events } : null;
};

export const ServiceTimesElement = ({ element, churchId, churchName, onEdit }: Props) => {
  const answers: any = element.answers || {};
  const title = (answers.title as string) || "Service Times";
  const showCampus = answers.showCampus !== false && answers.showCampus !== "false";

  const [services, setServices] = useState<ServiceGroup[]>([]);

  useEffect(() => {
    if (!churchId) return;
    ApiHelper.getAnonymous("/servicetimes/public/" + churchId, "AttendanceApi")
      .then((d: ServiceGroup[]) => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]));
  }, [churchId]);

  if (services.length === 0) {
    if (onEdit) return <div className="service-times-empty">Service Times: no published services found</div>;
    return null;
  }

  const jsonLd = buildJsonLd(services, churchName);

  return (
    <div id={"el-" + element.id} className="serviceTimes">
      {title && <h3 className="service-times-title">{title}</h3>}
      {services.map((s) => (
        <div className="service-group" key={s.serviceId}>
          <div className="service-name">{s.serviceName}</div>
          {showCampus && s.campusName && <div className="service-campus">{s.campusName}</div>}
          <ul className="service-time-list">
            {(s.times || []).map((t) => <li className="service-time" key={t.id}>{t.name}</li>)}
          </ul>
        </div>
      ))}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
};
