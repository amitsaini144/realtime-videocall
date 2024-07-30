import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import "dotenv/config";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import url from "url";
import cors from "cors";

const app = express();
app.use(cors());
const port = process.env.PORT || 8080;
const httpServer = app.listen(port);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const wss = new WebSocketServer({ server: httpServer });
let users = new Map();
let activeVideoCalls = new Map();

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
        handleVideoCallOffer(messageData, ws);
        break;
      case "videoCallAnswer":
        handleVideoCallAnswer(messageData, ws);
        break;
      case "iceCandidate":
        handleIceCandidate(messageData, ws);
        break;
    }
  });

  ws.on("close", function () {
    users.delete(userId);
    handleEndCall(
      {
        to: Array.from(activeVideoCalls.keys()).find(
          (callerId) => callerId === userId
        ),
      },
      user
    );
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

function handleVideoCallOffer(messageData, ws) {
  const targetUser = users.get(messageData.to);
  if (targetUser && targetUser.readyState === WebSocket.OPEN) {
    if (activeVideoCalls.has(ws.id) || activeVideoCalls.has(messageData.to)) {
      ws.send(JSON.stringify({ type: "callBusy" }));
      return;
    }
    activeVideoCalls.set(ws.userId, messageData.to);
    targetUser.send(
      JSON.stringify({
        type: "videoCallOffer",
        offer: messageData.offer,
        from: ws.userId,
      })
    );
  }
}

function handleVideoCallAnswer(messageData, ws) {
  const targetUser = users.get(messageData.to);
  if (targetUser && targetUser.readyState === WebSocket.OPEN) {
    targetUser.send(
      JSON.stringify({
        type: "videoCallAnswer",
        answer: messageData.answer,
        from: ws.userId,
      })
    );
  }
}

function handleIceCandidate(messageData, ws) {
  const targetUser = users.get(messageData.to);
  if (targetUser && targetUser.readyState === WebSocket.OPEN) {
    targetUser.send(
      JSON.stringify({
        type: "iceCandidate",
        candidate: messageData.candidate,
        from: ws.userId,
      })
    );
  }
}

function handleEndCall(messageData, user) {
  const targetUserId = activeVideoCalls.get(user.id);
  if (targetUserId) {
    const targetUser = users.get(targetUserId);
    if (targetUser && targetUser.readyState === WebSocket.OPEN) {
      targetUser.send(JSON.stringify({ type: "endCall", from: user.id }));
    }
    activeVideoCalls.delete(user.id);
    activeVideoCalls.delete(targetUserId);
  }
}

function broadcastUserList() {
  const userList = Array.from(users.entries()).map(([id, ws]) => ({
    id,
    username: ws.username,
    inCall: activeVideoCalls.has(id),
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
