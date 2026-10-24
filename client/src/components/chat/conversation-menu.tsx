
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, FileText, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConversationMenuProps {
  conversationId: string;
  systemInstructions: string;
}

export default function ConversationMenu({ conversationId, systemInstructions }: ConversationMenuProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateConversationInstructions = async () => {
    setIsUpdating(true);
    try {
      // First get current system instructions
      const response = await apiRequest("GET", "/api/system-instructions");
      const data = await response.json();
      const currentInstructions = data.instructions;

      // Update conversation with current instructions
      const updateResponse = await apiRequest("POST", `/api/conversations/${conversationId}/system-instructions`, {
        instructions: currentInstructions
      });
      
      if (updateResponse.ok) {
        toast({
          title: "Success",
          description: "Conversation updated with current system instructions",
        });
        // Optionally refresh the conversation data
        window.location.reload();
      } else {
        throw new Error("Failed to update conversation instructions");
      }
    } catch (error) {
      console.error("[CONVERSATION_INSTRUCTIONS_UPDATE_FAILED]", error);
      toast({
        title: "Error",
        description: "There was an error [CONVERSATION_INSTRUCTIONS_UPDATE_FAILED].",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-accent ml-2"
            data-testid={`conversation-menu-${conversationId}`}
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setShowInstructions(true);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            System Instructions
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              updateConversationInstructions();
            }}
            disabled={isUpdating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isUpdating ? "Updating..." : "Update Instructions"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversation System Instructions</DialogTitle>
            <p className="text-sm text-muted-foreground">
              These are the system instructions that were active when this conversation was created.
            </p>
          </DialogHeader>
          
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Textarea
              value={systemInstructions}
              readOnly
              className="min-h-48 max-h-[50vh] resize-none bg-muted"
              data-testid="conversation-system-instructions"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
