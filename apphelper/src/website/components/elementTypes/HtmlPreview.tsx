import React from "react";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Props {
  value: string;
  textAlign?: string;
  element: ElementInterface;
  showFloatingEditor?: boolean;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

export const HtmlPreview: React.FC<Props> = (props) => {
  return (
    <div
      style={{
        textAlign: props.textAlign as any,
        position: "relative"
      }}
      dangerouslySetInnerHTML={{ __html: props.value || "" }}
      data-element-id={props.element?.id}
    />
  );
};
