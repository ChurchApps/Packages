"use client";

import React, { useEffect, useState } from "react";
import { ApiHelper } from "../../..";
import { ElementInterface, SectionInterface } from "../../helpers";

interface PodcastEpisode {
  guid: string;
  title: string;
  pubDate: string;
  description: string;
  audioUrl: string;
  audioType?: string;
  duration: number;
  image: string;
  episodeNumber: number | null;
  link?: string;
}

interface PodcastFeed {
  title: string;
  description: string;
  image: string;
  link?: string;
  author?: string;
  episodes: PodcastEpisode[];
}

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return h + " hr " + m + " min";
  return m + " min";
};

// Episode list pulled from an external podcast RSS feed (separate from the church's own sermons).
// The Api proxies and normalizes the feed (/content/podcast/feed) because third-party feeds rarely send CORS headers.
export const PodcastElement = ({ element, onEdit }: Props) => {
  const answers: any = element.answers || {};
  const feedUrl = ((answers.feedUrl as string) || "").trim();
  const itemCount = Math.max(1, parseInt(answers.itemCount, 10) || 10);
  const showDates = answers.showDates !== false && answers.showDates !== "false";
  const showDescriptions = answers.showDescriptions !== false && answers.showDescriptions !== "false";

  const [feed, setFeed] = useState<PodcastFeed | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!feedUrl) { setFeed(null); setError(""); return; }
    let active = true;
    setError("");
    ApiHelper.getAnonymous("/podcast/feed?url=" + encodeURIComponent(feedUrl), "ContentApi")
      .then((data: any) => {
        if (!active) return;
        if (data && Array.isArray(data.episodes)) setFeed(data);
        else { setFeed(null); setError((data && data.error) || "Unable to load the podcast feed"); }
      })
      .catch(() => { if (active) { setFeed(null); setError("Unable to load the podcast feed"); } });
    return () => { active = false; };
  }, [feedUrl]);

  if (!feedUrl) {
    if (onEdit) return <div className="podcastEmpty" data-testid="podcast-empty">Podcast: enter a podcast RSS feed URL to show episodes</div>;
    return null;
  }

  if (error) {
    return <div className="podcastEmpty" data-testid="podcast-error">{onEdit ? "Podcast: " + error : "This podcast is unavailable right now."}</div>;
  }

  if (!feed) return null;

  const episodes = feed.episodes.slice(0, itemCount);

  return (
    <div id={"el-" + element.id} className="podcast" data-testid="podcast">
      {(feed.title || feed.image) && (
        <div className="podcastHeader">
          {feed.image && <img className="podcastArtwork" src={feed.image} alt={feed.title || "Podcast artwork"} loading="lazy" />}
          <div>
            {feed.title && <h2 className="podcastTitle">{feed.title}</h2>}
            {showDescriptions && feed.description && <p className="podcastDesc">{feed.description}</p>}
          </div>
        </div>
      )}
      {episodes.length === 0 && <div className="podcastEmpty">No episodes yet.</div>}
      <div className="sermonList podcastList" data-testid="podcast-list">
        {episodes.map((ep, index) => {
          const number = ep.episodeNumber ?? (episodes.length - index);
          const meta: React.ReactNode[] = [];
          if (ep.episodeNumber !== null) meta.push("Episode " + ep.episodeNumber);
          if (showDates && ep.pubDate) meta.push(<span className="sermonCardDate">{formatDate(ep.pubDate)}</span>);
          if (ep.duration > 0) meta.push(formatDuration(ep.duration));
          return (
            <div className="sermonListItem podcastEpisode" id={"ep-" + number} key={ep.guid || index} data-testid="podcast-episode">
              {ep.image && (
                <div className="sermonThumb sermonThumbList">
                  <img src={ep.image} alt={ep.title} loading="lazy" />
                </div>
              )}
              <div className="sermonListBody">
                <h3 className="sermonCardTitle">{ep.title}</h3>
                {meta.length > 0 && (
                  <div className="podcastEpisodeMeta">
                    {meta.map((part, i) => (
                      <span key={i}>
                        {i > 0 && <span className="podcastMetaSep" aria-hidden="true"> · </span>}
                        {part}
                      </span>
                    ))}
                  </div>
                )}
                {showDescriptions && ep.description && <p className="podcastEpisodeDesc">{ep.description}</p>}
                {ep.audioUrl && <audio className="podcastAudio" controls preload="none" src={ep.audioUrl} data-testid="podcast-audio">{ep.audioType ? <source src={ep.audioUrl} type={ep.audioType} /> : null}</audio>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
