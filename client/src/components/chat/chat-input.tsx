import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Lightbulb, Code, Brain, FileText, Image, X, MessageSquare, Briefcase, ChevronDown, Check } from "lucide-react";

export type ChatMode = "chat" | "work";

interface ChatInputProps {
  onSendMessage: (message: string, imageData?: { base64: string; mimeType: string }, mode?: ChatMode) => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled: boolean;
  isGenerating: boolean;
}

export default function ChatInput({ onSendMessage, mode, onModeChange, disabled, isGenerating }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showCharCount, setShowCharCount] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 6700;
  const isOverLimit = message.length > maxLength;
  const canSend = (message.trim().length > 0 || selectedImage) && !disabled && !isOverLimit;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }
  }, [message]);

  useEffect(() => {
    setShowCharCount(message.length > maxLength * 0.8);
  }, [message]);

  useEffect(() => {
    const focusComposerOnCharacter = (event: KeyboardEvent) => {
      if (disabled || modeMenuOpen || event.defaultPrevented || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (event.target instanceof HTMLElement && (
        event.target.isContentEditable ||
        event.target.closest("input, textarea, select, [role='menuitem']")
      )) return;
      if (document.activeElement === textareaRef.current) return;

      event.preventDefault();
      setMessage((current) => current + event.key);
      textareaRef.current?.focus();
    };

    document.addEventListener("keydown", focusComposerOnCharacter);
    return () => document.removeEventListener("keydown", focusComposerOnCharacter);
  }, [disabled, modeMenuOpen]);

  const processImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image too large. Please select an image under 5MB.");
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      setSelectedImage({ base64: base64Data, mimeType: file.type });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          event.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
          }
          break;
        }
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      onSendMessage(message.trim(), selectedImage || undefined, mode);
      setMessage("");
      removeImage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    {
      icon: Lightbulb,
      label: "Explain this concept",
      prompt: "Can you explain a concept to me?",
    },
    {
      icon: Code,
      label: "Help me code",
      prompt: "I need help with coding. Can you assist me?",
    },
    {
      icon: Brain,
      label: "Brainstorm ideas",
      prompt: "Let's brainstorm some ideas together!",
    },
    {
      icon: FileText,
      label: "Summarize text",
      prompt: "Can you help me summarize some text?",
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-card border-t border-border p-4">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img 
            src={imagePreview} 
            alt="Selected" 
            className="max-w-32 max-h-32 rounded-lg border"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-destructive text-destructive-foreground rounded-full"
            onClick={removeImage}
            data-testid="button-remove-image"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2" data-tour="quick-actions">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={disabled}
              data-testid={`button-quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          data-testid="input-file"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Upload image"
          data-tour="image-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          data-testid="button-upload-image"
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type your message here..."
            className="min-h-[40px] max-h-32 resize-none pr-12"
            disabled={disabled}
            data-tour="message-input"
            data-testid="input-message"
          />
          
          {showCharCount && (
            <div className={`absolute -bottom-5 right-0 text-xs ${
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <span data-testid="text-char-count">{message.length}</span>/{maxLength}
            </div>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={!canSend}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      
      <div className="mt-2 flex items-center justify-between gap-3">
        <Popover open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1.5 px-2.5"
              title="Choose chat mode"
              aria-label={`Current mode: ${mode === "chat" ? "Chat" : "Work"}`}
              data-tour="chat-mode"
              data-testid="button-chat-mode"
            >
              {mode === "chat" ? <MessageSquare className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
              {mode === "chat" ? "Chat" : "Work"}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" sideOffset={8} className="w-40 p-1">
            {([
              { value: "chat" as const, label: "Chat", tooltip: "For everyday conversations", icon: MessageSquare },
              { value: "work" as const, label: "Work", tooltip: "For focused tasks and projects", icon: Briefcase },
            ]).map((option) => {
              const Icon = option.icon;
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onModeChange(option.value);
                    setModeMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent ${selected ? "bg-accent/70" : ""}`}
                  aria-pressed={selected}
                  title={option.tooltip}
                  data-testid={`button-mode-${option.value}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">AI can make mistakes. Check important information.</p>
      </div>
    </div>
  );
}
