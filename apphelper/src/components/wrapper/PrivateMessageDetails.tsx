"use client";

import React from "react";
import {
  Paper,
  Box,
  Typography,
  Stack,
  IconButton
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { PersonInterface, PrivateMessageInterface, UserContextInterface } from "@churchapps/helpers";
import { Notes } from "../notes/Notes";
import { ApiHelper, Locale, NotificationService } from "../../helpers";
import { PersonAvatar } from "../PersonAvatar";

interface Props {
  context: UserContextInterface;
  privateMessage: PrivateMessageInterface;
  onBack: () => void
  refreshKey: number;
  onMessageRead?: () => void;
}

export const PrivateMessageDetails: React.FC<Props> = (props) => {

  // Clear notification when conversation is opened
  React.useEffect(() => {
    const clearNotification = async () => {
      if (props.privateMessage.notifyPersonId === props.context.person.id) {
        try {
          await ApiHelper.get(`/privateMessages/${props.privateMessage.id}`, "MessagingApi");

          // Manually refresh notification counts to ensure immediate UI update
          const notificationService = NotificationService.getInstance();
          await notificationService.refresh();

          if (props.onMessageRead) {
            props.onMessageRead();
          }
        } catch (error) {
          console.error("Failed to clear notification:", error);
        }
      }
    };

    clearNotification();
  }, [props.privateMessage.id, props.privateMessage.notifyPersonId, props.context.person.id]);

  return (
    <Paper elevation={0} sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Fixed Header - Always visible */}
      <Box sx={{
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        flexShrink: 0,
        backgroundColor: "background.paper",
        zIndex: 1
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={props.onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
            <PersonAvatar person={props.privateMessage.person as PersonInterface} size="small" />
            <Box>
              <Typography variant="h6" component="h2">
                {props.privateMessage.person?.name?.display}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {Locale.label("wrapper.privateConversation", "Private Conversation")}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* Chat area - Scrollable content */}
      <Box sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden"
      }}>
        <Notes
          maxHeight="100%"
          context={props.context}
          conversationId={props.privateMessage.conversationId || ""}
          noDisplayBox={true}
          refreshKey={props.refreshKey}
        />
      </Box>
    </Paper>
  );
};

