"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import { ApiHelper } from "@churchapps/apphelper";
import type { EventInterface } from "@churchapps/helpers";
import { EventCalendar } from "./EventCalendar";
import { useEffect, useState } from "react";

interface Props {
  churchId: string;
  groupId: string;
  canEdit: boolean;
}

export function GroupCalendar(props: Props) {
  const [events, setEvents] = useState<EventInterface[]>([]);

  const loadData = () => {
    // Groups are private by default, so always use authenticated endpoint when canEdit is true
    // For public viewing (canEdit=false), use the anonymous public endpoint
    if (props.canEdit) {
      ApiHelper.get("/events/group/" + props.groupId, "ContentApi").then((data: any) => { setEvents(data); });
    } else {
      ApiHelper.getAnonymous("/events/public/group/" + props.churchId + "/" + props.groupId, "ContentApi").then((data: any) => { setEvents(data); });
    }
  };

  useEffect(loadData, [props.groupId]);

  return (
    <EventCalendar events={events} editGroupId={props.canEdit ? props.groupId : ""} churchId={props.churchId} onRequestRefresh={loadData} />
  );
}
