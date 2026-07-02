"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Photo { url: string; alt?: string; caption?: string; }

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const SPACING: Record<string, number> = { small: 4, medium: 8, large: 16 };

export const GalleryElement = ({ element, onEdit }: Props) => {
  const photos: Photo[] = Array.isArray(element.answers?.photos) ? element.answers.photos : [];
  const layout = (element.answers?.layout as string) || "grid";
  const columns = Math.min(4, Math.max(2, parseInt(element.answers?.columns, 10) || 3));
  const gap = SPACING[element.answers?.spacing as string] ?? SPACING.medium;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback((dir: number) => {
    setOpenIndex((i) => (i === null ? null : (i + dir + photos.length) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openIndex, move]);

  if (photos.length === 0) {
    if (onEdit) return <div className="gallery-empty">Gallery: add photos to get started</div>;
    return null;
  }

  const isMasonry = layout === "masonry";
  const gridStyle: React.CSSProperties = isMasonry
    ? { columnCount: columns, columnGap: gap }
    : { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap };
  const aspect = layout === "square" ? "1 / 1" : layout === "wide" ? "16 / 9" : undefined;

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <div id={"el-" + element.id} className="gallery">
      <div style={gridStyle}>
        {photos.map((photo, i) => (
          <figure
            key={i}
            className="gallery-item"
            style={{ margin: 0, marginBottom: isMasonry ? gap : undefined, breakInside: isMasonry ? "avoid" : undefined, cursor: "pointer" }}
            onClick={() => setOpenIndex(i)}
          >
            <img
              src={photo.url}
              alt={photo.alt || ""}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", display: "block", borderRadius: 4, aspectRatio: aspect, objectFit: aspect ? "cover" : undefined }}
            />
            {photo.caption && <figcaption className="gallery-caption">{photo.caption}</figcaption>}
          </figure>
        ))}
      </div>
      <Dialog open={openIndex !== null} onClose={close} maxWidth="lg" PaperProps={{ sx: { background: "transparent", boxShadow: "none", overflow: "visible" } }}>
        {current && (
          <div className="gallery-lightbox">
            <IconButton className="gallery-lightbox__close" onClick={close} aria-label="Close" sx={{ color: "#fff" }}><CloseIcon /></IconButton>
            {photos.length > 1 && <IconButton className="gallery-lightbox__prev" onClick={() => move(-1)} aria-label="Previous" sx={{ color: "#fff" }}><ChevronLeftIcon fontSize="large" /></IconButton>}
            {photos.length > 1 && <IconButton className="gallery-lightbox__next" onClick={() => move(1)} aria-label="Next" sx={{ color: "#fff" }}><ChevronRightIcon fontSize="large" /></IconButton>}
            <img src={current.url} alt={current.alt || ""} className="gallery-lightbox__img" />
            {current.caption && <div className="gallery-lightbox__caption">{current.caption}</div>}
          </div>
        )}
      </Dialog>
    </div>
  );
};
