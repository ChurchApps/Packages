import React from "react";
import { ElementInterface, responsiveImgProps } from "../../helpers";
import { AppearanceHelper } from "../../..";

interface Props { element: ElementInterface; churchSettings: any; textColor: string; }

export const LogoElement: React.FC<Props> = (props) => {



  const logoUrl = (props.textColor === "light")
    ? AppearanceHelper.getLogoDark(props.churchSettings.appearance ?? props.churchSettings, "/images/logo.png")
    : AppearanceHelper.getLogoLight(props.churchSettings.appearance ?? props.churchSettings, "/images/logo.png");

  const photo = (
    <img
      {...responsiveImgProps(logoUrl)}
      alt={props.element.answers?.photoAlt || ""}
      className="img-fluid"
      id={"el-" + props.element.id}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
      loading="lazy"
      decoding="async"
    />
  );
  const photoContent = (props.element.answers?.url) ? <a href={props.element.answers?.url}>{photo}</a> : photo;

  return photoContent;
};
