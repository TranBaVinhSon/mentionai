"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setSignInDialog, useAppStore } from "@/store/app";
import { forwardRef } from "react";
import { SignInButton } from "@/components/sign-in-button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SignInDialogMethods {
  show: () => void;
  hide: () => void;
}

export const SignInDialog = forwardRef((props, ref) => {
  const open = useAppStore((s) => s.isSignInDialog);
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={setSignInDialog}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="mb-2">Join MentionAI</DialogTitle>
          <DialogDescription>
            Login to unlock all features, using all models and talking with all
            digital minds. It&apos;s completely free!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <SignInButton provider="google" callbackUrl={pathname} />
          <SignInButton provider="github" callbackUrl={pathname} />
        </div>
        <DialogFooter>
          <p className="text-sm text-muted-foreground">
            {" "}
            By continuing, you agree to our{" "}
            <Link
              href="/terms-of-service"
              target="_blank"
              className="underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="underline">
              Privacy Policy
            </Link>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
