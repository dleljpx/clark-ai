import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, User, Settings, Trash2, X, MessageSquare } from "lucide-react";
import ThemeDialog from "./theme-dialog";
import ConversationMenu from "./conversation-menu";
import type { Conversation } from "@shared/schema";

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onCloseSidebar: () => void;
  isCreatingConversation: boolean;
  isMobile: boolean;
}

export default function ChatSidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onDeleteConversation,
  onCloseSidebar,
  isCreatingConversation,
  isMobile
}: ChatSidebarProps) {
  
  const formatTimestamp = (date: Date | null) => {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} days ago`;
    }
  };

  const handleConversationClick = (id: string) => {
    window.location.href = `/chat/${id}`;
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">CLARK 2</h1>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCloseSidebar}
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          onClick={onNewChat}
          disabled={isCreatingConversation}
          className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreatingConversation ? 'Creating...' : 'New Chat'}
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`
                  group p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors
                  ${currentConversationId === conversation.id ? 'border-l-2 border-primary bg-accent' : ''}
                `}
                onClick={() => handleConversationClick(conversation.id)}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {conversation.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(conversation.updatedAt || conversation.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ConversationMenu 
                      conversationId={conversation.id}
                      systemInstructions={conversation.systemInstructions}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      data-testid={`button-delete-conversation-${conversation.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">User</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <ThemeDialog />
        </div>
      </div>
    </>
  );
}
