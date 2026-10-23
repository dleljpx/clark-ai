import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import MessageBubble from "./message-bubble";
import TypingIndicator from "./typing-indicator";
import type { Message } from "@shared/schema";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isGenerating: boolean;
  conversationTitle?: string;
}

export default function ChatMessages({ 
  messages, 
  isLoading, 
  isGenerating,
  conversationTitle 
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Bot className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-background" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to CLARK AI
              </h3>
              <p className="text-muted-foreground text-sm">
                I'm CLARK AI, your intelligent assistant ready to help with questions, coding, creative tasks, and more. 
                How can I assist you today?
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}
            
            {isGenerating && <TypingIndicator />}
          </>
        )}
        
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
