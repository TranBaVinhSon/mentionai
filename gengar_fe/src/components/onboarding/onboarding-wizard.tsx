"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Step1SocialConnection } from "./step1-social-connection";
import { Step2BasicInfo } from "./step2-basic-info";
import { gengarApi, SocialNetworkType } from "@/services/api";
import { uploadFile } from "@/app/actions/s3-actions";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { downloadImageAsFile } from "@/utils/image-utils";

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<{
    platform: "linkedin" | "twitter";
    username: string;
    profileSummary: any;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { data: user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleStep1Complete = (data: {
    platform: "linkedin" | "twitter";
    username: string;
    profileSummary: any;
  }) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2Complete = async (data: any) => {
    if (!step1Data || !user) return;

    setIsCreating(true);
    try {
      let logoUrl = "";
      
      // If user manually uploaded an avatar, use that; otherwise try to use the avatar from social profile
      if (data.avatar) {
        const formData = new FormData();
        formData.append("file", data.avatar);
        const { s3Key } = await uploadFile(user.userId, formData);
        logoUrl = s3Key;
      } else if (step1Data.profileSummary?.avatar) {
        // Auto-fetch avatar from LinkedIn/Twitter profile
        try {
          const avatarFile = await downloadImageAsFile(
            step1Data.profileSummary.avatar,
            "avatar.jpg"
          );
          const formData = new FormData();
          formData.append("file", avatarFile);
          const { s3Key } = await uploadFile(user.userId, formData);
          logoUrl = s3Key;
        } catch (error) {
          console.warn("Failed to fetch avatar from social profile:", error);
          // Continue without avatar if download fails
        }
      }

      const socialType =
        step1Data.platform === "linkedin"
          ? SocialNetworkType.LINKEDIN
          : SocialNetworkType.TWITTER;

      // Create app with minimal required fields + social connection
      const createAppPayload = {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        logo: logoUrl,
        category: "Other",
        instruction: "", // Optional now
        uniqueId: data.name.toLowerCase().replace(/\s+/g, "-"),
        isMe: true,
        isPublished: true,
        socialCredentials: [
          {
            source: socialType,
            username: step1Data.username,
          },
        ],
      };

      console.log("Creating app with payload:", createAppPayload);
      const app = await gengarApi.createApp(createAppPayload);

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["official-apps"] });

      toast({
        title: "Digital Clone Created! 🚀",
        description:
          "Your clone is being set up. We're syncing your social data in the background.",
      });

      router.push(`/apps/${app.uniqueId}`);
    } catch (error: any) {
      console.error("Error creating app:", error);
      toast({
        title: "Creation Failed",
        description:
          error?.response?.data?.message ||
          "Failed to create your digital clone.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${
              step >= 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`w-12 h-1 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground font-medium">
          Step {step} of 2
        </p>
      </div>

      {step === 1 && <Step1SocialConnection onNext={handleStep1Complete} />}
      {step === 2 && step1Data && (
        <Step2BasicInfo
          initialData={step1Data}
          onSubmit={handleStep2Complete}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}
