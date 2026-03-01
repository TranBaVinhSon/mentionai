"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface TruncatedDescriptionProps {
  description?: string;
  displayName: string;
  lines?: number;
}

export function TruncatedDescription({
  description,
  displayName,
  lines = 2,
}: TruncatedDescriptionProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const finalDescription =
    description ||
    `This is a personal AI representation of ${displayName}, trained on their writing style, knowledge, and personality.`;

  // Check if content is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        const element = descriptionRef.current;
        // Check if scrollHeight is greater than clientHeight (indicates truncation)
        setIsTruncated(element.scrollHeight > element.clientHeight);
      }
    };

    // Check after render and on window resize
    checkTruncation();
    window.addEventListener("resize", checkTruncation);

    return () => {
      window.removeEventListener("resize", checkTruncation);
    };
  }, [finalDescription]);

  return (
    <>
      <div className="space-y-1 md:space-y-2 text-left">
        <div
          ref={descriptionRef}
          className="prose prose-sm prose-markdown max-w-none dark:prose-invert text-sm md:text-base [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: lines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <ReactMarkdown>{finalDescription}</ReactMarkdown>
        </div>
        {isTruncated && (
          <Button
            variant="link"
            className="p-0 h-auto text-sm md:text-base"
            onClick={() => setShowFullDescription(true)}
          >
            Show more
          </Button>
        )}
      </div>

      {/* Full Description Dialog */}
      <Dialog open={showFullDescription} onOpenChange={setShowFullDescription}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>About {displayName}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm prose-markdown max-w-none dark:prose-invert mt-4">
            <ReactMarkdown>{finalDescription}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
