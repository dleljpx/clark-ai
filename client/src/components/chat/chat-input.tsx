import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Image, X, MessageSquare, Briefcase, ChevronDown, Check } from "lucide-react";
import type { InterfaceMode } from "./theme-dialog";

export type ChatMode = "chat" | "work";

interface ChatInputProps {
  onSendMessage: (message: string, imageData?: { base64: string; mimeType: string }, mode?: ChatMode) => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled: boolean;
  isGenerating: boolean;
  interfaceMode: InterfaceMode;
}

export default function ChatInput({ onSendMessage, mode, onModeChange, disabled, interfaceMode }: ChatInputProps) {
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
    const isTextShortcut = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return false;

      const key = event.key.toLowerCase();
      const textEditingShortcuts = new Set([
        'a', 'c', 'v', 'x', 'z', 'y',
        'backspace', 'delete',
        'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end',
        'pageup', 'pagedown', 'tab'
      ]);

      if (event.key === 'Tab' || event.key === 'Tab') return true;
      return textEditingShortcuts.has(key);
    };

    const routeShortcutToComposer = (event: KeyboardEvent) => {
      if (disabled || modeMenuOpen || event.defaultPrevented) return false;

      const activeElement = document.activeElement as HTMLElement | null;
      const isEditableTarget = !!(event.target instanceof HTMLElement && (
        event.target.isContentEditable ||
        event.target.closest("input, textarea, select, [role='menuitem'], [role='button']")
      ));

      if (isEditableTarget || activeElement === textareaRef.current) return false;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return false;

      if (!(event.ctrlKey || event.metaKey)) return false;
      if (event.altKey) return false;

      const key = event.key.toLowerCase();
      const browserOnlyShortcuts = new Set(['t', 'n', 'w', 'r', 'l', 'h', 'q', 'p']);
      if (browserOnlyShortcuts.has(key)) return false;

      if (!isTextShortcut(event)) return false;

      event.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return true;

      textarea.focus();
      if (key === 'a') {
        textarea.select();
        return true;
      }

      textarea.dispatchEvent(new KeyboardEvent(event.type, {
        key: event.key,
        code: event.code,
        location: event.location,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        bubbles: true,
        cancelable: true,
        repeat: event.repeat,
      }));

      return true;
    };

    const focusComposerOnCharacter = (event: KeyboardEvent) => {
      if (routeShortcutToComposer(event)) return;

      if (disabled || modeMenuOpen || event.defaultPrevented) return;

      const activeElement = document.activeElement as HTMLElement | null;
      const isEditableTarget = !!(event.target instanceof HTMLElement && (
        event.target.isContentEditable ||
        event.target.closest("input, textarea, select, [role='menuitem'], [role='button']")
      ));

      if (isEditableTarget || activeElement === textareaRef.current) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;

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

  return (
    <div className={`bg-card p-4 ${interfaceMode === "plain" ? "plain-mode-composer bg-background pl-16" : ""}`}>
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img 
            src={imagePreview} 
            alt="Selected" 
            className="max-w-32 max-h-32 rounded-lg"
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

      {interfaceMode === "plain" && (
        <div className="mb-2 flex gap-1" role="group" aria-label="Chat mode">
          {([
            { value: "chat" as const, label: "Chat", icon: MessageSquare },
            { value: "work" as const, label: "Work", icon: Briefcase },
          ]).map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={mode === option.value ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => onModeChange(option.value)}
                aria-pressed={mode === option.value}
                data-testid={`button-plain-mode-${option.value}`}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />{option.label}
              </Button>
            );
          })}
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
      
      {interfaceMode !== "plain" && <div className="mt-2 flex items-center justify-between gap-3">
        <Popover open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
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
      </div>}
    </div>
  );
}
