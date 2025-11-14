import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Settings, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SystemInstructionsDialogProps {
  className?: string;
  conversationId?: string;
}

export default function SystemInstructionsDialog({ className, conversationId }: SystemInstructionsDialogProps) {
  const [instructions, setInstructions] = useState("");
  const [originalInstructions, setOriginalInstructions] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const defaultInstructions = "You are CLARK AI, a helpful and intelligent assistant. You provide accurate, helpful responses while being friendly and professional. You can help with a wide variety of tasks including answering questions, creative writing, analysis, and more. Your creator is Lex Montes. Your responses must have a maximum of 650 characters.";

  const loadInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/system-instructions");
      const data = await response.json();
      setInstructions(data.instructions);
      setOriginalInstructions(data.instructions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load system instructions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveInstructions = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/system-instructions", {
        instructions: instructions.trim()
      });
      
      if (response.ok) {
        const data = await response.json();
        setOriginalInstructions(data.instructions);
        toast({
          title: "Success",
          description: "System instructions updated successfully",
        });
        setIsOpen(false);
      } else {
        throw new Error("Failed to save instructions");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save system instructions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setInstructions(defaultInstructions);
  };

  const hasChanges = instructions !== originalInstructions;

  useEffect(() => {
    if (isOpen) {
      loadInstructions();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Prevent any potential navigation when closing
        setTimeout(() => setIsOpen(false), 0);
      } else {
        setIsOpen(open);
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          title="System Instructions"
          data-testid="button-system-instructions"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>System Instructions</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Customize how CLARK AI behaves and responds. These instructions guide the AI's personality, expertise, and response style.
          </p>
        </DialogHeader>
        
        <div className="flex-1 space-y-4">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter system instructions for CLARK AI..."
            className="min-h-[300px] resize-none"
            disabled={isLoading || isSaving}
            data-testid="textarea-system-instructions"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{instructions.length} characters</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              disabled={isLoading || isSaving}
              className="h-auto p-1 text-xs"
              data-testid="button-reset-default"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset to default
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
            disabled={isSaving}
            data-testid="button-cancel-instructions"
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveInstructions();
            }}
            disabled={!hasChanges || isLoading || isSaving}
            data-testid="button-save-instructions"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Instructions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}