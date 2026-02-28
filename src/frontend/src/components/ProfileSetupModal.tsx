import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useSaveProfile } from "../hooks/useQueries";

interface ProfileSetupModalProps {
  open: boolean;
  defaultUsername?: string | null;
}

export function ProfileSetupModal({
  open,
  defaultUsername,
}: ProfileSetupModalProps) {
  const [displayName, setDisplayName] = useState(defaultUsername ?? "");
  const [bio, setBio] = useState("");
  const prefilled = useRef(false);

  // Update display name when defaultUsername becomes available (async load)
  useEffect(() => {
    if (defaultUsername && !prefilled.current) {
      prefilled.current = true;
      setDisplayName(defaultUsername);
    }
  }, [defaultUsername]);
  const { mutateAsync: saveProfile, isPending } = useSaveProfile();
  const { actor } = useActor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Please enter your display name");
      return;
    }
    try {
      await saveProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        isProfessional: false,
      });
      // Mark account as verified for referral tracking (silently)
      try {
        if (actor) {
          await actor.markAccountVerified();
        }
      } catch {
        // Silently swallow — this should not block profile creation
      }
      toast.success("Profile created! Welcome to SocialSpace 🎉");
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.58 0.16 220))",
            }}
          >
            <span className="text-xl font-display font-bold text-white">S</span>
          </div>
          <DialogTitle className="text-center text-xl font-display">
            Set up your profile
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground font-body">
            Tell the community who you are
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-semibold">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="font-semibold">
              Bio{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell us a bit about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="rounded-xl resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold"
            disabled={isPending || !displayName.trim()}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating profile...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
