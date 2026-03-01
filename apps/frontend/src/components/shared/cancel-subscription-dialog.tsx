"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setCancelSubscriptionDialog, useAppStore } from "@/store/app";
import { forwardRef } from "react";
import { gengarApi } from "@/services/api";

export interface CancelSubscriptionDialogMethods {
  show: () => void;
  hide: () => void;
}

export const CancelSubscriptionDialog = forwardRef((props, ref) => {
  const open = useAppStore((s) => s.isCancelSubscriptionDialog);

  const handleCancel = async () => {
    try {
      await gengarApi.cancelSubscription();
      // reload
      window.location.reload();
      // Optionally, you can add a success message or redirect the user
      alert("Subscription cancelled successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to cancel subscription");
    } finally {
    }
  };

  return (
    <Dialog open={open} onOpenChange={setCancelSubscriptionDialog}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="mb-2">Cancel Subscription</DialogTitle>
          <DialogDescription>
            You can not access to 20+ capable AI models and other premium
            features. Are you sure you want to cancel your subscription?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-row gap-2">
          <Button
            onClick={() => setCancelSubscriptionDialog(false)}
            variant="secondary"
            className="h-12 w-full rounded-full"
            size="lg"
          >
            No
          </Button>
          <Button
            onClick={() => {
              handleCancel();
              setCancelSubscriptionDialog(false);
            }}
            variant="destructive"
            className="h-12 w-full rounded-full"
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
