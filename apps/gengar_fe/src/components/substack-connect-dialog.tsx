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
import { containsUrl, cleanUsername, getValidationMessage } from "@/utils/validate-username";

interface SubstackConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (username: string) => Promise<void>;
}

export function SubstackConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: SubstackConnectDialogProps) {
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
        description: "Please enter your Substack username.",
        variant: "destructive",
      });
      return;
    }

    if (hasUrlError) {
      toast({
        title: "Invalid Format",
        description: getValidationMessage('substack'),
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
          "Failed to connect to Substack. Please check the username and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Substack</DialogTitle>
          <DialogDescription>
            Enter your Substack username to connect your account. We&apos;ll
            import your newsletter posts to build your digital clone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourusername"
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
                {getValidationMessage('substack')}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter your username from your Substack URL (e.g., if your Substack is at yourusername.substack.com, enter &quot;yourusername&quot;)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
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