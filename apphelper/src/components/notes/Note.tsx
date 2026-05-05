"use client";

import { Icon, IconButton, Stack, Box, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import { DateHelper, Locale } from "../../helpers";
import { MessageInterface, UserContextInterface } from "@churchapps/helpers";
import { PersonAvatar } from "../PersonAvatar";

interface Props {
  message: MessageInterface;
  showEditNote: (noteId?: string) => void;
  context: UserContextInterface;
  isEditing?: boolean;
  hideEdit?: boolean;
}

export const Note: React.FC<Props> = (props) => {
  const [message, setMessage] = useState<MessageInterface>(null);

  useEffect(() => setMessage(props.message), [props.message]);

  if (message === null) return null;
  const datePosted = new Date(message.timeUpdated || message.timeSent);
  const displayDuration = DateHelper.getDisplayDuration(datePosted);

  const isEdited = message.timeUpdated && message.timeUpdated !== message.timeSent;

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const imageRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)(\?\S*)?/gi;
    const urlRegex = /https?:\/\/\S+/gi;

    const imageMatches = content.match(imageRegex) || [];
    const allUrls = content.match(urlRegex) || [];
    const fileMatches = allUrls.filter((url) => !imageMatches.includes(url));

    const textWithoutUrls = content.replace(urlRegex, "").trim();

    return (
      <>
        {textWithoutUrls && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 0.5 }}>
            {textWithoutUrls}
          </Typography>
        )}
        {imageMatches.map((url, i) => (
          <Box
            key={`img-${i}-${url}`}
            component="img"
            src={url}
            alt=""
            sx={{ display: "block", maxWidth: "100%", borderRadius: 1, mt: 0.5 }}
          />
        ))}
        {fileMatches.map((url, i) => (
          <Box
            key={`file-${i}-${url}`}
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              mt: 0.5,
              px: 1.25,
              py: 0.75,
              bgcolor: "grey.100",
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: 1,
              textDecoration: "none",
              color: "text.primary",
              "&:hover": { bgcolor: "grey.200" }
            }}
          >
            <Icon sx={{ fontSize: 18 }}>attach_file</Icon>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {Locale.label("notes.openFile", "Open file")}
            </Typography>
          </Box>
        ))}
      </>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        mb: 2,
        p: 1,
        borderRadius: 1,
        bgcolor: props.isEditing ? "rgba(255, 243, 224, 0.5)" : "transparent",
        border: props.isEditing ? "1px solid #FFA726" : "none",
        transition: "background-color 0.3s, border 0.3s",
        "&:hover": { bgcolor: "action.hover" }
      }}
    >
      <PersonAvatar person={message.person} size="small" />
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {message.person?.name?.display}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {displayDuration}
              </Typography>
              {isEdited && (
                <Typography variant="caption" color="text.secondary">
                  (edited)
                </Typography>
              )}
            </Stack>
            <Box>{renderMessageContent(message.content || "")}</Box>
          </Box>
          {(message?.id && message.personId === props.context?.person.id && !props.hideEdit) && (
            <IconButton
              size="small"
              aria-label="editNote"
              onClick={() => props.showEditNote(message.id)}
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              <Icon fontSize="small">edit</Icon>
            </IconButton>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
