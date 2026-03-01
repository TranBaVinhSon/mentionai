"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ChevronDown, Link as LinkIcon, X, Lock } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { SocialNetworkType } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KnowledgeSourcesSectionProps {
  form: UseFormReturn<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socialConnections: {
    linkedin: boolean;
    reddit: boolean;
    medium: boolean;
    substack: boolean;
    github: boolean;
    goodreads: boolean;
    productHunt: boolean;
    facebook: boolean;
    twitter: boolean;
  };
  onSocialConnect: {
    linkedin: () => void;
    reddit: () => void;
    medium: () => void;
    substack: () => void;
    github: () => void;
    goodreads: () => void;
    productHunt: () => void;
    facebook: () => void;
    twitter: () => void;
  };
  blogLinks: string[];
  setBlogLinks: (links: string[]) => void;
  children?: React.ReactNode;
}

export function KnowledgeSourcesSection({
  form,
  open,
  onOpenChange,
  socialConnections,
  onSocialConnect,
  blogLinks,
  setBlogLinks,
  children,
}: KnowledgeSourcesSectionProps) {
  const [blogInput, setBlogInput] = useState("");

  const isYouTubeUrl = (url: string): boolean => {
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleAddBlogLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && blogInput.trim()) {
      e.preventDefault();

      // Validate and process the URL
      const rawInput = blogInput.trim();
      let url = rawInput;

      // Add protocol if missing
      if (!url.includes("://")) {
        url = `https://${url}`;
      }

      try {
        // Basic structural validation
        const urlObj = new URL(url);

        // Additional validation checks
        if (!urlObj.hostname.includes(".") || urlObj.hostname.length < 4) {
          throw new Error("Invalid domain name");
        }

        // Check for common TLDs or longer domain parts
        const domainParts = urlObj.hostname.split(".");
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2 && domainParts.length < 2) {
          throw new Error("Invalid top-level domain");
        }

        // Normalize URL before saving (strip unnecessary trailing slashes, etc.)
        const normalizedUrl = urlObj.toString().replace(/\/$/, "");

        // Check for duplicates (normalized comparison)
        const isDuplicate = blogLinks.some((link) => {
          try {
            const existingUrl = new URL(link);
            return (
              existingUrl.hostname === urlObj.hostname &&
              existingUrl.pathname.replace(/\/$/, "") ===
                urlObj.pathname.replace(/\/$/, "")
            );
          } catch {
            return false;
          }
        });

        if (isDuplicate) {
          toast({
            title: "Duplicate URL",
            description: "This URL has already been added",
            variant: "destructive",
          });
          return;
        }

        // Add the valid URL to the list
        const updatedLinks = [...blogLinks, normalizedUrl];
        setBlogLinks(updatedLinks);
        form.setValue("blogLinks", updatedLinks);
        setBlogInput("");

        // Success toast
        toast({
          title: "URL Added",
          description: `Added ${urlObj.hostname}`,
          variant: "default",
        });
      } catch (error) {
        // Provide helpful error message based on the type of error
        let errorMessage = "Please enter a valid URL";

        if (error instanceof Error) {
          if (error.message.includes("Invalid URL")) {
            errorMessage =
              "The URL format is invalid. Example: blog.example.com";
          } else if (error.message.includes("domain")) {
            errorMessage = "Please enter a valid domain name";
          }
        }

        toast({
          title: "Invalid URL",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const removeBlogLink = (linkToRemove: string) => {
    const updatedLinks = blogLinks.filter((link) => link !== linkToRemove);
    setBlogLinks(updatedLinks);
    form.setValue("blogLinks", updatedLinks);
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
            <div className="flex flex-col items-start gap-1 text-left">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Knowledge Sources</CardTitle>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Lock className="size-4 text-destructive hover:text-destructive/80 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">
                        <strong>Privacy Notice:</strong> We respect your privacy
                        and only access public posts, comments, and profile
                        information that you've already made visible on each
                        platform. We do not access or store private messages,
                        sensitive data, or any information you've set to private.
                        Your data is encrypted and used solely to train your AI
                        clone.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-base">
                Connect your content to train your digital clone
              </CardDescription>
            </div>
            <ChevronDown className="size-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Social Media Connections */}
            <div className="space-y-4">
              <h3 className="text-base font-medium">Social Media</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button
                  variant={socialConnections.linkedin ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.linkedin
                      ? undefined
                      : onSocialConnect.linkedin
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.linkedin &&
                      "bg-blue-50 dark:bg-blue-950/30 text-[#0077B5] hover:bg-blue-50"
                  )}
                  disabled={socialConnections.linkedin}
                >
                  <img
                    src="/icons/linkedin.svg"
                    alt="LinkedIn"
                    className="mr-2 size-4"
                  />
                  {socialConnections.linkedin ? "Connected" : "LinkedIn"}
                </Button>

                <Button
                  variant={socialConnections.reddit ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.reddit ? undefined : onSocialConnect.reddit
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.reddit &&
                      "bg-orange-50 dark:bg-orange-950/30 text-[#FF4500] hover:bg-orange-50"
                  )}
                  disabled={socialConnections.reddit}
                >
                  <img
                    src="/icons/reddit.svg"
                    alt="Reddit"
                    className="mr-2 size-4"
                  />
                  {socialConnections.reddit ? "Connected" : "Reddit"}
                </Button>

                <Button
                  variant={socialConnections.medium ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.medium
                      ? undefined
                      : onSocialConnect.medium
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.medium &&
                      "bg-slate-50 dark:bg-slate-950/30 text-black hover:bg-slate-50"
                  )}
                  disabled={socialConnections.medium}
                >
                  <img
                    src="/icons/medium.svg"
                    alt="Medium"
                    className="mr-2 size-4"
                  />
                  {socialConnections.medium ? "Connected" : "Medium"}
                </Button>

                <Button
                  variant={socialConnections.substack ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.substack
                      ? undefined
                      : onSocialConnect.substack
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.substack &&
                      "bg-orange-50 dark:bg-orange-950/30 text-[#FF6719] hover:bg-orange-50"
                  )}
                  disabled={socialConnections.substack}
                >
                  <img
                    src="/icons/substack.svg"
                    alt="Substack"
                    className="mr-2 size-4"
                  />
                  {socialConnections.substack ? "Connected" : "Substack"}
                </Button>

                <Button
                  variant={socialConnections.github ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.github ? undefined : onSocialConnect.github
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.github &&
                      "bg-gray-50 dark:bg-gray-950/30 text-[#171515] hover:bg-gray-50"
                  )}
                  disabled={socialConnections.github}
                >
                  <img
                    src="/icons/github.svg"
                    alt="GitHub"
                    className="mr-2 size-4"
                  />
                  {socialConnections.github ? "Connected" : "GitHub"}
                </Button>

                <Button
                  variant={socialConnections.goodreads ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.goodreads
                      ? undefined
                      : onSocialConnect.goodreads
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.goodreads &&
                      "bg-amber-50 dark:bg-amber-950/30 text-[#553B08] hover:bg-amber-50"
                  )}
                  disabled={socialConnections.goodreads}
                >
                  <img
                    src="/icons/goodreads.svg"
                    alt="Goodreads"
                    className="mr-2 size-4"
                  />
                  {socialConnections.goodreads ? "Connected" : "Goodreads"}
                </Button>

                <Button
                  variant={socialConnections.productHunt ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.productHunt
                      ? undefined
                      : onSocialConnect.productHunt
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.productHunt &&
                      "bg-orange-50 dark:bg-orange-950/30 text-[#DA552F] hover:bg-orange-50"
                  )}
                  disabled={socialConnections.productHunt}
                >
                  <img
                    src="/icons/producthunt.svg"
                    alt="Product Hunt"
                    className="mr-2 size-4"
                  />
                  {socialConnections.productHunt
                    ? "Connected"
                    : "Product Hunt"}
                </Button>

                <Button
                  variant={socialConnections.facebook ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.facebook
                      ? undefined
                      : onSocialConnect.facebook
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.facebook &&
                      "bg-blue-50 dark:bg-blue-950/30 text-[#1877F2] hover:bg-blue-50"
                  )}
                  disabled={socialConnections.facebook}
                >
                  <img
                    src="/icons/facebook.svg"
                    alt="Facebook"
                    className="mr-2 size-4"
                  />
                  {socialConnections.facebook ? "Connected" : "Facebook"}
                </Button>

                <Button
                  variant={socialConnections.twitter ? "secondary" : "outline"}
                  type="button"
                  onClick={
                    socialConnections.twitter
                      ? undefined
                      : onSocialConnect.twitter
                  }
                  className={cn(
                    "justify-start text-base",
                    socialConnections.twitter &&
                      "bg-sky-50 dark:bg-sky-950/30 text-[#1DA1F2] hover:bg-sky-50"
                  )}
                  disabled={socialConnections.twitter}
                >
                  <img
                    src="/icons/twitter.svg"
                    alt="Twitter"
                    className="mr-2 size-4"
                  />
                  {socialConnections.twitter ? "Connected" : "Twitter"}
                </Button>
              </div>
            </div>

            {/* External Links */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">External Links</h3>
              <FormDescription className="text-base">
                Add blog posts, websites, or YouTube videos to train your AI
              </FormDescription>

              <div className="space-y-3">
                {blogLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg min-h-[60px]">
                    {blogLinks.map((link, i) => {
                      const isYouTube = isYouTubeUrl(link);
                      return (
                        <Badge
                          key={i}
                          variant="secondary"
                          className={cn(
                            "pr-1 text-sm",
                            isYouTube &&
                              "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                          )}
                        >
                          <LinkIcon className="mr-1 size-3" />
                          <span className="max-w-[200px] truncate">
                            {link}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBlogLink(link)}
                            className="ml-1 rounded-full hover:bg-background p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter URL and press Enter"
                    value={blogInput}
                    onChange={(e) => setBlogInput(e.target.value)}
                    onKeyDown={handleAddBlogLink}
                    className="pr-10 text-base"
                  />
                  <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Additional content for edit mode */}
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}