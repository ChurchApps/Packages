import type { EventInterface } from "@churchapps/helpers";
import { ElementInterface } from "../../helpers";
import { GroupCalendar } from "../eventCalendar/GroupCalendar";
import { CuratedCalendar } from "../admin/calendar/CuratedCalendar";

interface Props {
  element: ElementInterface;
  churchId: string;
  /** Enable calendar editing (admin mode only). */
  canEdit?: boolean;
  /** Church's first day of week (0=Sunday ... 6=Saturday). */
  firstDayOfWeek?: number;
  /** When set, clicking an event navigates here instead of opening the detail dialog. */
  eventUrl?: (event: EventInterface) => string;
}

export const CalendarElement = ({ element, churchId, canEdit = false, firstDayOfWeek = 0, eventUrl }: Props) => {
  const calendarType = element.answers?.calendarType;
  const calendarId = element.answers?.calendarId;
  const tag = element.answers?.tag;

  const renderCalendar = () => {
    if (!calendarId) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>No calendar selected. Please configure this element.</p>
        </div>
      );
    }

    if (calendarType === "group") {
      return <GroupCalendar churchId={churchId} groupId={calendarId} canEdit={canEdit} firstDayOfWeek={firstDayOfWeek} eventUrl={eventUrl} tag={tag} />;
    } else if (calendarType === "curated") {
      return <CuratedCalendar churchId={churchId} curatedCalendarId={calendarId} mode={canEdit ? "edit" : "view"} firstDayOfWeek={firstDayOfWeek} eventUrl={eventUrl} tag={tag} />;
    }

    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Unknown calendar type: {calendarType}</p>
      </div>
    );
  };

  return (
    <div id={"el-" + element.id} style={{ backgroundColor: "white", padding: 50, borderRadius: 15 }}>
      {renderCalendar()}
    </div>
  );
};
