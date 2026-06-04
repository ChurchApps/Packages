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

  const mobileBreakpoint = 768;

  const getColumns = () => {
    const emptyStyle: React.CSSProperties = { minHeight: 100, border: "1px solid #999" };
    const result: React.ReactElement[] = [];
    const cssRules: string[] = [];
    const elId = "el-" + props.element.id;

    props.element.elements?.forEach((c:ElementInterface, idx:number) => {
      const hasElements = c.elements && c.elements.length > 0;
      // mobileSize/mobileOrder are hydrated onto each column child by the API (ElementController.checkRow).
      const colSize = c.answers?.size || 6;
      const desktopPercent = (colSize / 12) * 100;
      const rawMobileSize = Number(c.answers?.mobileSize);
      const mobileSize = (rawMobileSize && !isNaN(rawMobileSize)) ? rawMobileSize : colSize;
      const mobilePercent = (mobileSize / 12) * 100;
      const rawOrder = Number(c.answers?.mobileOrder);
      const order = !isNaN(rawOrder) ? rawOrder : null;

      cssRules.push(`#${elId} .rowColumn-${idx}{width:calc(${desktopPercent}% - 12px);}`);
      const mobileDecls = [`width:calc(${mobilePercent}% - 12px)`];
      if (order !== null) mobileDecls.push(`order:${order}`);
      cssRules.push(`@media (max-width:${mobileBreakpoint - 0.02}px){#${elId} .rowColumn-${idx}{${mobileDecls.join(";")};}}`);

      const colStyle: React.CSSProperties = {
        marginRight: "12px",
        ...(props.onEdit && !hasElements ? emptyStyle : {}),
        ...(props.onEdit ? { overflow: "visible" } : {})
      };

      const className = `${getClassName()} rowColumn rowColumn-${idx}`.trim();
      result.push(
        <div key={c.id} className={className} style={colStyle}>
          <div style={{ minHeight: "inherit" }}>
            {c.elements && getElements(c, c.elements)}
          </div>
        </div>
      );
    });
    return { columns: result, css: cssRules.join("\n") };
  };

  const { columns, css } = getColumns();
  const result = (
    <div id={"el-" + props.element.id}>
      {css && <style>{css}</style>}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {columns}
      </div>
    </div>
  );

  return result;
}
