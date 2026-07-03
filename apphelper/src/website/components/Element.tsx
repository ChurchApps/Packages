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
import { GroupsElement } from "./elementTypes/GroupsElement";
import { TableElement } from "./elementTypes/TableElement";
import { CalendarElement } from "./elementTypes/CalendarElement";
import { IconFeatureElement } from "./elementTypes/IconFeatureElement";
import { GalleryElement } from "./elementTypes/GalleryElement";
import { TestimonialElement } from "./elementTypes/TestimonialElement";
import { SocialIconsElement } from "./elementTypes/SocialIconsElement";
import { CountdownElement } from "./elementTypes/CountdownElement";
import { StatsElement } from "./elementTypes/StatsElement";
import { CampaignProgressElement } from "./elementTypes/CampaignProgressElement";
import { StaffGridElement } from "./elementTypes/StaffGridElement";
import { ServiceTimesElement } from "./elementTypes/ServiceTimesElement";
import { NonAuthDonationWrapper } from "./donate/NonAuthDonationWrapper";
import { ElementRenderProps, getElementRenderer, registerDefaultElementRenderer } from "./ElementRegistry";

registerDefaultElementRenderer("text", (p) => <TextOnly key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("textWithPhoto", (p) => <TextWithPhoto key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("box", (p) => <BoxElement key={p.element.id} element={p.element} onEdit={p.onEdit} churchSettings={p.churchSettings} textColor={p.textColor} onMove={p.onMove} />);
registerDefaultElementRenderer("iframe", (p) => <IframeElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("buttonLink", (p) => <ButtonLink key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("video", (p) => <VideoElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("image", (p) => <ImageElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("whiteSpace", (p) => <WhiteSpaceElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("faq", (p) => <FaqElement key={p.element.id} element={p.element} textColor={p.textColor} />);
registerDefaultElementRenderer("card", (p) => <CardElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("carousel", (p) => <CarouselElement key={p.element.id} element={p.element} churchSettings={p.churchSettings} textColor={p.textColor} onEdit={p.onEdit} onMove={p.onMove} />);
registerDefaultElementRenderer("block", (p) => <ElementBlock key={p.element.id} element={p.element} churchSettings={p.churchSettings} textColor={p.textColor} />);
registerDefaultElementRenderer("row", (p) => <RowElement key={p.element.id} element={p.element} churchSettings={p.churchSettings} textColor={p.textColor} onEdit={p.onEdit} onMove={p.onMove} church={p.church} />);
registerDefaultElementRenderer("logo", (p) => <LogoElement key={p.element.id} element={p.element} churchSettings={p.churchSettings} textColor={p.textColor} />);
registerDefaultElementRenderer("map", (p) => <MapElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("rawHTML", (p) => <RawHTMLElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("sermons", (p) => <SermonElement key={p.element.id} churchId={p.church?.id || ""} appearance={p.churchSettings} element={p.element} />);
registerDefaultElementRenderer("stream", (p) => p.church ? <StreamElement key={p.element.id} element={p.element} churchSettings={p.churchSettings} church={p.church} editMode={!!p.onEdit} /> : null);
registerDefaultElementRenderer("donation", (p) => {
  const donationSettings: any = p.element.answers || (p.element.answersJSON ? (() => { try { return JSON.parse(p.element.answersJSON) || {}; } catch { return {}; } })() : {});
  if (p.onEdit) {
    return (<Box sx={{ p: 3, border: "1px dashed", borderColor: "grey.400", textAlign: "center", color: "text.secondary" }}>
      <Typography variant="subtitle1">Donation form</Typography>
      <Typography variant="caption">Preview available on the published page</Typography>
    </Box>);
  }
  return <NonAuthDonationWrapper key={p.element.id} churchId={p.church?.id ?? p.element.churchId} mainContainerCssProps={{ sx: { boxShadow: "none", padding: 3 } }} showHeader={false} allowSingleGift={donationSettings.allowSingleGift} allowRecurring={donationSettings.allowRecurring} showFundSelector={donationSettings.showFundSelector} allowedFundIds={donationSettings.allowedFundIds} defaultFundId={donationSettings.defaultFundId} />;
});
registerDefaultElementRenderer("donateLink", (p) => <DonateLinkElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("form", (p) => p.church ? <FormElement key={p.element.id} element={p.element} church={p.church} /> : null);
registerDefaultElementRenderer("groupList", (p) => <GroupListElement key={p.element.id} churchId={p.church?.id || ""} element={p.element} />);
registerDefaultElementRenderer("groups", (p) => <GroupsElement key={p.element.id} churchId={p.church?.id || p.element.churchId || ""} element={p.element} />);
registerDefaultElementRenderer("table", (p) => <TableElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("calendar", (p) => <CalendarElement key={p.element.id} element={p.element} churchId={p.church?.id || p.element.churchId || ""} />);
registerDefaultElementRenderer("iconFeature", (p) => <IconFeatureElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("gallery", (p) => <GalleryElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("testimonial", (p) => <TestimonialElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("socialIcons", (p) => <SocialIconsElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("countdown", (p) => <CountdownElement key={p.element.id} element={p.element} />);
registerDefaultElementRenderer("stats", (p) => <StatsElement key={p.element.id} element={p.element} onEdit={p.onEdit} />);
registerDefaultElementRenderer("campaignProgress", (p) => <CampaignProgressElement key={p.element.id} element={p.element} churchId={p.church?.id || p.element.churchId || ""} onEdit={p.onEdit} />);
registerDefaultElementRenderer("staffGrid", (p) => <StaffGridElement key={p.element.id} element={p.element} churchId={p.church?.id || p.element.churchId || ""} onEdit={p.onEdit} />);
registerDefaultElementRenderer("serviceTimes", (p) => <ServiceTimesElement key={p.element.id} element={p.element} churchId={p.church?.id || p.element.churchId || ""} churchName={p.church?.name} onEdit={p.onEdit} />);

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
    if (data.data) {
      const draggedElement: ElementInterface = data.data;
      draggedElement.sort = sort;
      draggedElement.sectionId = props.element.sectionId;
      draggedElement.parentId = props.element.parentId;
      ApiHelper.post("/elements", [draggedElement], "ContentApi").then(() => { if (props.onMove) props.onMove(); });
    } else {
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

  const getVisibilityClasses = () => {
    let result = "";
    if (props.element.styles?.desktop?.display === "none") result += " hiddenOnDesktop";
    if (props.element.styles?.mobile?.display === "none") result += " hiddenOnMobile";
    return result;
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

  const renderProps: ElementRenderProps = { element: props.element, church: props.church, churchSettings: props.churchSettings, textColor: props.textColor, onEdit: props.onEdit, onMove: props.onMove };
  const renderer = getElementRenderer(props.element.elementType || "");
  if (renderer) result = renderer(renderProps) ?? <></>;
  else if (props.onEdit) {
    result = (<Box sx={{ p: 2, border: "1px dashed", borderColor: "warning.main", color: "text.secondary", textAlign: "center" }}>
      <Typography variant="caption">Unknown element type: {props.element.elementType}</Typography>
    </Box>);
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
          className={"elementWrapper " + props.element.elementType + getVisibilityClasses()}
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
  // Editor mode keeps hide classes on the inner elementWrapper only, so the editor can dim instead of hide.
  const outerClasses = ((getAnimationClasses() || "") + (props.onEdit ? "" : getVisibilityClasses())).trim();
  return <div style={getElementStyles()} className={outerClasses || undefined}>{result}</div>;
};
