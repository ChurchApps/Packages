---
"@churchapps/content-providers": patch
---

Fix SignPresenter playlists showing no media: playlist contents now come from the documented `/v2/playlists/:id` player endpoint, mapping image, video, stream, and media-file web slides to playable files (with message thumbnail, slide seconds, and loop), instead of `/content/playlists/:id/messages`, which only covers templates 1 and 3 and usually returned empty urls. The content-messages endpoint remains as a fallback, now also accepting a message's thumbnail or image when the url is empty.
