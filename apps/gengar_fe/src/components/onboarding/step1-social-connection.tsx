"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { gengarApi } from "@/services/api";
import { Loader2, CheckCircle2, Search, ArrowRight } from "lucide-react";
import { LinkedInLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";
import { cleanUsername, cleanTwitterUsername, isValidTwitterHandle, getValidationMessage } from "@/utils/validate-username";

interface Step1SocialConnectionProps {
  onNext: (data: {
    platform: "linkedin" | "twitter";
    username: string;
    profileSummary: any;
  }) => void;
}

export function Step1SocialConnection({ onNext }: Step1SocialConnectionProps) {
  const [platform, setPlatform] = useState<"linkedin" | "twitter" | null>(null);
  const [username, setUsername] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    profileSummary?: any;
    error?: string;
  } | null>(null);

  const handleValidate = async () => {
    if (!platform || !username) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      let cleanedUsername: string;
      
      if (platform === "linkedin") {
        cleanedUsername = cleanUsername(username);
      } else {
        // Twitter/X
        cleanedUsername = cleanTwitterUsername(username);
        
        // Validate format before making API call
        if (!isValidTwitterHandle(cleanedUsername)) {
          setValidationResult({
            valid: false,
            error: "Invalid Twitter handle format. Handles must be 1-15 characters, alphanumeric and underscores only, and cannot start with a number.",
          });
          toast({
            title: "Invalid Handle Format",
            description: getValidationMessage("twitter"),
            variant: "destructive",
          });
          setIsValidating(false);
          return;
        }
      }

      const result = await gengarApi.validateSocialHandle(
        platform,
        cleanedUsername
      );

      setValidationResult(result);

      if (!result.valid) {
        toast({
          title: "Invalid Handle",
          description: result.error || "Could not validate this handle.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate handle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (platform && username && validationResult?.valid) {
      const cleanedUsername =
        platform === "linkedin"
          ? cleanUsername(username)
          : cleanTwitterUsername(username);
      
      onNext({
        platform,
        username: cleanedUsername,
        profileSummary: validationResult.profileSummary,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Connect Your Social Profile</h2>
        <p className="text-muted-foreground">
          Start by connecting a social account. We'll use this to build your
          digital twin's knowledge base.
        </p>
      </div>

      <div className="grid gap-6">
        <RadioGroup
          value={platform || ""}
          onValueChange={(val) => {
            setPlatform(val as "linkedin" | "twitter");
            setValidationResult(null);
            setUsername("");
          }}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem
              value="linkedin"
              id="linkedin"
              className="peer sr-only"
            />
            <Label
              htmlFor="linkedin"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-32 justify-center gap-2"
            >
              <LinkedInLogoIcon className="w-8 h-8 text-[#0a66c2]" />
              <span className="font-semibold">LinkedIn</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="twitter"
              id="twitter"
              className="peer sr-only"
            />
            <Label
              htmlFor="twitter"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-32 justify-center gap-2"
            >
              <TwitterLogoIcon className="w-8 h-8 text-[#1DA1F2]" />
              <span className="font-semibold">X / Twitter</span>
            </Label>
          </div>
        </RadioGroup>

        {platform && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label htmlFor="username">
                {platform === "linkedin" ? "LinkedIn Username" : "X Handle"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  placeholder={"sontbv"}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setValidationResult(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleValidate();
                    }
                  }}
                />
                <Button
                  onClick={handleValidate}
                  disabled={isValidating || !username}
                  variant="secondary"
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Validate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {platform === "linkedin" ? (
                  <>
                    Your public profile URL slug (e.g.{" "}
                    <a
                      href="https://linkedin.com/in/sontbv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      linkedin.com/in/sontbv
                    </a>{" "}
                    → sontbv)
                  </>
                ) : (
                  <>
                    Your X handle (e.g.{" "}
                    <a
                      href="https://x.com/sontbv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      x.com/sontbv
                    </a>{" "}
                    → sontbv)
                  </>
                )}
              </p>
            </div>

            {validationResult?.valid && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Profile Verified
                  </p>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p>
                      <span className="font-semibold">Name:</span>{" "}
                      {validationResult.profileSummary?.name}
                    </p>
                    {validationResult.profileSummary?.headline && (
                      <p>
                        <span className="font-semibold">Headline:</span>{" "}
                        {validationResult.profileSummary.headline}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full mt-4"
          size="lg"
          onClick={handleContinue}
          disabled={!validationResult?.valid}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
