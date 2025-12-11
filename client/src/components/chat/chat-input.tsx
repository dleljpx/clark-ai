import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Lightbulb, Code, Brain, FileText, Image, X } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string, imageData?: { base64: string; mimeType: string }) => void;
  disabled: boolean;
  isGenerating: boolean;
}

export default function ChatInput({ onSendMessage, disabled, isGenerating }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showCharCount, setShowCharCount] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 6700;
  const isOverLimit = message.length > maxLength;
  const canSend = (message.trim().length > 0 || selectedImage) && !disabled && !isOverLimit;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }
  }, [message]);

  // Show character count when approaching limit
  useEffect(() => {
    setShowCharCount(message.length > maxLength * 0.8);
  }, [message]);

  const processImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image too large. Please select an image under 5MB.");
      return;
    }
    
    // Only allow specific image types
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
      onSendMessage(message.trim(), selectedImage || undefined);
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
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
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
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        AI can make mistakes. Check important information.
      </p>
    </div>
  );
}
