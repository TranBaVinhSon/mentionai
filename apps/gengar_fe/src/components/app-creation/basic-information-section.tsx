"use client";

import { Button } from "@/components/ui/button";
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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Loader2, Upload, Wand2 } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { generateDescriptionForApp } from "@/app/actions/generate-text";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

interface BasicInformationSectionProps {
  form: UseFormReturn<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  onFileChange: (file: File | undefined) => void;
}

export function BasicInformationSection({
  form,
  open,
  onOpenChange,
  previewUrl,
  onFileChange,
}: BasicInformationSectionProps) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    } else {
      onFileChange(undefined);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
            <div className="flex flex-col items-start gap-1 text-left">
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription className="text-base">
                Tell us about yourself - this helps create your digital clone
              </CardDescription>
            </div>
            <ChevronDown className="size-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Profile Photo</FormLabel>
                  <FormDescription className="text-base">
                    Upload your profile picture
                  </FormDescription>
                  <FormControl>
                    <div className="flex">
                      <label className="relative cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept={ACCEPTED_IMAGE_TYPES.join(",")}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              field.onChange(file);
                              handleFileChange(e);
                            }
                          }}
                        />
                        <div className="size-24 rounded-full border-2 border-dashed border-muted-foreground/50 hover:border-muted-foreground overflow-hidden transition-colors">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Profile preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <Upload className="size-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unique Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Unique Username
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormDescription className="text-base">
                    Your public URL will be: mentionai.io/@
                    {field.value || "yourname"}
                  </FormDescription>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="text-muted-foreground mr-2 text-base">
                        @
                      </span>
                      <Input
                        placeholder="yourname"
                        className="text-base"
                        {...field}
                        required
                        onChange={(e) => {
                          // Convert to lowercase and remove invalid characters
                          const value = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "");
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Name */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Display Name
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormDescription className="text-base">
                    Your full name as it will appear to users
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      className="text-base"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">About You</FormLabel>
                  <FormDescription className="text-base">
                    A brief description about yourself
                  </FormDescription>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="I'm a software engineer passionate about AI and building products that help people..."
                        className="min-h-[100px] pr-12 text-base"
                        {...field}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 size-8"
                        type="button"
                        onClick={async () => {
                          const appName = form.getValues("name");
                          if (appName) {
                            setIsGeneratingDescription(true);
                            const description = await generateDescriptionForApp(
                              appName
                            );
                            field.onChange(description);
                            setIsGeneratingDescription(false);
                          }
                        }}
                      >
                        {isGeneratingDescription ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Wand2 className="size-4" />
                        )}
                        <span className="sr-only">Auto fill</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}