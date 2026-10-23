import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type ConversationWithMessages } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

 
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsForUser(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: string, title: string): Promise<void>;
  updateConversationSystemInstructions(id: string, instructions: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;


  getMessagesForConversation(conversationId: string): Promise<Message[]>;
  getConversationWithMessages(conversationId: string): Promise<ConversationWithMessages | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesForConversation(conversationId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();

    
    const defaultUser: User = {
      id: "default-user",
      username: "demo",
      password: "demo",
      name: "Demo User",
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => conversation.userId === userId)
      .sort((a, b) => (b.updatedAt || b.createdAt)!.getTime() - (a.updatedAt || a.createdAt)!.getTime());
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      this.conversations.set(id, conversation);
    }
  }

  async updateConversationSystemInstructions(id: string, instructions: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.systemInstructions = instructions;
      conversation.updatedAt = new Date();
      this.conversations.set(id, conversation);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
   
    await this.deleteMessagesForConversation(id);
  }

  async getMessagesForConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async getConversationWithMessages(conversationId: string): Promise<ConversationWithMessages | undefined> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return undefined;

    const messages = await this.getMessagesForConversation(conversationId);
    return {
      ...conversation,
      messages,
    };
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      imageUrl: insertMessage.imageUrl || null,
      imageText: insertMessage.imageText || null,
    };
    this.messages.set(id, message);

    
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }

    return message;
  }

  async deleteMessagesForConversation(conversationId: string): Promise<void> {
    const messagesToDelete = Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId);
    
    messagesToDelete.forEach(message => {
      this.messages.delete(message.id);
    });
  }
}

export const storage = new MemStorage();
