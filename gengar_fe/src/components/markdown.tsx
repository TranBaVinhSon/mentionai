"use client";

import { memo } from "react";
import MarkdownPreview from "marked-react";

export const MemoizedReactMarkdown = memo(
  MarkdownPreview,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
