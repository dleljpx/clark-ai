import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatMessages from "@/components/chat/chat-messages";
import ChatInput from "@/components/chat/chat-input";
import SystemInstructionsDialog from "@/components/chat/system-instructions-dialog";
import { Button } from "@/components/ui/button";
import { Menu, X, Bot, Share, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, ConversationWithMessages, Message } from "@shared/schema";

export default function ChatPage() {
  const { conversationId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations list
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Fetch current conversation with messages
  const { data: currentConversation, isLoading: isLoadingConversation } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title?: string) => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      window.location.href = `/chat/${newConversation.id}`;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (conversationId) {
        window.location.href = "/";
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  // Clear conversation messages mutation
  const clearConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}/messages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear conversation",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, imageData }: { conversationId: string; content: string; imageData?: { base64: string; mimeType: string } }) => {
      const payload: any = { content };
      if (imageData) {
        payload.imageBase64 = imageData.base64;
        payload.imageMimeType = imageData.mimeType;
      }
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleNewChat = () => {
    createConversationMutation.mutate("");
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversationMutation.mutate(id);
  };

  const handleClearChat = () => {
    if (conversationId) {
      clearConversationMutation.mutate(conversationId);
    }
  };

  const handleSendMessage = async (content: string, imageData?: { base64: string; mimeType: string }) => {
    if (!conversationId) {
      // Create new conversation first
      createConversationMutation.mutate("New Conversation");
      return;
    }

    sendMessageMutation.mutate({ conversationId, content, imageData });
  };

  const handleShareChat = () => {
    if (conversationId) {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Chat link copied to clipboard",
      });
    }
  };

  const handleExportChat = () => {
    if (currentConversation) {
      const chatData = {
        title: currentConversation.title,
        messages: currentConversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
        })),
      };
      
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentConversation.title.replace(/[^a-z0-9]/gi, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Close sidebar on mobile when conversation changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [conversationId, isMobile]);

  // Add keyboard shortcut for new chat (Ctrl+Alt+C)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key === 'c' && !event.shiftKey) {
        event.preventDefault();
        handleNewChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const messages = currentConversation?.messages || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`
        w-80 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out
        ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        ${isMobile ? "fixed z-30 h-full" : "relative"}
      `}>
        <ChatSidebar
          conversations={conversations}
          currentConversationId={conversationId}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onCloseSidebar={() => setSidebarOpen(false)}
          isCreatingConversation={createConversationMutation.isPending}
          isMobile={isMobile}
        />
      </div>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-open-sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">CLARK 2</h2>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <SystemInstructionsDialog conversationId={conversationId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={!conversationId || messages.length === 0 || clearConversationMutation.isPending}
              title="Clear Chat"
              data-testid="button-clear-chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareChat}
              disabled={!conversationId}
              title="Share Chat"
              data-testid="button-share-chat"
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportChat}
              disabled={!conversationId || messages.length === 0}
              title="Export Chat"
              data-testid="button-export-chat"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoadingConversation}
          isGenerating={sendMessageMutation.isPending}
          conversationTitle={currentConversation?.title}
        />

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          isGenerating={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
