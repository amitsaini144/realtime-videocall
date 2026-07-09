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

const wss = new WebSocketServer({ server: httpServer, maxPayload: 5 * 1024 * 1024 });
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
const MAX_MEDIA_DATA_LENGTH = 4 * 1024 * 1024;
const MAX_EMOJI_LENGTH = 8;
const MAX_REPLY_PREVIEW_LENGTH = 200;
const MESSAGE_KINDS = new Set(['text', 'image', 'voice']);

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
        case "typing":
          handleTyping(messageData, ws);
          break;
        case "reaction":
          handleReaction(messageData, ws);
          break;
        case "edit":
          handleEditMessage(messageData, ws);
          break;
        case "delete":
          handleDeleteMessage(messageData, ws);
          break;
        case "videoCallOffer":
        case "videoCallAnswer":
        case "iceCandidate":
        case "iceRestartOffer":
        case "iceRestartAnswer":
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
  if (typeof messageData.id !== "string" || messageData.id.length === 0 || messageData.id.length > 100) {
    return;
  }

  const kind = MESSAGE_KINDS.has(messageData.kind) ? messageData.kind : "text";

  if (kind === "text") {
    if (
      typeof messageData.content !== "string" ||
      messageData.content.trim().length === 0 ||
      messageData.content.length > MAX_CHAT_MESSAGE_LENGTH
    ) {
      return;
    }
  } else if (
    typeof messageData.mediaData !== "string" ||
    messageData.mediaData.length === 0 ||
    messageData.mediaData.length > MAX_MEDIA_DATA_LENGTH ||
    typeof messageData.mediaMimeType !== "string"
  ) {
    return;
  }

  const replyTo = isValidReplyTo(messageData.replyTo) ? messageData.replyTo : undefined;

  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "message",
          id: messageData.id,
          kind,
          content: messageData.content,
          mediaData: messageData.mediaData,
          mediaMimeType: messageData.mediaMimeType,
          durationSec: messageData.durationSec,
          replyTo,
          sender: ws.username,
          senderImageUrl: ws.imageUrl,
        })
      );
    }
  });
}

function isValidReplyTo(replyTo) {
  return (
    replyTo &&
    typeof replyTo.id === "string" &&
    replyTo.id.length > 0 &&
    replyTo.id.length <= 100 &&
    typeof replyTo.sender === "string" &&
    replyTo.sender.length <= 100 &&
    typeof replyTo.preview === "string" &&
    replyTo.preview.length <= MAX_REPLY_PREVIEW_LENGTH
  );
}

function handleTyping(messageData, ws) {
  if (typeof messageData.isTyping !== "boolean") return;

  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "typing",
          sender: ws.username,
          isTyping: messageData.isTyping,
        })
      );
    }
  });
}

function handleReaction(messageData, ws) {
  if (
    typeof messageData.messageId !== "string" ||
    messageData.messageId.length === 0 ||
    typeof messageData.emoji !== "string" ||
    messageData.emoji.length === 0 ||
    messageData.emoji.length > MAX_EMOJI_LENGTH
  ) {
    return;
  }

  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "reaction",
          messageId: messageData.messageId,
          emoji: messageData.emoji,
          sender: ws.username,
          remove: messageData.remove === true,
        })
      );
    }
  });
}

function handleEditMessage(messageData, ws) {
  if (
    typeof messageData.messageId !== "string" ||
    messageData.messageId.length === 0 ||
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
          type: "edit",
          messageId: messageData.messageId,
          content: messageData.content,
          sender: ws.username,
        })
      );
    }
  });
}

function handleDeleteMessage(messageData, ws) {
  if (typeof messageData.messageId !== "string" || messageData.messageId.length === 0) {
    return;
  }

  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "delete",
          messageId: messageData.messageId,
          sender: ws.username,
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
    return;
  }

  // Target has disconnected (closed tab, lost network, etc). For call
  // setup messages we need to actively tell the sender so they don't sit
  // on a "Connecting..." screen forever waiting for a reply that will
  // never come — non-critical messages (ICE candidates, restarts) are
  // just dropped since the call is already being torn down another way.
  if (messageData.type === "videoCallOffer" || messageData.type === "videoCallAnswer") {
    ws.send(JSON.stringify({ type: "callFailed" }));
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
