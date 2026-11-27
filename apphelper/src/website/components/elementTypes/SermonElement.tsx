"use client";
import { useEffect, useRef, useState } from "react";
import { Typography, Breadcrumbs, Button, Grid, Card, CardContent, Box } from "@mui/material";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import TopicIcon from "@mui/icons-material/Topic";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ApiHelper, DateHelper } from "../../..";
import { AppearanceHelper } from "../../..";
import { Loading } from "../../..";
import { Locale } from "../../..";
import type { PlaylistInterface, SermonInterface } from "@churchapps/helpers";
import { ElementInterface } from "../../helpers";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { shareLink } from "../../helpers/shareLink";

interface Props {
  churchId: string;
  appearance: any;
  element?: ElementInterface;
}

export const SermonElement = ({ churchId, appearance, element }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState<string>("playlists");
  const [playlists, setPlaylists] = useState<PlaylistInterface[]>([]);
  const [activePlaylist, setActiveplaylist] = useState<PlaylistInterface>();
  const [sermons, setSermons] = useState<SermonInterface[]>([]);
  const [activeSermons, setActiveSermons] = useState<SermonInterface[]>([]);
  const [activeVideo, setActiveVideo] = useState<SermonInterface>();
  const [shareStatus, setShareStatus] = useState<string>("");
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answers: any = element?.answers || {};
  const layout = (answers.layout as string) || "browse";
  const filterPlaylistId = (answers.playlistId as string) || "";
  const itemCount = Math.max(1, parseInt(answers.itemCount, 10) || 6);
  const showTitles = answers.showTitles !== false && answers.showTitles !== "false";
  const showDates = answers.showDates !== false && answers.showDates !== "false";

  useEffect(() => {
    EnvironmentHelper.init();
    ApiHelper.getAnonymous("/playlists/public/" + churchId, "ContentApi").then((data: any) => {
      setPlaylists(data);
      setIsLoading(false);
    });

    ApiHelper.getAnonymous("/sermons/public/" + churchId, "ContentApi").then((data: any) => {
      setSermons(data);
    });
  }, [churchId]);

  useEffect(() => () => { if (shareTimer.current) clearTimeout(shareTimer.current); }, []);

  const getFilteredData = (id?: string) => {
    if (!id) return;
    const filteredData = sermons.filter((item) => item.playlistId === id);
    setActiveSermons(filteredData);
  };

  const formatDate = (date?: Date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(DateHelper.locale, { year: "numeric", month: "long", day: "numeric" });
  };

  const thumbFor = (item: SermonInterface) => item.thumbnail || AppearanceHelper.getLogo(appearance, "/images/logo.png", "/images/logo.png", "#FFF");

  // Uploaded sermon audio is private in S3, so downloads go through the Api redirect that signs the link.
  const downloadHref = (item: SermonInterface) => ApiHelper.getConfig("ContentApi")?.url + "/sermons/public/download/" + churchId + "/" + item.id;

  const handleShare = async (item: SermonInterface) => {
    const url = window.location.origin + "/sermons/" + item.id;
    const result = await shareLink({ title: item.title || "", text: `Check out this sermon: "${item.title}" ${url}`, url });
    const text = result === "copied" ? Locale.label("sermon.linkCopied", "Link copied") : result === "failed" ? Locale.label("sermon.unableToShare", "Unable to share") : "";
    if (!text) return;
    setShareStatus(text);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShareStatus(""), 3000);
  };

  const renderAudio = (item: SermonInterface) => (
    <div className="sermonAudio">
      <img src={item.thumbnail || activePlaylist?.thumbnail || thumbFor(item)} alt={item.title} loading="lazy" />
      <h2>{item.title}</h2>
      <audio controls autoPlay preload="none" src={item.audioUrl} data-testid="sermon-audio" />
      <div className="podcastActions">
        <a className="podcastDownload" data-testid="sermon-download" href={downloadHref(item)} aria-label={Locale.label("sermon.download", "Download") + " " + (item.title || "")}>{Locale.label("sermon.download", "Download")}</a>
        <button type="button" className="podcastShare" data-testid="sermon-share" aria-label={Locale.label("sermon.share", "Share") + " " + (item.title || "")} onClick={() => handleShare(item)}>{Locale.label("sermon.share", "Share")}</button>
        {shareStatus && <span className="podcastShareStatus" role="status" data-testid="sermon-share-status">{shareStatus}</span>}
      </div>
      {item.description && <p>{item.description}</p>}
    </div>
  );

  const playVideo = (item: SermonInterface) => {
    setActiveVideo(item);
    setIsActive("video");
  };

  if (isLoading) return <Loading />;

  if (layout !== "browse") {
    if (isActive === "video" && (activeVideo?.videoUrl || activeVideo?.audioUrl)) {
      return (
        <div>
          <Button size="small" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 3, marginBottom: 1 }} onClick={() => { setActiveVideo(undefined); setIsActive("playlists"); }}>
            {Locale.label("sermon.back", "Back")}
          </Button>
          {activeVideo.videoUrl ? (
            <div className="videoWrapper">
              <iframe src={activeVideo.videoUrl.replace("controls=0", "controls=1")} allowFullScreen style={{ border: 0 }} />
            </div>
          ) : renderAudio(activeVideo)}
        </div>
      );
    }

    const items = (Array.isArray(sermons) ? sermons : [])
      .filter((item) => !filterPlaylistId || item.playlistId === filterPlaylistId)
      .sort((a, b) => new Date(b.publishDate || 0).getTime() - new Date(a.publishDate || 0).getTime());

    if (layout === "featuredLatest") {
      const featured = items[0];
      if (!featured) return null;
      return (
        <div className="sermonFeatured" onClick={() => playVideo(featured)} data-testid="sermon-featured">
          <div className="sermonThumb sermonThumbFeatured">
            <img src={thumbFor(featured)} alt={featured.title} loading="lazy" />
            <PlayCircleOutlineIcon className="sermonPlayIcon" sx={{ fontSize: 96 }} />
          </div>
          {showTitles && <h2 className="sermonFeaturedTitle">{featured.title}</h2>}
          {showDates && featured.publishDate && <div className="sermonCardDate">{formatDate(featured.publishDate)}</div>}
        </div>
      );
    }

    const shown = items.slice(0, itemCount);
    if (shown.length === 0) return null;

    if (layout === "list") {
      return (
        <div className="sermonList" data-testid="sermon-list">
          {shown.map((item) => (
            <div className="sermonListItem" key={item.id} onClick={() => playVideo(item)}>
              <div className="sermonThumb sermonThumbList">
                <img src={thumbFor(item)} alt={item.title} loading="lazy" />
                <PlayCircleOutlineIcon className="sermonPlayIcon" sx={{ fontSize: 48 }} />
              </div>
              <div className="sermonListBody">
                {showTitles && <h3 className="sermonCardTitle">{item.title}</h3>}
                {showDates && item.publishDate && <div className="sermonCardDate">{formatDate(item.publishDate)}</div>}
                {item.description && <p className="sermonListDesc">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="sermonGrid" data-testid="sermon-grid">
        {shown.map((item) => (
          <div className="sermonCard" key={item.id} onClick={() => playVideo(item)}>
            <div className="sermonThumb">
              <img src={thumbFor(item)} alt={item.title} loading="lazy" />
              <PlayCircleOutlineIcon className="sermonPlayIcon" sx={{ fontSize: 56 }} />
            </div>
            {showTitles && <h3 className="sermonCardTitle">{item.title}</h3>}
            {showDates && item.publishDate && <div className="sermonCardDate">{formatDate(item.publishDate)}</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Breadcrumbs>
        <Button
          size="small"
          startIcon={<FolderCopyIcon />}
          variant={isActive === "playlists" ? "contained" : "text"}
          color={isActive === "playlists" ? "primary" : "secondary"}
          sx={{ borderRadius: 3 }}
          onClick={() => {
            setIsActive("playlists");
          }}
          data-testid="sermon-playlists-button"
        >
          {Locale.label("sermon.playlists", "Playlists")}
        </Button>
        {activePlaylist?.title && (
          <Button
            size="small"
            startIcon={<TopicIcon />}
            variant={isActive === "sermons" ? "contained" : "text"}
            color={isActive === "sermons" ? "primary" : "secondary"}
            sx={{ borderRadius: 3 }}
            onClick={() => {
              setIsActive("sermons");
            }}
            data-testid="sermon-topics-button"
          >
            {activePlaylist?.title}
          </Button>
        )}
        {activeVideo?.title && (
          <Button
            size="small"
            startIcon={<LiveTvIcon />}
            variant={isActive === "video" ? "contained" : "text"}
            color={isActive === "video" ? "primary" : "secondary"}
            sx={{ borderRadius: 3 }}
            onClick={() => {
              setIsActive("video");
            }}
            data-testid="sermon-watch-button"
          >
            {activeVideo?.title}
          </Button>
        )}
      </Breadcrumbs>
      <div style={{ marginTop: 15 }}>
        {isActive === "playlists" && (
          <Grid container spacing={3} style={{ paddingBottom: 20, paddingTop: 20 }}>
            {playlists && Array.isArray(playlists) && playlists.map((item) => (
              <Grid size={{ md: 4, xs: 12, sm: 6 }} key={item.id}>
                <Card
                  key={item.id}
                  sx={{ maxWidth: 635, borderRadius: 0, boxShadow: 5, cursor: "pointer" }}
                  onClick={() => {
                    setActiveplaylist(item);
                    setIsActive("sermons");
                    getFilteredData(item.id);
                  }}
                >
                  <CardContent>
                    <Box
                      component="img"
                      alt={item?.title}
                      src={item.thumbnail ? item.thumbnail : AppearanceHelper.getLogo(appearance, "/images/logo.png", "/images/logo.png", "#FFF")}
                      height={190}
                      minHeight={{ xs: 230, sm: "auto" }}
                      sx={{ objectFit: "cover", objectPosition: "center" }}
                    />
                    <Typography
                      component="h3"
                      sx={{ fontSize: "24px", fontWeight: 500, marginBottom: "2px", marginTop: "6px", color: "#333", overflowY: "hidden", maxHeight: 30 }}
                    >
                      {item.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {isActive === "sermons" && activeSermons && (
          <Grid container spacing={3} style={{ paddingBottom: 20, paddingTop: 20 }}>
            {activeSermons && Array.isArray(activeSermons) && activeSermons.map((item) => (
              <Grid size={{ md: 4, xs: 12 }} key={item.id}>
                <Card
                  key={item.id}
                  sx={{ maxWidth: 635, borderRadius: 0, boxShadow: 5, cursor: "pointer" }}
                  onClick={() => {
                    setIsActive("video");
                    setActiveVideo(item);
                  }}
                >
                  <CardContent>
                    <Box
                      component="img"
                      alt={item?.title}
                      src={item.thumbnail ? item.thumbnail : (activePlaylist?.thumbnail ? activePlaylist.thumbnail : AppearanceHelper.getLogo(appearance, "/images/logo.png", "/images/logo.png", "#FFF"))}
                      height={190}
                      minHeight={{ xs: 230, sm: "auto" }}
                      sx={{ objectFit: "cover", objectPosition: "center" }}
                    />
                    <Typography
                      component="h3"
                      sx={{ fontSize: "24px", fontWeight: 500, marginBottom: "2px", marginTop: "6px", color: "#333", overflowY: "hidden", maxHeight: 30 }}
                    >
                      {item.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {isActive === "video" && activeVideo && activeVideo.videoUrl && (
          <div className="videoWrapper">
            <iframe
              src={activeVideo.videoUrl.replace("controls=0", "controls=1")}
              allowFullScreen
              style={{ border: 0 }}
            />
          </div>
        )}
        {isActive === "video" && activeVideo && !activeVideo.videoUrl && activeVideo.audioUrl && renderAudio(activeVideo)}
      </div>
    </>
  );
};
