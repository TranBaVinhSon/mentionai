"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { Sparkles as SparklesIcon } from "lucide-react";
import { setCancelSubscriptionDialog } from "@/store/app";
import { GengarSubscriptionPlan } from "@/services/api";
import { useUser } from "@/hooks/use-user";
import { Separator } from "../ui/separator";
import { Loader2, SquareCheckBig } from "lucide-react";
import { gengarApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: user } = useUser();
  const [prompt, setPrompt] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user?.userId) return;
    if (prompt.length === 0) {
      toast({
        title: "Error",
        description: "Custom instructions cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await gengarApi.updateUserPrompt(user.userId, prompt);
      toast({
        title: "Success",
        description: "Custom instructions updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update custom instructions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-auto p-6">
            <div>
              <h3 className="text-lg font-medium">Custom Prompt</h3>
              <p className="text-sm text-muted-foreground">
                How would you like MentionAI to respond?
                <br />
                This prompt will effect to the performance of all AI models
                after saving. Please be careful with your prompt
              </p>
              <Textarea
                className="mt-4 h-32"
                placeholder="Enter your custom prompt..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />

              {/* TODO: Add Reset Prompt Button */}

              <div className="flex flex-row justify-between gap-2 mt-3">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SquareCheckBig className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {user?.subscriptionPlan === GengarSubscriptionPlan.PLUS && (
              <div className="flex flex-row justify-between gap-2">
                <h3 className="text-lg font-medium">Cancel Plus plan</h3>
                {user?.subscriptionPlanCancelAt ? (
                  <span className="text-red-500 cursor-not-allowed">
                    Access to Plus Plan until{" "}
                    {new Date(
                      user.subscriptionPlanCancelAt
                    ).toLocaleDateString()}
                  </span>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setCancelSubscriptionDialog(true);
                    }}
                    // className="text-red-500 hover:text-red-500"
                  >
                    <SparklesIcon />
                    Cancel Plus plan
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
