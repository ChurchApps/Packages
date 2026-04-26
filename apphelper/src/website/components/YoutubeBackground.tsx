"use client";

import { useState, useEffect, useRef, ReactNode, CSSProperties } from "react";

interface Props {
  children?: ReactNode;
  videoId: string;
  overlay?: string;
  aspectRatio?: any;
  contentClassName?: string;
  isDragging: boolean;
  id?: string;
}

export function YoutubeBackground({
  children,
  videoId,
  overlay = "rgba(0,0,0,.4)",
  aspectRatio = "16:9",
  contentClassName,
  isDragging = false,
  id
}: Props) {
  const [videoHeight, setVideoHeight] = useState(10);
  const [videoWidth, setVideoWidth] = useState(10);
  const [videoY, setVideoY] = useState(0);
  const [videoX, setVideoX] = useState(0);
  const containerRef = useRef<any>(null);

  let aspectRatioValue = 16 / 9;
  if (typeof aspectRatio === "string" && aspectRatio) {
    const split = aspectRatio.split(":");
    if (split.length === 2) {
      aspectRatioValue = parseInt(split[0]) / parseInt(split[1]);
    }
  }

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const updateDimensions = () => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let videoHeight = containerHeight;
    let videoWidth = containerWidth;
    let videoY = 0;
    let videoX = 0;

    if (containerAspectRatio > aspectRatioValue) {
      videoHeight = containerWidth / aspectRatioValue;
      videoY = (videoHeight - containerHeight) / -2;
    } else {
      videoWidth = containerHeight * aspectRatioValue;
      videoX = (videoWidth - containerWidth) / -2;
    }

    setVideoHeight(videoHeight);
    setVideoWidth(videoWidth);
    setVideoX(videoX);
    setVideoY(videoY);
  };

  const containerStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden"
  };

  const videoContainerStyle: CSSProperties = {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: videoWidth + "px",
    height: (videoHeight + 130) + "px",
    top: (videoY + -65) + "px",
    left: videoX + "px",
    zIndex: 0
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlay,
    zIndex: 5
  };

  const iframeStyle: CSSProperties = {
    position: "relative",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 0
  };

  const contentStyle: CSSProperties = {
    zIndex: 2,
    position: "relative"
  };

  return (
    <div style={containerStyle} ref={containerRef} id={id}>
      <div style={contentStyle} className={contentClassName}>
        {children}
      </div>
      <div style={videoContainerStyle}>
        {overlay && <div style={overlayStyle}></div>}
        {!isDragging && (
          <iframe
            style={iframeStyle}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&showinfo=0&mute=1&modestbranding=1&iv_load_policy=3&playsinline=1&loop=1&playlist=${videoId}`}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
