import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateChatResponse, generateConversationTitle, extractTitleFromResponse, setSystemInstructions, getSystemInstructions } from "./services/openrouter";
import { getRecentLogs } from "./vite";

const ADMIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
let adminLoginFailures = { count: 0, resetAt: 0 };

function sendRouteError(res: import("express").Response, code: string, error: unknown) {
  console.error(`[${code}]`, error);
  return res.status(500).json({ error: code });
}

function passwordMatches(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) {
    timingSafeEqual(expectedBytes, expectedBytes);
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

function createAdminToken(secret: string) {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function getValidAdminToken(authorization: string | undefined, secret: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return undefined;
  if (!secret) return undefined;

  const [payload, signature, extra] = authorization.slice(7).split(".");
  if (!payload || !signature || extra) return undefined;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const providedSignature = Buffer.from(signature, "base64url");
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    return undefined;
  }

  try {
    const tokenData = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof tokenData.expiresAt !== "number" || tokenData.expiresAt <= Date.now()) return undefined;
    return tokenData;
  } catch {
    return undefined;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/admin/access", (req, res) => {
    const expectedPassword = process.env.ADMIN_PANEL_PASSWORD;
    if (!expectedPassword) {
      return res.status(503).json({ error: "Admin panel is not configured. Set ADMIN_PANEL_PASSWORD in Galaxy." });
    }

    const now = Date.now();
    if (now >= adminLoginFailures.resetAt) adminLoginFailures = { count: 0, resetAt: now + ADMIN_LOGIN_WINDOW_MS };
    if (adminLoginFailures.count >= MAX_ADMIN_LOGIN_ATTEMPTS) {
      return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    }

    const providedPassword = typeof req.body?.password === "string" ? req.body.password : "";
    if (providedPassword.length > 256 || !passwordMatches(providedPassword, expectedPassword)) {
      adminLoginFailures.count += 1;
      return res.status(401).json({ error: "Incorrect admin password." });
    }

    adminLoginFailures = { count: 0, resetAt: 0 };
    const token = createAdminToken(expectedPassword);
    res.json({ token, expiresInSeconds: ADMIN_TOKEN_TTL_MS / 1000 });
  });

  app.get("/api/admin/logs", (req, res) => {
    if (!getValidAdminToken(req.get("authorization"), process.env.ADMIN_PANEL_PASSWORD)) {
      return res.status(401).json({ error: "Admin access expired. Authenticate again." });
    }
    res.json({ status: "running", uptimeSeconds: Math.floor(process.uptime()), logs: getRecentLogs() });
  });

  // Get conversations for current user
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = "default-user"; // In a real app, get from session/auth
      const conversations = await storage.getConversationsForUser(userId);
      res.json(conversations);
    } catch (error) {
      sendRouteError(res, "CONVERSATIONS_FETCH_FAILED", error);
    }
  });

  // Get conversation with messages
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversationWithMessages(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      sendRouteError(res, "CONVERSATION_FETCH_FAILED", error);
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const userId = "default-user"; // In a real app, get from session/auth
      const { title } = req.body;
      
      const conversationData = insertConversationSchema.parse({
        userId,
        title: title || "New Conversation",
        systemInstructions: getSystemInstructions()
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      sendRouteError(res, "CONVERSATION_CREATE_FAILED", error);
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      sendRouteError(res, "CONVERSATION_DELETE_FAILED", error);
    }
  });

  // Send message and get AI response
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { content, imageBase64, imageMimeType } = req.body;
      const mode = req.body.mode === "chat" ? "chat" : "work";
      const userName = typeof req.body.userName === "string" ? req.body.userName.trim().slice(0, 80) : "";
      const feedback = req.body.feedback === "liked" || req.body.feedback === "disliked" ? req.body.feedback : null;

      // Validate request
      if (!content?.trim() && !imageBase64) {
        return res.status(400).json({ error: "Message content or image is required" });
      }

      // Handle image messages
      const submittedContent = typeof content === "string" ? content.trim() : "";
      const feedbackPrefix = feedback ? `I ${feedback} that message. ` : "";
      const aiPrompt = `${feedbackPrefix}${submittedContent || (imageBase64 ? "What do you see in this image?" : "")}`.trim();
      let finalContent = submittedContent;
      let imageText = null;
      let imageUrl = null;

      if (imageBase64) {
        // Validate image
        if (!imageMimeType) {
          return res.status(400).json({ error: "Image MIME type is required" });
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(imageMimeType)) {
          return res.status(400).json({ error: "Unsupported image type. Please use JPEG, PNG, or WebP." });
        }

        // Check image size (base64 is ~33% larger than binary)
        const imageSizeBytes = (imageBase64.length * 3) / 4;
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (imageSizeBytes > maxSizeBytes) {
          return res.status(400).json({ error: "Image too large. Please use an image under 5MB." });
        }

        // Store the image with correct MIME type
        imageUrl = `data:${imageMimeType};base64,${imageBase64}`;
      }

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Build context without persisting the pending user message.
      const messages = await storage.getMessagesForConversation(conversationId);
      const chatHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      chatHistory.push({ role: 'user', content: aiPrompt });

      let userMessageId: string | undefined;
      try {
        // Check if this is the first message in the conversation
        const isFirstMessage = messages.length === 0;
        
        // Generate AI response using conversation-specific system instructions
        const imageData = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType! } : undefined;
        const aiResponse = await generateChatResponse(chatHistory, isFirstMessage, conversation.systemInstructions, imageData, mode, userName);
        
        let finalAiResponse = aiResponse;
        
        // If this is the first message, extract title from response
        if (isFirstMessage) {
          const { title, cleanedResponse } = extractTitleFromResponse(aiResponse);
          finalAiResponse = cleanedResponse;
          
          if (title) {
            try {
              await storage.updateConversationTitle(conversationId, title);
            } catch (titleError) {
              console.error("[CONVERSATION_TITLE_UPDATE_FAILED]", titleError);
            }
          } else {
            // Fallback to old method if no title was found in response
            try {
              const fallbackTitle = await generateConversationTitle(aiPrompt, mode);
              await storage.updateConversationTitle(conversationId, fallbackTitle);
            } catch (titleError) {
              console.error("[CONVERSATION_TITLE_GENERATION_FAILED]", titleError);
            }
          }
        }

        // Persist the user and AI messages only after generation succeeds.
        const userMessageData = insertMessageSchema.parse({
          conversationId,
          role: "user",
          content: finalContent.trim(),
          imageUrl,
          imageText,
        });
        const userMessage = await storage.createMessage(userMessageData);
        userMessageId = userMessage.id;

        // Save AI message with cleaned content
        const aiMessageData = insertMessageSchema.parse({
          conversationId,
          role: "assistant",
          content: finalAiResponse
        });

        const aiMessage = await storage.createMessage(aiMessageData);

        res.json({
          userMessage,
          aiMessage
        });

      } catch (aiError: any) {
        console.error("[CHAT_SEND_FAILED] AI response generation failed:", aiError);
        if (userMessageId) {
          try {
            await storage.deleteMessage(userMessageId);
          } catch (rollbackError) {
            console.error("[CHAT_SEND_FAILED] Could not remove failed user message:", rollbackError);
          }
        }
        res.status(500).json({ error: "CHAT_SEND_FAILED" });
      }

    } catch (error) {
      sendRouteError(res, "CHAT_SEND_FAILED", error);
    }
  });

  // Clear conversation messages
  app.delete("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMessagesForConversation(id);
      res.status(204).send();
    } catch (error) {
      sendRouteError(res, "CONVERSATION_CLEAR_FAILED", error);
    }
  });

  // Get current system instructions
  app.get("/api/system-instructions", async (req, res) => {
    try {
      const instructions = getSystemInstructions();
      res.json({ instructions });
    } catch (error) {
      sendRouteError(res, "SYSTEM_INSTRUCTIONS_FETCH_FAILED", error);
    }
  });

  // Update system instructions
  app.post("/api/system-instructions", async (req, res) => {
    try {
      const { instructions } = req.body;
      
      if (typeof instructions !== 'string') {
        return res.status(400).json({ error: "Instructions must be a string" });
      }
      
      setSystemInstructions(instructions);
      res.json({ success: true, instructions: getSystemInstructions() });
    } catch (error) {
      sendRouteError(res, "SYSTEM_INSTRUCTIONS_UPDATE_FAILED", error);
    }
  });

  // Update conversation system instructions
  app.post("/api/conversations/:id/system-instructions", async (req, res) => {
    try {
      const { id } = req.params;
      const { instructions } = req.body;
      
      if (typeof instructions !== 'string') {
        return res.status(400).json({ error: "Instructions must be a string" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await storage.updateConversationSystemInstructions(id, instructions);
      res.json({ success: true, instructions });
    } catch (error) {
      sendRouteError(res, "CONVERSATION_INSTRUCTIONS_UPDATE_FAILED", error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
