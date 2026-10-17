"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import { ApiHelper } from "../../..";
import { EventHelper, type EventInterface } from "@churchapps/helpers";
import { EventCalendar } from "./EventCalendar";
import { useEffect, useState } from "react";

interface Props {
  churchId: string;
  groupId: string;
  canEdit: boolean;
  firstDayOfWeek?: number;
  eventUrl?: (event: EventInterface) => string;
  /** Only show events carrying this tag; empty shows all. */
  tag?: string;
}

export function GroupCalendar(props: Props) {
  const [events, setEvents] = useState<EventInterface[]>([]);

  const filterTag = (data: EventInterface[]) => setEvents((data || []).filter((e) => EventHelper.hasTag(e, props.tag)));

  const loadData = () => {
    // Groups are private by default, so always use authenticated endpoint when canEdit is true
    // For public viewing (canEdit=false), use the anonymous public endpoint
    if (props.canEdit) {
      ApiHelper.get("/events/group/" + props.groupId, "ContentApi").then(filterTag);
    } else {
      ApiHelper.getAnonymous("/events/public/group/" + props.churchId + "/" + props.groupId, "ContentApi").then(filterTag);
    }
  };

  useEffect(loadData, [props.groupId, props.tag]);

  return (
    <EventCalendar events={events} editGroupId={props.canEdit ? props.groupId : ""} churchId={props.churchId} firstDayOfWeek={props.firstDayOfWeek} onRequestRefresh={loadData} eventUrl={props.eventUrl} />
  );
}
