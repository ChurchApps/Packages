"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import type { ChurchInterface } from "@churchapps/helpers";
import { ElementInterface, SectionInterface } from "../helpers";
import { DroppableArea } from "./admin/DroppableArea";
import { TextOnly } from "./elementTypes/TextOnly";
import { TextWithPhoto } from "./elementTypes/TextWithPhoto";
import { IframeElement } from "./elementTypes/IframeElement";
import { ButtonLink } from "./elementTypes/ButtonLink";
import { VideoElement } from "./elementTypes/VideoElement";
import { ImageElement } from "./elementTypes/ImageElement";
import { WhiteSpaceElement } from "./elementTypes/WhiteSpaceElement";
import { ApiHelper } from "../..";
import { BoxElement } from "./elementTypes/BoxElement";
import { DraggableWrapper } from "./admin/DraggableWrapper";
import { FaqElement } from "./elementTypes/FaqElement";
import { CardElement } from "./elementTypes/CardElement";
import { CarouselElement } from "./elementTypes/CarouselElement";
import { ElementBlock } from "./elementTypes/ElementBlock";
import { LogoElement } from "./elementTypes/LogoElement";
import { MapElement } from "./elementTypes/MapElement";
import { RawHTMLElement } from "./elementTypes/RawHTMLElement";
import { RowElement } from "./elementTypes/RowElement";
import { SermonElement } from "./elementTypes/SermonElement";
import { StreamElement } from "./elementTypes/StreamElement";
import { DonateLinkElement } from "./elementTypes/DonateLinkElement";
import { FormElement } from "./elementTypes/FormElement";
import { GroupListElement } from "./elementTypes/GroupListElement";
import { TableElement } from "./elementTypes/TableElement";
import { CalendarElement } from "./elementTypes/CalendarElement";
import { NonAuthDonationWrapper } from "./donate/NonAuthDonationWrapper";

interface Props {
  element: ElementInterface;
  church?: ChurchInterface;
  churchSettings: any;
  textColor: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
  onMove?: () => void;
  parentId?: string;
}

export const Element: React.FC<Props> = props => {
  const handleDrop = (data: any, sort: number) => {
    if (data.data) { // Existing element dropped
      const draggedElement: ElementInterface = data.data;
      draggedElement.sort = sort;
      draggedElement.sectionId = props.element.sectionId;
      draggedElement.parentId = props.element.parentId;
      ApiHelper.post("/elements", [draggedElement], "ContentApi").then(() => { if (props.onMove) props.onMove(); });
    } else { // New element dropped
      const newElement: ElementInterface = { sectionId: props.element.sectionId, elementType: data.elementType, sort, blockId: props.element.blockId, parentId: props.parentId };
      if (data.blockId) newElement.answersJSON = JSON.stringify({ targetBlockId: data.blockId });
      else if (data.elementType === "row") newElement.answersJSON = JSON.stringify({ columns: "6,6" });
      if (props.onEdit) props.onEdit(null, newElement);
    }
  };

  const getAddElement = (s: number) => {
    const sort = s;
    return (<DroppableArea accept={["element", "elementBlock"]} onDrop={(data) => handleDrop(data, sort)} dndDeps={props.element} />);
  };

  const getAnimationClasses = () => {
    if (props.element.animations?.onShow) return "animated " + props.element.animations.onShow + " " + props.element.animations.onShowSpeed;
  };

  const getElementStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = { position: "relative" };
    const SPACING_VALUES: Record<string, number> = { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32, "xxl": 48 };
    const getSpacingValue = (token: string) => {
      const px = SPACING_VALUES[token] || 0;
      return `var(--spacing-${token}, ${px}px)`;
    };
    if (props.element.stylesJSON) {
      try {
        const parsed = JSON.parse(props.element.stylesJSON);
        if (parsed.margin) {
          if (parsed.margin.top && parsed.margin.top !== "0") styles.marginTop = getSpacingValue(parsed.margin.top);
          if (parsed.margin.right && parsed.margin.right !== "0") styles.marginRight = getSpacingValue(parsed.margin.right);
          if (parsed.margin.bottom && parsed.margin.bottom !== "0") styles.marginBottom = getSpacingValue(parsed.margin.bottom);
          if (parsed.margin.left && parsed.margin.left !== "0") styles.marginLeft = getSpacingValue(parsed.margin.left);
        }
        if (parsed.padding) {
          if (parsed.padding.top && parsed.padding.top !== "0") styles.paddingTop = getSpacingValue(parsed.padding.top);
          if (parsed.padding.right && parsed.padding.right !== "0") styles.paddingRight = getSpacingValue(parsed.padding.right);
          if (parsed.padding.bottom && parsed.padding.bottom !== "0") styles.paddingBottom = getSpacingValue(parsed.padding.bottom);
          if (parsed.padding.left && parsed.padding.left !== "0") styles.paddingLeft = getSpacingValue(parsed.padding.left);
        }
      } catch (e) {
        console.error("Failed to parse stylesJSON:", e);
      }
    }
    return styles;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!props.onEdit) return;
    const target = e.target as HTMLElement;
    const closestWrapper = target.closest(".elementWrapper");
    // Only open edit if the closest wrapper belongs to THIS element (matches the element type)
    if (closestWrapper && props.element.elementType && !closestWrapper.classList.contains(props.element.elementType)) return;
    props.onEdit(null, props.element);
  };

  let result = <></>;

  switch (props.element.elementType) {
    case "text": result = <TextOnly key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "textWithPhoto": result = <TextWithPhoto key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "box": result = <BoxElement key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} churchSettings={props.churchSettings} textColor={props.textColor} onMove={props.onMove} />; break;
    case "iframe": result = <IframeElement key={props.element.id} element={props.element as ElementInterface} />; break;
    case "buttonLink": result = <ButtonLink key={props.element.id} element={props.element as ElementInterface}></ButtonLink>; break;
    case "video": result = <VideoElement key={props.element.id} element={props.element as ElementInterface} />; break;
    case "image": result = <ImageElement key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "whiteSpace": result = <WhiteSpaceElement key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "faq": result = <FaqElement key={props.element.id} element={props.element as ElementInterface} textColor={props.textColor} />; break;
    case "card": result = <CardElement key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "carousel": result = <CarouselElement key={props.element.id} element={props.element as ElementInterface} churchSettings={props.churchSettings} textColor={props.textColor} onEdit={props.onEdit} onMove={props.onMove} />; break;
    case "block": result = <ElementBlock key={props.element.id} element={props.element as ElementInterface} churchSettings={props.churchSettings} textColor={props.textColor} />; break;
    case "row": result = <RowElement key={props.element.id} element={props.element as ElementInterface} churchSettings={props.churchSettings} textColor={props.textColor} onEdit={props.onEdit} onMove={props.onMove} church={props.church} />; break;
    case "logo": result = <LogoElement key={props.element.id} element={props.element as ElementInterface} churchSettings={props.churchSettings} textColor={props.textColor} />; break;
    case "map": result = <MapElement key={props.element.id} element={props.element as ElementInterface} />; break;
    case "rawHTML": result = <RawHTMLElement key={props.element.id} element={props.element as ElementInterface} onEdit={props.onEdit} />; break;
    case "sermons": result = <SermonElement key={props.element.id} churchId={props.church?.id || ""} appearance={props.churchSettings} />; break;
    case "stream":
      if (props.church) result = <StreamElement key={props.element.id} element={props.element as ElementInterface} churchSettings={props.churchSettings} church={props.church} editMode={!!props.onEdit} />;
      break;
    case "donation": {
      const donationSettings: any = props.element.answers || (props.element.answersJSON ? (() => { try { return JSON.parse(props.element.answersJSON) || {}; } catch { return {}; } })() : {});
      result = props.onEdit
        ? <Box sx={{ p: 3, border: "1px dashed", borderColor: "grey.400", textAlign: "center", color: "text.secondary" }}>
          <Typography variant="subtitle1">Donation form</Typography>
          <Typography variant="caption">Preview available on the published page</Typography>
        </Box>
        : <NonAuthDonationWrapper key={props.element.id} churchId={props.church?.id ?? props.element.churchId} mainContainerCssProps={{ sx: { boxShadow: "none", padding: 3 } }} showHeader={false} allowSingleGift={donationSettings.allowSingleGift} allowRecurring={donationSettings.allowRecurring} showFundSelector={donationSettings.showFundSelector} allowedFundIds={donationSettings.allowedFundIds} defaultFundId={donationSettings.defaultFundId} />;
      break;
    }
    case "donateLink": result = <DonateLinkElement key={props.element.id} element={props.element as ElementInterface} />; break;
    case "form":
      if (props.church) result = <FormElement key={props.element.id} element={props.element as ElementInterface} church={props.church} />;
      break;
    case "groupList": result = <GroupListElement key={props.element.id} churchId={props.church?.id || ""} element={props.element as ElementInterface} />; break;
    case "table": result = <TableElement key={props.element.id} element={props.element as ElementInterface} />; break;
    case "calendar": result = <CalendarElement key={props.element.id} element={props.element as ElementInterface} churchId={props.church?.id || props.element.churchId || ""} />; break;
    default: break;
  }

  /*<DraggableIcon dndType="element" elementType={props.element.elementType} data={props.element} />*/
  if (props.onEdit) {
    const showDroppableAfter = props.element.elementType !== "row" && props.element.elementType !== "carousel";
    result = <>
      <DraggableWrapper
        dndType="element"
        elementType={props.element.elementType || ""}
        data={props.element}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={"elementWrapper " + props.element.elementType}
          style={{
            transition: "box-shadow 0.2s ease",
            borderRadius: "4px"
          }}
        >
          {result}
        </div>
      </DraggableWrapper>
      {showDroppableAfter && getAddElement((props.element.sort || 0) + 0.1)}
    </>;

    /*
    result = <><div className={"elementWrapper " + props.element.elementType }>
      <div className="elementActions">
        <table style={{ float: "right" }}>
          <tbody>
            <tr>
              <td><DraggableIcon dndType="element" elementType={props.element.elementType} data={props.element} /></td>
              <td>
                <div className="elementEditButton">
                  <SmallButton icon="edit" onClick={() => props.onEdit(null, props.element)} toolTip={props.element.elementType} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {result}
    </div>
    {props.onEdit && getAddElement(props.element.sort + 0.1)}
    </>
    */
  }
  return <div style={getElementStyles()} className={getAnimationClasses()}>{result}</div>;
};
