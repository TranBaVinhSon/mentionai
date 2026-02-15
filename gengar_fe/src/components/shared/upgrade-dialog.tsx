"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Crown, ArrowRight } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  features?: string[];
}

export const UpgradeDialog = ({
  open,
  onOpenChange,
  title = "Upgrade to unlock more features",
  description = "You've reached the limits of the free plan. Upgrade to Plus to continue.",
  features = [
    "Connect unlimited social media accounts",
    "Add unlimited links and content sources",
    "Access advanced analytics dashboard",
    "Priority support",
  ],
}: UpgradeDialogProps) => {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Plus plan includes:
            </p>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Upgrade to Plus
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continue with Free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
