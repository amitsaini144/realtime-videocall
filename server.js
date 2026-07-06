import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import "dotenv/config";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import url from "url";
import cors from "cors";

const app = express();
app.use(cors());
const port = process.env.NEXT_PUBLIC_PORT || 8080;
const httpServer = app.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 });
let users = new Map();

const HEARTBEAT_INTERVAL_MS = 30000;

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => clearInterval(heartbeatInterval));

const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_MESSAGES = 60;
const MAX_CHAT_MESSAGE_LENGTH = 2000;

function isRateLimited(ws) {
  const now = Date.now();
  ws.messageTimestamps = (ws.messageTimestamps || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  ws.messageTimestamps.push(now);
  return ws.messageTimestamps.length > RATE_LIMIT_MAX_MESSAGES;
}

wss.on("connection", async function connection(ws, req) {
  const parameters = url.parse(req.url, true);
  const token = parameters.query.token;

  if (!token) {
    ws.close(1008, "Token required");
    return;
  }

  let user;
  try {
    const sessionClaims = await clerkClient.verifyToken(token);
    user = await clerkClient.users.getUser(sessionClaims.sub);
  } catch (error) {
    console.error("Token verification failed:", error);
    ws.close(1008, "Invalid token");
    return;
  }

  const userId = user.id;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const externalName = [
    user.externalAccounts[0]?.firstName,
    user.externalAccounts[0]?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const displayName =
    user.username ||
    fullName ||
    externalName ||
    user.emailAddresses[0]?.emailAddress ||
    "Unknown";

  users.set(userId, ws);
  ws.userId = userId;
  ws.username = displayName;
  ws.imageUrl = user.imageUrl ?? null;
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.send(
    JSON.stringify({
      type: "userData",
      user: {
        id: user.id,
        username: displayName,
        imageUrl: user.imageUrl ?? null,
      },
    })
  );

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    if (isRateLimited(ws)) {
      ws.send(JSON.stringify({ type: "error", content: "Rate limit exceeded" }));
      return;
    }

    let messageData;
    try {
      messageData = JSON.parse(data);
    } catch (error) {
      console.error("Failed to parse WS message:", error);
      return;
    }

    if (!messageData || typeof messageData.type !== "string") return;

    try {
      switch (messageData.type) {
        case "message":
          handleChatMessage(messageData, ws);
          break;
        case "videoCallOffer":
        case "videoCallAnswer":
        case "iceCandidate":
        case "callBusy":
        case "callRejected":
          forwardMessage(messageData, ws);
          break;
        case "endCall":
          handleEndCall(messageData, ws);
          break;
      }
    } catch (error) {
      console.error("Error handling WS message:", error);
    }
  });

  ws.on("close", function () {
    if (users.get(userId) === ws) {
      users.delete(userId);
      broadcastUserList();
    }
  });
  broadcastUserList();
});

function handleChatMessage(messageData, ws) {
  if (
    typeof messageData.content !== "string" ||
    messageData.content.trim().length === 0 ||
    messageData.content.length > MAX_CHAT_MESSAGE_LENGTH
  ) {
    return;
  }

  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "message",
          content: messageData.content,
          sender: ws.username,
          senderImageUrl: ws.imageUrl,
        })
      );
    }
  });
}

function forwardMessage(messageData, ws) {
  const targetUser = users.get(messageData.to);
  if (targetUser && targetUser.readyState === WebSocket.OPEN) {
    targetUser.send(
      JSON.stringify({
        ...messageData,
        from: ws.userId,
        fromUsername: ws.username,
      })
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "error",
        content: "Target user not available",
        originalMessage: messageData,
      })
    );
  }
}

function handleEndCall(messageData, ws) {
  const targetUser = users.get(messageData.to);
  if (targetUser && targetUser.readyState === WebSocket.OPEN) {
    targetUser.send(JSON.stringify({ type: "endCall", from: ws.userId }));
  }
}

function broadcastUserList() {
  const userList = Array.from(users.entries()).map(([id, ws]) => ({
    id,
    username: ws.username,
    imageUrl: ws.imageUrl,
  }));
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "userList",
          users: userList,
        })
      );
    }
  });
}
