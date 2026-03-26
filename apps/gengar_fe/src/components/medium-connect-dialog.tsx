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

interface MediumConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (username: string) => Promise<void>;
}

export function MediumConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: MediumConnectDialogProps) {
  const [username, setUsername] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your Medium username.",
        variant: "destructive",
      });
      return;
    }

    const cleanUsername = username.trim().replace(/^@/, ""); // Remove @ if present

    setIsConnecting(true);
    try {
      await onConnect(cleanUsername);
      onOpenChange(false);
      setUsername("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          "Failed to connect to Medium. Please check the username and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Remove @ symbol if user types it
    const cleanValue = value.replace(/^@/, "");
    setUsername(cleanValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Medium</DialogTitle>
          <DialogDescription>
            Enter your Medium username to connect your account. We&apos;ll
            import your blog posts to build your digital clone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="yourusername"
                className="pl-8"
                disabled={isConnecting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your username without the @ symbol
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
