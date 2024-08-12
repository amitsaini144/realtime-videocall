import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import "dotenv/config";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import url from "url";
import cors from "cors";

const app = express();
app.use(cors());
const port = process.env.NEXT_PUBLIC_PORT || 8080;
const httpServer = app.listen(port);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const wss = new WebSocketServer({ server: httpServer });
let users = new Map();

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
  users.set(userId, ws);
  ws.userId = userId;
  ws.username = user.username;

  ws.send(
    JSON.stringify({
      type: "userData",
      user: {
        id: user.id,
        username: user.username,
      },
    })
  );

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    const messageData = JSON.parse(data);

    switch (messageData.type) {
      case "message":
        handleChatMessage(messageData, user);
        break;
      case "videoCallOffer":
      case "videoCallAnswer":
      case "iceCandidate":
        forwardMessage(messageData, ws);
        break;
      case "endCall":
        handleEndCall(messageData, ws);
        break;
    }
  });

  ws.on("close", function () {
    users.delete(userId);
    broadcastUserList();
  });

  broadcastUserList();
});

function handleChatMessage(messageData, user) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "message",
          content: messageData.content,
          sender: user.username,
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
