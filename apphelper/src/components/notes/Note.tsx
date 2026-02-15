"use client";

import { Icon, IconButton, Stack, Box, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import { DateHelper } from "../../helpers";
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
  const contents = message.content?.split("\n");

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
            <Box>
              {contents.map((c, i) => c ? (
                <Typography key={`content-${i}-${c.substring(0, 20)}`} variant="body2" sx={{ mb: 0.5 }}>
                  {c}
                </Typography>
              ) : (
                <Box key={`empty-${i}`} sx={{ height: "1em" }} />
              ))}
            </Box>
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
