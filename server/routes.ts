import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateChatResponse, generateConversationTitle, extractTitleFromResponse, setSystemInstructions, getSystemInstructions } from "./services/gemini";
import { extractTextFromImage } from "./services/vision";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get conversations for current user
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = "default-user"; // In a real app, get from session/auth
      const conversations = await storage.getConversationsForUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
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
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
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
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { content, imageBase64, imageMimeType } = req.body;

      // Validate request
      if (!content?.trim() && !imageBase64) {
        return res.status(400).json({ error: "Message content or image is required" });
      }

      // Handle image messages
      let finalContent = content || "";
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
        finalContent = content || "What do you see in this image?";
      }

      if (!finalContent || finalContent.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      const userMessageData = insertMessageSchema.parse({
        conversationId,
        role: "user",
        content: finalContent.trim(),
        imageUrl: imageUrl,
        imageText: imageText
      });

      const userMessage = await storage.createMessage(userMessageData);

      // Get conversation history for context
      const messages = await storage.getMessagesForConversation(conversationId);
      const chatHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      try {
        // Check if this is the first message in the conversation
        const isFirstMessage = messages.length === 1;
        
        // Generate AI response using conversation-specific system instructions
        const imageData = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType! } : undefined;
        const aiResponse = await generateChatResponse(chatHistory, isFirstMessage, conversation.systemInstructions, imageData);
        
        let finalAiResponse = aiResponse;
        
        // If this is the first message, extract title from response
        if (isFirstMessage) {
          const { title, cleanedResponse } = extractTitleFromResponse(aiResponse);
          finalAiResponse = cleanedResponse;
          
          if (title) {
            try {
              console.log("Extracted title from AI response:", title);
              await storage.updateConversationTitle(conversationId, title);
              console.log("Title updated successfully");
            } catch (titleError) {
              console.error("Error updating conversation title:", titleError);
              // Continue anyway, title update is not critical
            }
          } else {
            // Fallback to old method if no title was found in response
            try {
              console.log("No title found in response, generating fallback title");
              const fallbackTitle = await generateConversationTitle(content);
              console.log("Generated fallback title:", fallbackTitle);
              await storage.updateConversationTitle(conversationId, fallbackTitle);
            } catch (titleError) {
              console.error("Error generating fallback title:", titleError);
            }
          }
        }

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
        console.error("AI generation error:", aiError);
        const errorMessage = aiError.message || "Failed to generate AI response";
        
        // Check if it's an API key issue
        if (errorMessage.includes("API key") || errorMessage.includes("not configured")) {
          return res.status(503).json({ 
            error: errorMessage,
            hint: "Please configure your Gemini API key. Visit: https://aistudio.google.com/apikey",
            userMessage
          });
        }
        
        res.status(500).json({ 
          error: errorMessage,
          userMessage // Still return the user message even if AI fails
        });
      }

    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Clear conversation messages
  app.delete("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMessagesForConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing conversation:", error);
      res.status(500).json({ error: "Failed to clear conversation" });
    }
  });

  // Get current system instructions
  app.get("/api/system-instructions", async (req, res) => {
    try {
      const instructions = getSystemInstructions();
      res.json({ instructions });
    } catch (error) {
      console.error("Error getting system instructions:", error);
      res.status(500).json({ error: "Failed to get system instructions" });
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
      console.error("Error updating system instructions:", error);
      res.status(500).json({ error: "Failed to update system instructions" });
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
      console.error("Error updating conversation system instructions:", error);
      res.status(500).json({ error: "Failed to update conversation system instructions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
