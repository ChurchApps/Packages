import { ElementInterface } from "../../helpers";
import { GroupCalendar } from "../eventCalendar/GroupCalendar";
import { CuratedCalendar } from "../admin/calendar/CuratedCalendar";

interface Props {
  element: ElementInterface;
  churchId: string;
  /** Enable calendar editing (admin mode only). */
  canEdit?: boolean;
}

export const CalendarElement = ({ element, churchId, canEdit = false }: Props) => {
  const calendarType = element.answers?.calendarType;
  const calendarId = element.answers?.calendarId;

  const renderCalendar = () => {
    if (!calendarId) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>No calendar selected. Please configure this element.</p>
        </div>
      );
    }

    if (calendarType === "group") {
      return <GroupCalendar churchId={churchId} groupId={calendarId} canEdit={canEdit} />;
    } else if (calendarType === "curated") {
      return <CuratedCalendar churchId={churchId} curatedCalendarId={calendarId} mode={canEdit ? "edit" : "view"} />;
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
