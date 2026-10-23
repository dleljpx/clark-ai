import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (name: string) => void;
}

const tutorialSteps = [
  {
    title: "Your conversations",
    description: "Start fresh with New Chat, or select a conversation to reopen it. On a phone, use the menu button to open the sidebar. Each conversation's menu manages its instructions; the trash button deletes it. The bottom-right control changes the theme.",
    icon: MessageSquare,
  },
  {
    title: "Chat controls",
    description: "The gear button opens system instructions. The trash button clears the current chat, the share button copies its link, and the download button exports it as a JSON file.",
    icon: Settings,
  },
  {
    title: "Write and send",
    description: "Type a message and press Enter to send; use Shift+Enter for a new line. Attach an image with the image button or paste one into the input. Quick-action buttons can fill in a starter prompt.",
    icon: ImagePlus,
  },
];

export default function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const isNameStep = step === tutorialSteps.length;
  const currentStep = tutorialSteps[step];
  const StepIcon = isNameStep ? UserRound : currentStep.icon;

  const finish = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onComplete(trimmedName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <StepIcon className="h-5 w-5" />
          </div>
          <DialogTitle>{isNameStep ? "What should we call you?" : currentStep.title}</DialogTitle>
          <DialogDescription>
            {isNameStep
              ? "Your name will appear in the sidebar on this device."
              : currentStep.description}
          </DialogDescription>
        </DialogHeader>

        {isNameStep ? (
          <Input
            autoFocus
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") finish();
            }}
            placeholder="Your name"
            aria-label="Your name"
            data-testid="input-onboarding-name"
          />
        ) : (
          <div className="flex items-center gap-1" aria-label={`Step ${step + 1} of ${tutorialSteps.length + 1}`}>
            {Array.from({ length: tutorialSteps.length + 1 }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {isNameStep ? (
            <Button type="button" onClick={finish} disabled={!name.trim()} data-testid="button-finish-onboarding">
              Finish
              <Check className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((current) => current + 1)}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}