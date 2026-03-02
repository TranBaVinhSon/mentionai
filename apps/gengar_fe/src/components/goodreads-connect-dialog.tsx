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

interface GoodreadsConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (userId: string) => Promise<void>;
}

export function GoodreadsConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: GoodreadsConnectDialogProps) {
  const [userId, setUserId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!userId.trim()) {
      toast({
        title: "User ID Required",
        description: "Please enter your Goodreads user ID.",
        variant: "destructive",
      });
      return;
    }

    const cleanUserId = userId.trim();

    // Validate user ID format (numeric only)
    if (!/^\d+$/.test(cleanUserId)) {
      toast({
        title: "Invalid User ID",
        description: "Please enter a valid Goodreads user ID (numbers only).",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(cleanUserId);
      onOpenChange(false);
      setUserId("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          "Failed to connect to Goodreads. Please check your user ID and try again.",
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
          <DialogTitle>Connect with Goodreads</DialogTitle>
          <DialogDescription className="space-y-4 pt-3">
            <p>Follow these steps to connect your Goodreads account:</p>
            <ol className="space-y-3 list-decimal list-inside">
              <li className="text-sm">Go to your Goodreads profile</li>
              <li className="text-sm">
                Your user ID is the number in your profile URL
              </li>
              <li className="text-sm">
                For example, in{" "}
                <span className="font-mono text-xs">
                  goodreads.com/user/show/191271406-t-tr-n
                </span>
                , the ID is <span className="font-medium">191271406</span>
              </li>
            </ol>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="userId" className="font-medium">
              Goodreads User ID
            </Label>
            <Input
              id="userId"
              placeholder="191271406"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="col-span-3 font-mono text-sm"
            />
            <p className="text-[13px] text-muted-foreground">
              Make sure your Goodreads profile is public to enable syncing.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg
                  className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-500 font-medium">
                  Important Note
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Your user ID can be found in your Goodreads profile URL.
                  It&apos;s a sequence of numbers that appears after
                  &quot;/show/&quot;.
                </p>
              </div>
            </div>
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
            disabled={!userId.trim() || isConnecting}
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
