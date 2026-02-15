import { log } from "console";
import { useCallback, useEffect, useRef } from "react";

type UseAutoScrollOptions = {
  isLoading?: boolean;
  content?: string;
  targetRef: React.RefObject<HTMLElement>;
  smooth?: boolean;
};

export function useAutoScroll({
  isLoading = false,
  content = "",
  targetRef,
  smooth = true,
}: UseAutoScrollOptions) {
  const previousContentLengthRef = useRef<number>(0);

  // Perhaps the message element is not the scrollable parent, so we need to find the nearest scrollable parent
  const getScrollableParent = useCallback(
    (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return document.scrollingElement as HTMLElement;

      const isScrollable =
        element.scrollHeight > element.clientHeight &&
        (getComputedStyle(element).overflowY === "auto" ||
          getComputedStyle(element).overflowY === "scroll");

      if (isScrollable) return element;
      return getScrollableParent(element.parentElement);
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    if (!targetRef.current) return;
    const scrollContainer =
      getScrollableParent(targetRef.current) ||
      document.scrollingElement ||
      document.documentElement;

    if (scrollContainer) {
      window.requestAnimationFrame(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      });
    }
  }, [targetRef, getScrollableParent, smooth]);

  const forceScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Auto-scroll when content changes during loading
  useEffect(() => {
    if (isLoading && content) {
      const currentLength = content.length;

      if (currentLength > previousContentLengthRef.current) {
        scrollToBottom();
        previousContentLengthRef.current = currentLength;
      }
    } else if (!isLoading && content) {
      scrollToBottom();
      previousContentLengthRef.current = 0;
    }
  }, [isLoading, content, scrollToBottom]);

  return {
    scrollToBottom: forceScrollToBottom,
  };
}
