"use client";

import React, { useState } from "react";
import { ApiHelper } from "@churchapps/helpers";
import {
  Box,
  Stack,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Skeleton
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Task as TaskIcon,
  Assignment as AssignmentIcon,
  OpenInNew as OpenInNewIcon
} from "@mui/icons-material";
import { NotificationInterface, UserContextInterface } from "@churchapps/helpers";
import { DateHelper } from "../../helpers";

interface Props {
  appName: string;
  context: UserContextInterface;
  onNavigate: (url: string) => void;
  onUpdate: () => void;
}

export const Notifications: React.FC<Props> = (props) => {
  const [notifications, setNotifications] = useState<NotificationInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const n: NotificationInterface[] = await ApiHelper.get("/notifications/my", "MessagingApi");
    setNotifications(n);
    setIsLoading(false);
    props.onUpdate();
  };

  React.useEffect(() => { loadData(); }, []);

  const getAppUrl = (appName:string) => {
    switch (appName) {
      case props.appName.toLowerCase(): return "";
      case "b1admin": return "https://admin.b1.church";
      case "b1": return "https://" + props.context.userChurch.church.subDomain + ".b1.church";
      default: return "";
    }
  };

  const handleClick = (notification:NotificationInterface) => {
    let app = "";
    let path = "";
    switch (notification.contentType) {
      case "task": app = "b1admin"; path = "/tasks/" + notification.contentId; break;
      case "assignment": app = "b1"; path = "/my/plans/" + notification.contentId; break;
    }

    const appUrl = getAppUrl(app);
    if (appUrl === "") {
      props.onNavigate(path);
    } else {
      window.open(appUrl + path, "_blank");
    }
  };

  const getNotificationIcon = (contentType: string) => {
    switch (contentType) {
      case "task": return <TaskIcon />;
      case "assignment": return <AssignmentIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const getNotificationList = () => {
    if (notifications.length === 0) {
      return (
        <Box id="notifications-empty" sx={{ textAlign: "center", py: 4 }}>
          <NotificationsIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No notifications
          </Typography>
          <Typography variant="body2" color="textSecondary">
            You're all caught up!
          </Typography>
        </Box>
      );
    }

    return (
      <List id="notifications-list" sx={{ width: "100%" }}>
        {notifications.map((notification, index) => {
          const datePosted = new Date(notification.timeSent);
          const displayDuration = DateHelper.getDisplayDuration(datePosted);
          const isUnread = notification.isNew;

          return (
            <React.Fragment key={notification.id}>
              <ListItem
                id={`notification-item-${notification.id}`}
                component="button"
                onClick={() => handleClick(notification)}
                sx={{
                  alignItems: "flex-start",
                  py: 2,
                  cursor: "pointer",
                  bgcolor: isUnread ? "action.hover" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                  borderRadius: 1,
                  mb: 0.5
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: isUnread ? "primary.main" : "grey.400",
                      width: 48,
                      height: 48
                    }}
                  >
                    {getNotificationIcon(notification.contentType)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: isUnread ? 600 : 400,
                          flex: 1,
                          pr: 1
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {isUnread && (
                          <Chip
                            size="small"
                            label="New"
                            color="primary"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                        <Typography variant="caption" color="textSecondary">
                          {displayDuration}
                        </Typography>
                      </Stack>
                    </Stack>
                  }
                  secondary={
                    notification.link && (
                      <Box sx={{ mt: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(notification.link, "_blank");
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <OpenInNewIcon fontSize="small" />
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            View Details
                          </Typography>
                        </IconButton>
                      </Box>
                    )
                  }
                />
              </ListItem>
              {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          );
        })}
      </List>
    );
  };


  return (
    <Paper id="notifications-panel" elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box id="notifications-header" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6" component="h2">
          Notifications
        </Typography>
      </Box>

      <Box id="notifications-content" sx={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[...Array(3)].map((_, index) => (
              <Box key={`skeleton-${index}`} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          getNotificationList()
        )}
      </Box>
    </Paper>
  );
};
