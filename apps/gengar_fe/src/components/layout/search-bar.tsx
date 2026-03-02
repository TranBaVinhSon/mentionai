"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  buttonText?: string;
  className?: string;
  onSearch?: (value: string) => void;
}

export function SearchBar({
  placeholder = "Search Apps",
  buttonText = "Search",
  className,
  onSearch,
}: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setSearchValue("");
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus the input when expanded
      inputRef.current?.focus();
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsExpanded(false);
      setSearchValue("");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      {/* Search Input - Hidden when not expanded */}
      {isExpanded && (
        <form onSubmit={handleSearch} className="flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 w-[220px] h-10 bg-muted border-none rounded-lg text-base placeholder:text-muted-foreground placeholder:font-medium placeholder:text-base focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 transition-all duration-200"
              // disabled temporaily
              disabled
              onBlur={() => {
                // Small delay to allow click events to process
                setTimeout(() => {
                  if (!searchValue) {
                    setIsExpanded(false);
                  }
                }, 200);
              }}
            />
          </div>
        </form>
      )}

      {/* Search Button - Hidden when expanded */}
      {!isExpanded && (
        <Button
          variant="ghost"
          className="text-base"
          onClick={() => setIsExpanded(true)}
        >
          <Search className="size-5 mr-1" />
          {buttonText}
        </Button>
      )}
    </div>
  );
}
