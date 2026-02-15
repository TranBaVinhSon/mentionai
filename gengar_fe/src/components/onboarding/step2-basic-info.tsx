"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  description: z.string().optional(),
  avatar: z.instanceof(File).optional(),
});

interface Step2BasicInfoProps {
  initialData: {
    platform: "linkedin" | "twitter";
    username: string;
    profileSummary: any;
  };
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  isSubmitting: boolean;
}

export function Step2BasicInfo({
  initialData,
  onSubmit,
  isSubmitting,
}: Step2BasicInfoProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData.profileSummary?.avatar || null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.username, // Unique ID suggestion
      displayName: initialData.profileSummary?.name || "",
      description:
        initialData.profileSummary?.headline ||
        initialData.profileSummary?.bio ||
        "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("avatar", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review Your Profile</h2>
        <p className="text-muted-foreground">
          We've pre-filled this from your {initialData.platform} profile. Tweak
          it if you like!
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={previewUrl || ""} />
              <AvatarFallback className="text-2xl">
                {form.watch("displayName")?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                id="avatar-upload"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("avatar-upload")?.click()
                }
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unique Handle</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" {...field} />
                </FormControl>
                <FormDescription>
                  Your unique URL handle (mention.ai/@{field.value || "handle"})
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Bio)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Your Digital Twin...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Create My Digital Twin
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
