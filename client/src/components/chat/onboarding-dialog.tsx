import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  ImagePlus,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
  initialName: string;
  isMobile: boolean;
  onMobileSidebarChange: (open: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onComplete: (name: string) => void;
}

const tutorialSteps = [
  {
    title: "Your conversations",
    description: "Choose New Chat to start fresh. Your existing conversations appear in the sidebar; select one to reopen it.",
    icon: MessageSquare,
    target: "new-chat",
    area: "sidebar",
  },
  {
    title: "Manage conversations",
    description: "Open a conversation's menu to view or update its system instructions. The trash icon beside it deletes that conversation.",
    icon: MessageSquare,
    target: "conversation-list",
    area: "sidebar",
  },
  {
    title: "Choose your theme",
    description: "Use this control to switch between light and dark appearance.",
    icon: Settings,
    target: "theme-settings",
    area: "sidebar",
  },
  {
    title: "Set assistant behavior",
    description: "Open system instructions to customize how CLARK responds. You can set general instructions or instructions for this conversation.",
    icon: Settings,
    target: "system-instructions",
    area: "chat",
  },
  {
    title: "Manage this chat",
    description: "These controls clear the current conversation, copy its share link, and download its messages as a JSON file.",
    icon: MessageSquare,
    target: "chat-actions",
    area: "chat",
  },
  {
    title: "Choose a mode",
    description: "Chat is for everyday conversations. Work is for more focused tasks and projects. Your choice is saved on this device.",
    icon: MessageSquare,
    target: "chat-mode",
    area: "chat",
  },
  {
    title: "Attach an image",
    description: "Choose an image to attach it to your message. You can also paste an image directly into the message field.",
    icon: ImagePlus,
    target: "image-upload",
    area: "chat",
  },
  {
    title: "Write a message",
    description: "Type here and press Enter to send. Press Shift+Enter to add a new line.",
    icon: MessageSquare,
    target: "message-input",
    area: "chat",
  },
];

export default function OnboardingDialog({
  open,
  initialName,
  isMobile,
  onMobileSidebarChange,
  onOpenChange,
  onComplete,
}: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isNameStep = step === tutorialSteps.length;
  const currentStep = tutorialSteps[step];
  const StepIcon = isNameStep ? UserRound : currentStep.icon;
  const totalSteps = tutorialSteps.length + 1;

  useEffect(() => {
    if (!open) {
      onMobileSidebarChange(false);
      return;
    }

    setStep(0);
    setName(initialName);
  }, [open, initialName, onMobileSidebarChange]);

  useEffect(() => {
    if (!open || isNameStep) {
      setTargetRect(null);
      onMobileSidebarChange(false);
      return;
    }

    onMobileSidebarChange(isMobile && currentStep.area === "sidebar");
    setTargetRect(null);

    const updateTarget = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${currentStep.target}"]`);
      if (!target) return;
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      window.setTimeout(() => setTargetRect(target.getBoundingClientRect()), isMobile ? 350 : 50);
    };

    const timeout = window.setTimeout(updateTarget, 50);
    return () => window.clearTimeout(timeout);
  }, [open, isNameStep, currentStep, isMobile, onMobileSidebarChange]);

  useEffect(() => {
    if (open && isNameStep) nameInputRef.current?.focus();
  }, [open, isNameStep]);

  const finish = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onComplete(trimmedName);
    }
  };

  if (!open) return null;

  const hole = targetRect
    ? {
        top: Math.max(0, targetRect.top - 8),
        left: Math.max(0, targetRect.left - 8),
        right: Math.min(window.innerWidth, targetRect.right + 8),
        bottom: Math.min(window.innerHeight, targetRect.bottom + 8),
      }
    : null;
  const tooltipWidth = Math.min(360, window.innerWidth - 24);
  const tooltipLeft = hole
    ? Math.max(12, Math.min(hole.left + (hole.right - hole.left) / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12))
    : Math.max(12, (window.innerWidth - tooltipWidth) / 2);
  const tooltipTop = hole && hole.bottom + 230 < window.innerHeight
    ? hole.bottom + 16
    : hole && hole.top > 240
      ? Math.max(12, hole.top - 230)
      : Math.max(12, (window.innerHeight - 300) / 2);

  const goToStep = (nextStep: number) => setStep(Math.max(0, Math.min(totalSteps - 1, nextStep)));

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      {hole ? (
        <>
          <div className="fixed left-0 top-0 w-full bg-black/75" style={{ height: hole.top }} />
          <div className="fixed left-0 bg-black/75" style={{ top: hole.top, width: hole.left, height: hole.bottom - hole.top }} />
          <div className="fixed right-0 bg-black/75" style={{ top: hole.top, left: hole.right, height: hole.bottom - hole.top }} />
          <div className="fixed bottom-0 left-0 w-full bg-black/75" style={{ top: hole.bottom }} />
          <div
            className="pointer-events-none fixed rounded-md border-2 border-primary shadow-[0_0_24px_rgba(80,170,255,0.65)]"
            style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/75" />
      )}

      <section
        className="fixed z-[61] max-h-[75vh] overflow-y-auto rounded-lg border bg-card p-5 text-card-foreground shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close tutorial"
          title="Close tutorial"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-center gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <StepIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-primary">Step {step + 1} of {totalSteps}</p>
            <h2 id="tutorial-title" className="text-lg font-semibold">
              {isNameStep ? "What should we call you?" : currentStep.title}
            </h2>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {isNameStep
            ? "Your name will appear in the sidebar."
            : currentStep.description}
        </p>

        {isNameStep ? (
          <Input
            ref={nameInputRef}
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
          <div className="mb-5 flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: totalSteps }, (_, index) => (
              <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(step - 1)} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {!isNameStep ? (
            <Button type="button" size="sm" onClick={() => goToStep(step + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={finish} disabled={!name.trim()} data-testid="button-finish-onboarding">
              Finish <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}