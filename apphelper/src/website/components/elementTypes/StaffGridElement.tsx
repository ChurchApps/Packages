"use client";

import { useEffect, useState } from "react";
import { ApiHelper } from "../../..";
import { ElementInterface, SectionInterface } from "../../helpers";

interface StaffMember { id: string; name?: { display?: string }; photo?: string; role?: string; }

interface Props {
  element: ElementInterface;
  churchId: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

export const StaffGridElement = ({ element, churchId, onEdit }: Props) => {
  const answers: any = element.answers || {};
  const groupId = (answers.groupId as string) || "";
  const columns = Math.min(4, Math.max(2, parseInt(answers.columns, 10) || 3));
  const showRoles = answers.showRoles !== false && answers.showRoles !== "false";

  const [members, setMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (!groupId || !churchId) return;
    ApiHelper.getAnonymous("/groupmembers/public/" + churchId + "/" + groupId, "MembershipApi")
      .then((d: StaffMember[]) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => setMembers([]));
  }, [churchId, groupId]);

  if (members.length === 0) {
    if (onEdit) return <div className="staff-empty">Staff Grid: select a group with a public roster</div>;
    return null;
  }

  return (
    <div id={"el-" + element.id} className="staffGrid" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 24 }}>
      {members.map((m) => (
        <div className="staff-card" key={m.id}>
          {m.photo
            ? <img className="staff-photo" src={m.photo} alt={m.name?.display || ""} loading="lazy" />
            : <div className="staff-photo staff-photo--placeholder" aria-hidden="true" />}
          <div className="staff-name">{m.name?.display || ""}</div>
          {showRoles && m.role && <span className="staff-role">{m.role}</span>}
        </div>
      ))}
    </div>
  );
};
