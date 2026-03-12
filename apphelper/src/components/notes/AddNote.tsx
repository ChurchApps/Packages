"use client";

import React, { useState, useEffect } from "react";
import { ApiHelper, Locale, PersonHelper } from "../../helpers";
import { MessageInterface, UserContextInterface, UserHelper } from "@churchapps/helpers";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Avatar,
  Icon
} from "@mui/material";
import { EmojiPicker } from "./EmojiPicker";
import { ErrorMessages } from "../ErrorMessages";

type Props = {
  messageId?: string;
  onUpdate: () => void;
  createConversation: () => Promise<string>;
  conversationId?: string;
  context: UserContextInterface;
  onCancel?: () => void;
};

export function AddNote({ context, onCancel, ...props }: Props) {
  const [message, setMessage] = useState<MessageInterface>();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const headerText = props.messageId ? "Edit note" : "Add a note";
  const churchId = UserHelper.currentUserChurch?.church?.id || "";

  useEffect(() => {
    if (props.messageId) {
      ApiHelper.get(`/messages/${churchId}/${props.messageId}`, "MessagingApi")
        .then((n: any) => setMessage(n));
    } else {
      setMessage({ conversationId: props.conversationId, content: "" });
    }
    return () => setMessage(null);
  }, [props.messageId, props.conversationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setErrors([]);
    setMessage({ ...message, content: e.target.value });
  };

  const validate = () => {
    const result = [];
    if (!message?.content?.trim()) result.push(Locale.label("notes.validate.content", "Please enter a message"));
    setErrors(result);
    return result.length === 0;
  };

  async function handleSave() {
    if (!validate()) return;

    setIsSubmitting(true);
    let cId = props.conversationId;
    if (!cId) cId = await props.createConversation();

    const m = { ...message, conversationId: cId };
    ApiHelper.post("/messages", [m], "MessagingApi")
      .then(() => {
        props.onUpdate();
        setMessage({ ...message, content: "" });
      })
      .catch((error: any) => {
        console.error("Error saving message:", error);
        if (error?.message === "Forbidden") {
          setErrors(["You can't edit the message sent by others."]);
        } else {
          setErrors([error?.message || "Failed to save message. Please try again."]);
        }
      })
      .finally(() => setIsSubmitting(false));
  }

  async function deleteNote() {
    if (!props.messageId) return;
    await ApiHelper.delete(`/messages/${props.messageId}`, "MessagingApi");
    props.onUpdate();
  }

  const deleteFunction = props.messageId ? deleteNote : null;
  const image = PersonHelper.getPhotoUrl(context?.person);

  return (
    <Box sx={{ width: "100%" }}>
      <ErrorMessages errors={errors} />

      <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50", borderColor: "grey.300" }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar
            src={image}
            alt={context?.person?.name?.display}
            sx={{ width: 48, height: 48 }}
          />

          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              name="noteText"
              aria-label={headerText}
              placeholder={props.messageId ? "Edit your message..." : "Type a message..."}
              variant="standard"
              value={message?.content || ""}
              onChange={handleChange}
              disabled={isSubmitting}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "1rem",
                  "& textarea": { resize: "vertical", minHeight: "40px" }
                }
              }}
              sx={{
                bgcolor: "white",
                borderRadius: 1,
                p: 1,
                border: "1px solid",
                borderColor: "grey.300",
                "&:hover": { borderColor: "grey.400" },
                "&.Mui-focused": { borderColor: "primary.main" }
              }}
            />

            {/* Buttons: Cancel (left), Delete + Send (right) */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              {/* Cancel Button */}
              {props.messageId && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setMessage({ ...message, content: "" });
                    onCancel?.();
                  }}
                  disabled={isSubmitting}
                  sx={{ color: "grey.700" }}
                >
                  <Icon fontSize="small">cancel</Icon>
                </IconButton>
              )}

              {/* Spacer */}
              <Box sx={{ flex: 1 }} />

              {/* Right buttons: Emoji + Delete + Send */}
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                  disabled={isSubmitting}
                  sx={{ color: "grey.600" }}
                >
                  <Icon fontSize="small">sentiment_satisfied_alt</Icon>
                </IconButton>
                {deleteFunction && (
                  <IconButton
                    size="small"
                    onClick={deleteFunction}
                    disabled={isSubmitting}
                    sx={{ color: "error.main" }}
                  >
                    <Icon fontSize="small">delete</Icon>
                  </IconButton>
                )}

                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSubmitting || !message?.content?.trim()}
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&:disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" }
                  }}
                >
                  {isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Icon fontSize="small">send</Icon>}
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Stack>
      </Paper>
      <EmojiPicker
        anchorEl={emojiAnchorEl}
        open={Boolean(emojiAnchorEl)}
        onClose={() => setEmojiAnchorEl(null)}
        onSelect={(emoji) => setMessage({ ...message, content: (message?.content || "") + emoji })}
      />
    </Box>
  );
}
