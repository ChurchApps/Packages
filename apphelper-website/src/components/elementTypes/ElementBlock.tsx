import React from "react";
import { ElementInterface } from "../../helpers";
import { Element } from "../Element";

interface Props {
  element: ElementInterface;
  churchSettings: any;
  textColor: string;
}

export const ElementBlock: React.FC<Props> = (props) => {

  const getChildren = (elements: ElementInterface[]) => {
    const result: React.ReactElement[] = [];
    elements?.forEach(c => {
      result.push(<Element key={c.id} element={c} churchSettings={props.churchSettings} textColor={props.textColor} />);
    });
    return result;
  };

  const result = <>
    {props.element.elements && getChildren(props.element.elements)}
  </>;
  return result;
};
