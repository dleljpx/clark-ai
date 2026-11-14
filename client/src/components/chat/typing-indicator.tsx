export default function TypingIndicator({ isThinkingHarder = false }: { isThinkingHarder?: boolean }) {
  return (
    <div className="flex justify-start message-fade-in" data-testid="typing-indicator">
      <div className="max-w-xs md:max-w-md lg:max-w-lg">
        <div className="bg-card p-3 rounded-2xl rounded-bl-md">
          <div className="flex items-center gap-1.5 text-muted-foreground" aria-label={isThinkingHarder ? "Thinking harder" : "Thinking"}>
            <span className="sr-only">{isThinkingHarder ? "Thinking harder..." : "Thinking..."}</span>
            <span aria-hidden="true">{isThinkingHarder ? "Thinking harder" : "Thinking"}</span>
            <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
