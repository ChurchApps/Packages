"use client";

import React, { useState, useEffect, useRef } from "react";
import { ElementInterface, SectionInterface } from "../../helpers";
import { ApiHelper } from "../../..";
import { DroppableArea } from "../admin/DroppableArea";
import { Element } from "../Element";

interface Props {
  element: ElementInterface;
  churchSettings: any;
  textColor: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
  onMove?: () => void;
}

// Module-level storage for carousel positions (persists across remounts)
const carouselPositions = new Map<string, number>();

export const CarouselElement = ({ element, churchSettings, textColor, onEdit, onMove }: Props) => {
  // Initialize from stored position or default to 0
  const [current, setCurrent] = useState(() => (element.id ? carouselPositions.get(element.id) : undefined) || 0);

  // Persist position changes to the Map so they survive remounts
  useEffect(() => {
    if (element.id) carouselPositions.set(element.id, current);
  }, [element.id, current]);

  const interval = (parseInt(element.answers.interval) || 4) * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fade = (element.answers.animationOptions || "fade") === "fade";
  const autoPlay = element.answers.autoplay === "true" && !onEdit;
  const length = element.elements?.length || 0;

  const goTo = (idx: number) => setCurrent(idx);
  const prev = () => setCurrent((prev) => (prev - 1 + length) % length);
  const next = () => setCurrent((prev) => (prev + 1) % length);

  const handleDrop = (data: any, sort: number, column: ElementInterface) => {
    if (data.data) {
      const e: ElementInterface = data.data;
      e.sort = sort;
      e.parentId = column.id;
      ApiHelper.post("/elements", [e], "ContentApi").then(() => { if (onMove) onMove(); });
    } else {
      const e: ElementInterface = { sectionId: element.sectionId, elementType: data.elementType, sort, parentId: column.id, blockId: element.blockId };
      if (onEdit) onEdit(null, e);
    }
  };

  const getAddElement = (column: ElementInterface, s: number) => {
    const sort = s;
    return (
      <DroppableArea key={"add" + column.id} accept={["element", "elementBlock"]} text="Drop here to add slide" onDrop={(data) => handleDrop(data, sort, column)} dndDeps={column} />
    );
  };

  const getElements = ( column: ElementInterface, elements: ElementInterface[] ) => {
    const result: React.ReactElement[] = [];
    if (onEdit) result.push(getAddElement(column, 1));
    elements?.forEach((c) => {
      result.push(
        <Element key={c.id} element={c} onEdit={onEdit} churchSettings={churchSettings} textColor={textColor} parentId={column.id} onMove={onMove} />
      );
    });
    return result;
  };

  const getFadeSlides = () => (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {element.elements && element.elements.map((c, idx) => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: idx === current ? 1 : 0,
            transition: "opacity 0.5s",
            zIndex: idx === current ? 1 : 0
          }}
        >
          <div style={{ height: "100%" }}>{getElements(c, c.elements || [])}</div>
        </div>
      ))}
    </div>
  );

  const getSlideAnimation = () => (
    <div
      style={{
        display: "flex",
        transition: "transform 0.5s",
        transform: `translateX(-${current * 100}%)`,
        height: "100%"
        // width: `${length * 100}%`,
      }}
    >
      {element.elements && element.elements.map((c) => (
        <div key={c.id} style={{ flex: "0 0 100%", height: "100%" }}>
          <div style={{ height: "100%" }}>{getElements(c, c.elements || [])}</div>
        </div>
      ))}
    </div>
  );

  const getNavigation = () => (
    <>
      <div
        onClick={prev}
        style={{
          position: "absolute",
          left: 5,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          backgroundColor: "#494949",
          borderRadius: 20,
          cursor: "pointer"
        }}
      >
        <div style={{ padding: "8px 16px" }}>{"<"}</div>
      </div>
      <div
        onClick={next}
        style={{
          position: "absolute",
          right: 5,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          backgroundColor: "#494949",
          borderRadius: 20,
          cursor: "pointer"
        }}
      >
        <div style={{ padding: "8px 16px" }}>{">"}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2
        }}
      >
        {element.elements && element.elements.map((el, idx) => (
          <button
            key={el.id || `carousel-dot-${idx}`}
            onClick={() => goTo(idx)}
            style={{
              margin: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: idx === current ? "#333" : "#ccc",
              border: "none",
              cursor: "pointer"
            }}
          />
        ))}
      </div>
    </>
  );

  useEffect(() => {
    if (!autoPlay || length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % length);
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, interval, length]);

  return (
    <div
      id={"el-" + element.id}
      style={{
        margin: "0 auto",
        height: parseInt(element.answers.height) || 250,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {fade ? getFadeSlides() : getSlideAnimation()}
      {length > 1 && getNavigation()}
    </div>
  );
};
