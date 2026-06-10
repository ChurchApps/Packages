import React, { CSSProperties, useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

export const ImageElement = ({ element }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageAlign = element.answers?.imageAlign;
  const isNoResize = element.answers?.noResize === "true";
  const imageUrl = element.answers?.photo;
  const linkUrl = element.answers?.url;
  const enableLightbox = element.answers?.enableLightbox === "true" && !linkUrl;

  const closeLightbox = useCallback(() => { setLightboxOpen(false); }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxOpen, closeLightbox]);

  const wrapperStyle: CSSProperties = {};
  const imgTagStyles: CSSProperties = {};
  let linkTagStyles: CSSProperties = {};

  const imageClassName = isNoResize ? "no-resize" : "";

  if (imageAlign === "center") {
    const centerBlockStyles: CSSProperties = {
      display: "block",
      marginLeft: "auto",
      marginRight: "auto"
    };
    if (linkUrl) {
      linkTagStyles = { ...centerBlockStyles };
      imgTagStyles.display = "block";
    } else {
      Object.assign(imgTagStyles, centerBlockStyles);
    }
  } else if (imageAlign === "right") {
    wrapperStyle.textAlign = "right";
  } else {
    wrapperStyle.textAlign = "left";
  }

  if (enableLightbox) {
    imgTagStyles.cursor = "pointer";
  }

  let photoDisplayContent: React.ReactElement = <></>;

  if (imageUrl) {
    const imgTag = (
      <img
        src={imageUrl}
        alt={element.answers?.photoAlt || ""}
        className={imageClassName}
        id={"el-" + element.id}
        style={imgTagStyles}
        loading="lazy"
        decoding="async"
        onClick={enableLightbox ? () => setLightboxOpen(true) : undefined}
      />
    );

    if (linkUrl) {
      photoDisplayContent = (
        <a
          target={element.answers?.external === "true" ? "_blank" : "_self"}
          rel="noreferrer noopener"
          href={linkUrl}
          style={linkTagStyles}
        >
          {imgTag}
        </a>
      );
    } else {
      photoDisplayContent = imgTag;
    }
  }

  const lightboxModal = lightboxOpen && imageUrl
    ? ReactDOM.createPortal(
      <div className="b1-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
        <button className="b1-lightbox__close" onClick={closeLightbox} aria-label="Close lightbox">&times;</button>
        <img src={imageUrl} alt={element.answers?.photoAlt || ""} onClick={(e) => e.stopPropagation()} />
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <div style={wrapperStyle}>{photoDisplayContent}</div>
      {lightboxModal}
    </>
  );
};
