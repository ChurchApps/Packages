import React from "react";
import { Box, Typography, Container, Card, CardContent, Chip, Button } from "@mui/material";
import { SocketHelper, NotificationService } from "../../../src";

const PrivateMessageTestPage: React.FC = () => {
  const [connectionState, setConnectionState] = React.useState<string>("UNINITIALIZED");
  const [notificationCounts, setNotificationCounts] = React.useState({ notificationCount: 0, pmCount: 0 });
  const [isServiceReady, setIsServiceReady] = React.useState(false);

  // Update connection state every second and log socket activity
  React.useEffect(() => {
    const interval = setInterval(() => {
      const state = SocketHelper.getConnectionState();
      setConnectionState(state);
      setIsServiceReady(NotificationService.getInstance().isReady());

      // Log socket activity every 10 seconds
      const now = Date.now();
      if (now % 10000 < 1000) { // Every ~10 seconds
        console.log("📊 SocketHelper Activity Check:", {
          connectionState: state,
          isServiceReady: NotificationService.getInstance().isReady(),
          timestamp: new Date().toISOString()
        });

        if (state === "OPEN") {
          console.log("👂 SocketHelper: Listening for incoming messages...");
        }
      }
    }, 1000);

    // Make debugging objects available in console
    (window as any).SocketHelper = SocketHelper;
    (window as any).NotificationService = NotificationService;

    return () => clearInterval(interval);
  }, []);

  // Subscribe to notification updates
  React.useEffect(() => {
    const unsubscribe = NotificationService.getInstance().subscribe((counts) => {
      console.log("🔔 PrivateMessageTestPage: Notification counts updated:", counts);
      setNotificationCounts(counts);
    });

    return unsubscribe;
  }, []);

  const handleTestConnection = async () => {
    console.log("🧪 Testing socket connection...");
    console.log("📊 Current handler count:", SocketHelper.actionHandlers?.length || "Unknown");
    console.log("📋 Registered handlers:", SocketHelper.actionHandlers?.map(h => `${h.action}:${h.id}`) || "None");
    console.log("🆔 Socket ID:", SocketHelper.socketId || "Not set");
    console.log("🔗 Person/Church context: [private property - cannot access]");

    try {
      await SocketHelper.init();
      console.log("✅ Socket connection test completed");

      // Wait a bit and check if we got a socket ID
      setTimeout(() => {
        console.log("🔍 Post-connection check:");
        console.log("🆔 Socket ID after init:", SocketHelper.socketId || "Still not set");
        console.log("🔌 Connection state:", SocketHelper.getConnectionState());
        console.log("📡 Is connected:", SocketHelper.isConnected());
      }, 2000);

    } catch (error) {
      console.error("❌ Socket connection test failed:", error);
    }
  };

  const handleRefreshCounts = () => {
    console.log("🔄 Refreshing notification counts...");
    NotificationService.getInstance().refresh();
  };

  const handleSimulateMessage = () => {
    console.log("🎭 Simulating incoming message...");
    // Simulate a private message notification
    if (SocketHelper.handleMessage) {
      SocketHelper.handleMessage({
        action: "privateMessage",
        data: {
          message: {
            id: "test-" + Date.now(),
            personId: "test-sender",
            content: "Test private message"
          }
        }
      });
      console.log("📬 Simulated privateMessage event");
    } else {
      console.error("❌ SocketHelper.handleMessage not available");
    }
  };

  const handleForceSocketId = () => {
    console.log("🔧 Forcing socket ID for testing...");
    // Manually set a socket ID to bypass server issue
    const testSocketId = "test-socket-" + Date.now();
    SocketHelper.handleMessage({
      action: "socketId",
      data: testSocketId
    });
    console.log("🆔 Forced socket ID:", testSocketId);
  };

  const handleForceCountUpdate = () => {
    console.log("🔢 Forcing count update for testing...");
    // Directly update the NotificationService counts bypassing API
    const service = NotificationService.getInstance();
    const testCounts = {
      notificationCount: Math.floor(Math.random() * 10) + 1,
      pmCount: Math.floor(Math.random() * 5) + 1
    };
    console.log("🔢 Test counts:", testCounts);

    // Access the private updateCounts method via any cast for testing
    (service as any).updateCounts(testCounts);
    console.log("✅ Direct count update completed");
  };

  const getConnectionColor = () => {
    switch (connectionState) {
      case "OPEN": return "success";
      case "CONNECTING": return "warning";
      case "CLOSED":
      case "CLOSING": return "error";
      default: return "default";
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Private Message & WebSocket Testing
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          This page provides tools to test the WebSocket notification system and private messaging functionality.
          Use this to verify that notification counts update instantly and messages appear in real-time.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Socket Connection Status
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip
                  label={connectionState}
                  color={getConnectionColor() as any}
                  size="small"
                />
                <Chip
                  label={isServiceReady ? "Service Ready" : "Service Not Ready"}
                  color={isServiceReady ? "success" : "error"}
                  size="small"
                />
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={handleTestConnection}
                sx={{ mr: 1 }}
              >
                Test Connection
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefreshCounts}
                sx={{ mr: 1 }}
              >
                Refresh Counts
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleSimulateMessage}
                color="secondary"
                sx={{ mr: 1 }}
              >
                Simulate Message
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleForceSocketId}
                color="warning"
                sx={{ mr: 1 }}
              >
                Force Socket ID
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleForceCountUpdate}
                color="success"
              >
                Force Count Update
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Counts
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Chip
                  label={`Notifications: ${notificationCounts.notificationCount}`}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={`Private Messages: ${notificationCounts.pmCount}`}
                  color="secondary"
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                These counts update automatically when new messages arrive
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Debug Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Check the browser console for detailed logging of socket events and notification updates.
              The connection should be OPEN when logged in, and notification counts should update in real-time.
            </Typography>
            <Typography variant="body2">
              <strong>Expected behavior:</strong>
            </Typography>
            <ul style={{ marginTop: 8, paddingLeft: 16 }}>
              <li>Socket connects automatically when you log in</li>
              <li>Notification counts load from the server</li>
              <li>Real-time updates when new messages arrive</li>
              <li>Console shows detailed logging for debugging</li>
            </ul>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default PrivateMessageTestPage;
