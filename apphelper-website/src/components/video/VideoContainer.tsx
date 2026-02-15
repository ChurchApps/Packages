"use client";
import React, { useEffect } from "react";
import { StreamingServiceExtendedInterface } from "../../helpers";
import type { AppearanceInterface } from "@churchapps/apphelper";

interface Props {
  currentService: StreamingServiceExtendedInterface | null;
  embedded: boolean;
  appearance: AppearanceInterface;
}

export const VideoContainer: React.FC<Props> = (props) => {
  const [currentTime, setCurrentTime] = React.useState(new Date().getTime());
  const [loadedTime, setLoadedTime] = React.useState(new Date().getTime());

  const getCountdownTime = (serviceTime: Date) => {
    let remainingSeconds = Math.floor((serviceTime.getTime() - currentTime) / 1000);
    if (remainingSeconds > 86400) {
      return serviceTime.toDateString() + " - " + serviceTime.toLocaleString("en-US", { hour: "numeric", minute: "numeric", hour12: true });
    } else {
      const hours = Math.floor(remainingSeconds / 3600);
      remainingSeconds = remainingSeconds - (hours * 3600);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds - (minutes * 60);
      return ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2);
    }
  };

  const getVideo = (cs: StreamingServiceExtendedInterface | null) => {
    if (!cs) return null;
    let videoUrl = cs?.sermon?.videoUrl || "";
    if (!videoUrl || videoUrl === "") {
      const logoUrl = getLogo();
      return (
        <div
          id="noVideoContent"
          style={{
            backgroundImage: `url(${logoUrl})`,
            height: "100%",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center"
          }}
        />
      );
    }

    if (cs.localStartTime !== undefined) {
      const seconds = Math.floor((loadedTime - cs.localStartTime.getTime()) / 1000);
      if (seconds > 10) {
        if (cs?.sermon?.videoType === "youtube") videoUrl += "&start=" + seconds.toString();
        if (cs?.sermon?.videoType === "vimeo") videoUrl += "#t=" + seconds.toString() + "s";
      } else {
        if (cs?.sermon?.videoType === "youtube") videoUrl += "&start=1";
        if (cs?.sermon?.videoType === "vimeo") videoUrl += "#t=0m0s";
      }
    }
    return (
      <iframe
        id="videoFrame"
        src={videoUrl}
        frameBorder={0}
        allow="autoplay; fullscreen"
        allowFullScreen
        title="Sermon Video"
      ></iframe>
    );
  };

  const getCountdown = (cs: StreamingServiceExtendedInterface | null) => {
    if (!cs) return null;
    const displayTime = getCountdownTime(cs.localCountdownTime || new Date());
    return (
      <div
        id="noVideoContent"
        style={{
          backgroundImage: `url(${getLogo()})`,
          height: "100%",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center"
        }}
      >
        <h3 style={{ fontSize: 24, position: "absolute", bottom: 40, left: 20 }}>
          {cs?.sermon?.title ?? "Next Service Time"}
        </h3>
        <p style={{ fontSize: 28, position: "absolute", bottom: 0, left: 20 }}>{displayTime}</p>
      </div>
    );
  };

  const getLogo = () => {
    return props.appearance?.logoDark || null;
  };

  const contentType = React.useMemo(() => {
    const cs = props.currentService;
    const now = new Date();

    if (cs === undefined || cs === null || cs.localEndTime === undefined) {
      return "logo";
    } else if (now > cs.localEndTime) {
      return "ended";
    } else if (cs.localStartTime !== undefined && now <= cs.localStartTime) {
      return "countdown";
    } else {
      return "video";
    }
  }, [props.currentService]);

  const getContents = () => {
    const logoUrl = getLogo();

    switch (contentType) {
      case "logo":
        return (
          <div
            id="noVideoContent"
            style={{
              backgroundImage: `url(${logoUrl})`,
              height: "100%",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center"
            }}
          />
        );
      case "ended":
        return (
          <div id="noVideoContent">
            <h3>The current service has ended.</h3>
          </div>
        );
      case "countdown":
        return getCountdown(props.currentService);
      case "video":
        return getVideo(props.currentService);
      default:
        return (
          <div
            id="noVideoContent"
            style={{
              backgroundImage: `url(${logoUrl})`,
              height: "100%",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center"
            }}
          />
        );
    }
  };

  useEffect(() => {
    setLoadedTime(new Date().getTime());
    const id = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="videoContainer" className={props.embedded ? "embedded" : ""}>
      {getContents()}
    </div>
  );
};
