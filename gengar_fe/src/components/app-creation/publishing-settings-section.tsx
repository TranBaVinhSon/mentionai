"use client";

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
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ChevronDown } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface PublishingSettingsSectionProps {
  form: UseFormReturn<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishingSettingsSection({
  form,
  open,
  onOpenChange,
}: PublishingSettingsSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
            <div className="flex flex-col items-start gap-1 text-left">
              <CardTitle className="text-base">Publishing Settings</CardTitle>
              <CardDescription className="text-base">
                Control how your digital clone can be accessed
              </CardDescription>
            </div>
            <ChevronDown className="size-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Make Public</FormLabel>
                    <FormDescription className="text-sm">
                      Allow anyone to chat with your digital clone at @
                      {form.watch("name") || "yourname"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-brand"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}