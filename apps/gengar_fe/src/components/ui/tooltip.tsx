"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      collisionPadding={10}
      {...props}
    />
  </TooltipPrimitive.Portal>
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export type TTooltip = {
  children: React.ReactNode;
  content: React.ReactNode;
  sideOffset?: number;
  contentClassName?: string;
  side?: "left" | "right" | "top" | "bottom";
};

const MyTooltip = ({
  children,
  content,
  contentClassName,
  side,
  sideOffset,
}: TTooltip) => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className={contentClassName}
        side={side}
        sideOffset={sideOffset}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

export { MyTooltip, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
