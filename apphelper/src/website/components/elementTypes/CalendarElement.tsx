import { ElementInterface } from "../../helpers";
import { GroupCalendar } from "../eventCalendar/GroupCalendar";
import { CuratedCalendar } from "../admin/calendar/CuratedCalendar";

interface Props {
  element: ElementInterface;
  churchId: string;
  /**
   * Optional: Set to true to enable calendar editing capabilities.
   * When used in authenticated contexts (e.g., admin panels), pass canEdit based on user permissions.
   * When used in public websites, this should be false (default behavior).
   */
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
