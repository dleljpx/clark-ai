import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex justify-start message-fade-in" data-testid="typing-indicator">
      <div className="max-w-xs md:max-w-md lg:max-w-lg">
        <div className="bg-card border border-border p-3 rounded-2xl rounded-bl-md">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="typing-dots">AI is typing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
