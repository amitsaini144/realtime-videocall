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

wss.on("connection", async function connection(ws, req) {
  const parameters = url.parse(req.url, true);
  const token = parameters.query.token;

  if (!token) {
    ws.close(1008, "Token required");
    return;
  }

  let user;
  try {
    // Verify the token and get the user
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

  // Send user's own data
  ws.send(
    JSON.stringify({
      type: "userData",
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.emailAddresses[0].emailAddress,
      },
    })
  );

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    const messageData = JSON.parse(data);
    if (messageData.type === "message") {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "message",
              content: `${user.username}: ${messageData.content}`,
            })
          );
        }
      });
    } else if (messageData.type === "ping") {
      const targetUser = users.get(messageData.to);
      if (targetUser && targetUser.readyState === WebSocket.OPEN) {
        targetUser.send(
          JSON.stringify({
            type: "ping",
            content: `${user.username} pinged you!`,
          })
        );
      }
    } else if (messageData.type === "pingAll") {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN && client.userId !== userId) {
          client.send(
            JSON.stringify({
              type: "pingAll",
              content: `${user.username} pinged everyone!`,
            })
          );
        }
      });
    }
  });

  ws.on("close", function () {
    users.delete(userId);
    broadcastUserList();
  });

  broadcastUserList();
});

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
