"use client";

import { useState, useEffect } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  containsUrl,
  cleanUsername,
  getValidationMessage,
} from "@/utils/validate-username";

interface LinkedInConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (username: string) => Promise<void>;
}

export function LinkedInConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: LinkedInConnectDialogProps) {
  const [username, setUsername] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasUrlError, setHasUrlError] = useState(false);

  useEffect(() => {
    if (username) {
      setHasUrlError(containsUrl(username));
    } else {
      setHasUrlError(false);
    }
  }, [username]);

  const handleConnect = async () => {
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your LinkedIn username.",
        variant: "destructive",
      });
      return;
    }

    if (hasUrlError) {
      toast({
        title: "Invalid Format",
        description: getValidationMessage("linkedin"),
        variant: "destructive",
      });
      return;
    }

    const cleanedUsername = cleanUsername(username);

    setIsConnecting(true);
    try {
      await onConnect(cleanedUsername);
      onOpenChange(false);
      setUsername("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          "Failed to connect to LinkedIn. Please check the username and try again.",
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
          <DialogTitle>Connect LinkedIn</DialogTitle>
          <DialogDescription>
            Enter your LinkedIn username to connect your account. We&apos;ll
            import your comprehensive profile including experience, education,
            certifications, publications, projects, awards, and all your posts
            and articles to build your digital clone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">LinkedIn Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                disabled={isConnecting}
                className={hasUrlError ? "border-destructive" : ""}
              />
              {hasUrlError && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              )}
            </div>
            {hasUrlError && (
              <p className="text-xs text-destructive mt-1">
                {getValidationMessage("linkedin")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the username from your LinkedIn profile URL (e.g., for{" "}
              <a
                href="https://linkedin.com/in/sontbv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
              >
                linkedin.com/in/sontbv
              </a>
              , enter &quot;sontbv&quot;)
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
            disabled={!username.trim() || isConnecting || hasUrlError}
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
