import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./message-bubble";
import TypingIndicator from "./typing-indicator";
import clarkLogo from "./clark-logo.svg";
import type { Message } from "@shared/schema";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isGenerating: boolean;
  isThinkingHarder: boolean;
  conversationTitle?: string;
  onMessageFeedback: (
    messageId: string,
    conversationId: string,
    role: "user" | "assistant",
    feedback: "liked" | "disliked" | "cleared"
  ) => void;
}

export default function ChatMessages({ 
  messages, 
  isLoading, 
  isGenerating,
  isThinkingHarder,
  conversationTitle,
  onMessageFeedback
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
          <img src={clarkLogo} alt="CLARK" className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-background" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {messages.length === 0 ? (
          <>
            <div className="flex justify-center py-12">
              <div className="text-center max-w-md">
                <img src={clarkLogo} alt="CLARK" className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Welcome to CLARK AI
                </h3>
                <p className="text-muted-foreground text-sm">
                  Hello I'm CLARK! Your personal helper friend.
                  Ask me anything!
                </p>
              </div>
            </div>
            {isGenerating && <TypingIndicator isThinkingHarder={isThinkingHarder} />}
          </>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedbackChange={onMessageFeedback}
              />
            ))}
            
            {isGenerating && <TypingIndicator isThinkingHarder={isThinkingHarder} />}
          </>
        )}
        
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
