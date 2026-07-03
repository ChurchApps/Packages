import React, { useState, useRef, useEffect } from "react";
import { Container, Typography, TextField, Button, Box, Paper, Divider, Alert, Chip } from "@mui/material";

const WebSocketTestPage: React.FC = () => {
  const [wsUrl, setWsUrl] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [messageActivity, setMessageActivity] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (!wsUrl.trim()) {
      alert("Please enter a WebSocket URL");
      return;
    }

    if (wsRef.current) {
      console.log("Closing existing WebSocket connection");
      wsRef.current.close();
    }

    console.log("Attempting to connect to:", wsUrl);
    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log("WebSocket connection opened:", event);
        setConnectionStatus("connected");
        setMessages(prev => [...prev, `Connected to ${wsUrl}`]);
      };

      ws.onmessage = (event) => {
        console.log("WebSocket message received:", event);
        console.log("Message data:", event.data);
        console.log("Message data type:", typeof event.data);
        console.log("Message data length:", event.data?.length);

        const timestamp = new Date().toLocaleTimeString();
        let messageContent = event.data;

        if (typeof event.data === "string" && (event.data.startsWith("{") || event.data.startsWith("["))) {
          try {
            const parsed = JSON.parse(event.data);
            console.log("Parsed JSON message:", parsed);
            messageContent = JSON.stringify(parsed, null, 2);
          } catch (e) {
            console.log("Failed to parse as JSON:", e);
          }
        }

        setMessages(prev => [...prev, `[${timestamp}] Received: ${messageContent}`]);

        setMessageActivity(true);
        setTimeout(() => setMessageActivity(false), 1000);

        console.log("Adding message to UI:", messageContent);
      };

      ws.onerror = (event) => {
        console.log("WebSocket error:", event);
        setConnectionStatus("error");
        setMessages(prev => [...prev, `Error: Connection failed`]);
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event);
        console.log("Close code:", event.code);
        console.log("Close reason:", event.reason);
        console.log("Was clean:", event.wasClean);
        setConnectionStatus("disconnected");
        setMessages(prev => [...prev, `Connection closed (Code: ${event.code}, Reason: ${event.reason || "No reason"})`]);
      };
    } catch (error) {
      console.log("WebSocket connection error:", error);
      setConnectionStatus("error");
      setMessages(prev => [...prev, `Error: ${error}`]);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendMessage = () => {
    if (!message.trim()) {
      alert("Please enter a message to send");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending message:", message);
      console.log("WebSocket ready state:", wsRef.current.readyState);
      wsRef.current.send(message);
      const timestamp = new Date().toLocaleTimeString();
      setMessages(prev => [...prev, `[${timestamp}] Sent: ${message}`]);
      setMessage("");
      console.log("Message sent successfully");
    } else {
      console.log("Cannot send message - WebSocket not connected");
      console.log("WebSocket ready state:", wsRef.current?.readyState);
      console.log("WebSocket.OPEN constant:", WebSocket.OPEN);
      alert("WebSocket is not connected");
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "success";
      case "connecting": return "info";
      case "error": return "error";
      default: return "warning";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "error": return "Connection Error";
      default: return "Disconnected";
    }
  };

  const getReadyStateText = (readyState: number) => {
    switch (readyState) {
      case WebSocket.CONNECTING: return "CONNECTING (0)";
      case WebSocket.OPEN: return "OPEN (1)";
      case WebSocket.CLOSING: return "CLOSING (2)";
      case WebSocket.CLOSED: return "CLOSED (3)";
      default: return `UNKNOWN (${readyState})`;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        WebSocket Test Page
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connection
        </Typography>

        <Alert severity={getStatusColor()} sx={{ mb: 2 }}>
          Status: {getStatusText()}
        </Alert>

        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Typography variant="body2" color="textSecondary">Debug:</Typography>
          <Chip
            label={`Ready State: ${wsRef.current ? getReadyStateText(wsRef.current.readyState) : "No Connection"}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Messages Count: ${messages.length}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`URL: ${wsUrl || "Not Set"}`}
            size="small"
            variant="outlined"
          />
          {messageActivity && (
            <Chip
              label="Message Received!"
              size="small"
              color="success"
              variant="filled"
            />
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <TextField
            label="WebSocket URL"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            placeholder="wss://example.com/ws"
            fullWidth
            disabled={connectionStatus === "connected"}
          />
          {connectionStatus === "connected" ? (
            <Button variant="contained" color="error" onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={connect}
              disabled={connectionStatus === "connecting"}
            >
              Connect
            </Button>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Send Message
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to send"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={connectionStatus !== "connected"}
          >
            Send
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">
            Messages
          </Typography>
          <Button variant="outlined" size="small" onClick={clearMessages}>
            Clear
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            height: 300,
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: 1,
            p: 2,
            backgroundColor: "#f5f5f5",
            fontFamily: "monospace",
            fontSize: "0.875rem"
          }}
        >
          {messages.length === 0 ? (
            <Typography color="textSecondary" sx={{ fontStyle: "italic" }}>
              No messages yet. Connect to a WebSocket and start sending/receiving messages.
            </Typography>
          ) : (
            messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: "4px" }}>
                {msg}
              </div>
            ))
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default WebSocketTestPage;
