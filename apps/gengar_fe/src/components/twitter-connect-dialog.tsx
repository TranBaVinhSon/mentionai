"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cleanTwitterUsername, isValidTwitterHandle, getValidationMessage } from "@/utils/validate-username";

interface TwitterConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (username: string) => Promise<void>;
}

export function TwitterConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: TwitterConnectDialogProps) {
  const [username, setUsername] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your Twitter username.",
        variant: "destructive",
      });
      return;
    }

    // Clean Twitter handle from URL format if needed
    const cleanedUsername = cleanTwitterUsername(username);

    // Validate format before connecting
    if (!isValidTwitterHandle(cleanedUsername)) {
      toast({
        title: "Invalid Handle Format",
        description: getValidationMessage("twitter"),
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(cleanedUsername);
      onOpenChange(false);
      setUsername("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          "Failed to connect to Twitter. Please check the username and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Connect Twitter</DialogTitle>
          <DialogDescription>
            Enter your Twitter username to connect your account. We&apos;ll
            import your profile information and recent tweets to build your
            digital clone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Twitter Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                disabled={isConnecting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the username from your Twitter profile (e.g., for{" "}
              <a
                href="https://twitter.com/elonmusk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
              >
                twitter.com/elonmusk
              </a>
              , enter &quot;elonmusk&quot; or &quot;@elonmusk&quot;)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
            className="text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!username.trim() || isConnecting}
            className="text-base"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
