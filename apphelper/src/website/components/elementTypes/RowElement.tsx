import React from "react";
import { ElementInterface, SectionInterface } from "../../helpers";
import { DroppableArea } from "../admin/DroppableArea";
import { Element } from "../Element";
import { ApiHelper } from "../../..";
import type { ChurchInterface } from "@churchapps/helpers";


interface Props { element: ElementInterface, churchSettings: any, textColor: string, onEdit?: (section: SectionInterface | null, element: ElementInterface) => void, onMove?: () => void, church?: ChurchInterface }

export function RowElement(props: Props) {

  const handleDrop = (data: any, sort: number, column: ElementInterface) => {
    if (data.data) {
      const element: ElementInterface = data.data;
      element.sort = sort;
      element.parentId = column.id;
      ApiHelper.post("/elements", [element], "ContentApi").then(() => { if (props.onMove) props.onMove(); });
    } else {
      const element: ElementInterface = { sectionId: props.element.sectionId, elementType: data.elementType, sort, parentId: column.id, blockId: props.element.blockId };
      if (props.onEdit) props.onEdit(null, element);
    }
  };

  const getAddElement = (column: ElementInterface, s: number) => {
    const sort = s;
    return (<DroppableArea key={"add" + column.id} accept={["element", "elementBlock"]} text="Drop here to add to row" onDrop={(data) => handleDrop(data, sort, column)} dndDeps={column} />);
  };

  const getElements = (column: ElementInterface, elements: ElementInterface[]) => {
    const result: React.ReactElement[] = [];
    if (props.onEdit) result.push(getAddElement(column, 1));
    elements?.forEach(c => {
      result.push(<Element key={c.id} element={c} onEdit={props.onEdit} churchSettings={props.churchSettings} textColor={props.textColor} parentId={column.id} onMove={props.onMove} church={props?.church} />);
    });
    return result;
  };

  const getClassName = () => {
    if (props.onEdit) return "columnWrapper";
    else return "";
  };

  const getColumns = () => {
    const emptyStyle: React.CSSProperties = { minHeight: 100, border: "1px solid #999" };
    const result: React.ReactElement[] = [];
    props.element.elements?.forEach((c:ElementInterface, _idx:number) => {
      const hasElements = c.elements && c.elements.length > 0;
      // Calculate width based on column size (out of 12)
      const colSize = c.answers?.size || 6;
      const widthPercent = (colSize / 12) * 100;

      const colStyle: React.CSSProperties = {
        width: `calc(${widthPercent}% - 12px)`,
        marginRight: "12px",
        ...(props.onEdit && !hasElements ? emptyStyle : {}),
        ...(props.onEdit ? { overflow: "visible" } : {})
      };

      result.push(
        <div key={c.id} className={getClassName()} style={colStyle}>
          <div style={{ minHeight: "inherit" }}>
            {c.elements && getElements(c, c.elements)}
          </div>
        </div>
      );
    });
    return result;
  };

  const result = (
    <div id={"el-" + props.element.id}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {getColumns()}
      </div>
    </div>
  );

  return result;
}
