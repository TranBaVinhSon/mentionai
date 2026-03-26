"use client";
import { memo, useRef, useState, useCallback, useEffect } from "react";
import {
  Sparkles as AiMagicIcon,
  UserX as AnonymousIcon,
  ArrowUp,
  Square,
  Paperclip,
  Search as GlobalSearchIcon,
  Brain as AiBrain01Icon,
  Loader2 as Loading03Icon,
  X,
  Lightbulb as DeepThinkIcon,
  HatGlasses,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { cn } from "@/lib/utils";
import {
  toggleAnonymous,
  toggleDebateMode,
  toggleWebSearch,
  toggleDeepThinkMode,
  useChatStore,
} from "@/store/chat";

import { EventTypes, useEventListener } from "@/services/event-emitter";
import { GengarSubscriptionPlan } from "@/services/api";
import { useUser } from "@/hooks/use-user";
import { setSignInDialog, setSubscriptionDialog } from "@/store/app";
import { useSession } from "next-auth/react";
import { enhancePrompt } from "@/app/actions/enhance-prompt";
import { deleteFile, uploadFile } from "@/app/actions/s3-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField as ApiFormField } from "@/services/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

type FormValues = Record<string, string | number>;

interface ChatEditorProps {
  className?: string;
  autoFocus?: boolean;
  showAnonymous?: boolean;
  disableDebateToggle?: boolean;
  onEnter: (content: string, s3Links?: string[]) => void;
  placeholder?: string;
  getReadableState?: () => {
    description: string;
    value: string;
  };
  fields?: ApiFormField[];
  onSubmit?: (values: FormValues) => void;
  maxHeight?: string | number;
}

interface UploadedFile {
  file: File;
  previewUrl: string;
  s3Link: string;
  s3Key: string;
  isUploading: boolean;
}

export const ChatEditor = memo(
  ({
    className,
    autoFocus,
    showAnonymous,
    disableDebateToggle = false,
    onEnter,
    placeholder,
    getReadableState = () => ({
      description: "",
      value: "",
    }),
    fields,
    onSubmit,
    maxHeight = 160,
  }: ChatEditorProps) => {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isAnonymous = useChatStore((state) => state.isAnonymous);
    const isWebSearchEnabled = useChatStore(
      (state) => state.isWebSearchEnabled
    );
    const isDebateMode = useChatStore((state) => state.isDebateMode);
    const isDeepThinkMode = useChatStore((state) => state.isDeepThinkMode);
    const [isPromptEnhancement, setIsPromptEnhancement] = useState(false);
    const { data: user } = useUser();
    const { status } = useSession();

    // Create a ref to track the latest uploadedFiles
    const uploadedFilesRef = useRef<UploadedFile[]>([]);

    // Update the ref whenever uploadedFiles changes
    useEffect(() => {
      uploadedFilesRef.current = uploadedFiles;
    }, [uploadedFiles]);

    useEventListener(EventTypes.SET_EDITOR_CONTENT, (data) => {
      setInput(data);
    });

    const handleEnhancePrompt = async () => {
      if (status !== "authenticated") {
        setSignInDialog(true);
      } else {
        setIsPromptEnhancement(true);
        if (input) {
          const enhancedPrompt = await enhancePrompt(input);
          setInput(enhancedPrompt);
        }
        setIsPromptEnhancement(false);
      }
    };

    const handleFileChange = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const targetFiles = event.target.files;
        if (!targetFiles) return;

        const currentCount = uploadedFiles.length;
        const newFiles = Array.from(targetFiles);
        const totalCount = currentCount + newFiles.length;

        if (totalCount > 5) {
          alert("Maximum 5 images allowed");
          return;
        }

        // Create temporary preview URLs and add files to state
        const newUploadedFiles: UploadedFile[] = newFiles.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          s3Link: "",
          s3Key: "",
          isUploading: true,
        }));

        setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);

        // Upload each file to S3
        for (const fileData of newUploadedFiles) {
          try {
            const formData = new FormData();
            formData.append("file", fileData.file);
            const { s3Link, s3Key } = await uploadFile(user?.userId, formData);

            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.previewUrl === fileData.previewUrl
                  ? { ...f, s3Link, s3Key, isUploading: false }
                  : f
              )
            );
          } catch (error) {
            console.error("Failed to upload file:", error);
            // Remove failed upload from state
            setUploadedFiles((prev) =>
              prev.filter((f) => f.previewUrl !== fileData.previewUrl)
            );
          }
        }
      },
      [uploadedFiles.length, user?.userId]
    );

    const handleRemoveFile = useCallback(
      async (index: number) => {
        const fileToRemove = uploadedFiles[index];
        if (fileToRemove.s3Link) {
          try {
            await deleteFile(fileToRemove.s3Key);
          } catch (error) {
            console.error("Failed to delete file from S3:", error);
          }
        }
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
        if (uploadInputRef?.current) {
          uploadInputRef.current.value = "";
        }
      },
      [uploadedFiles]
    );

    const handleSubmit = useCallback(() => {
      if (input.trim() || uploadedFiles.length > 0) {
        setIsLoading(true);
        onEnter(
          input,
          uploadedFilesRef.current.map((file) => file.s3Link)
        );
        setInput("");
        setUploadedFiles([]);
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    }, [input, uploadedFiles.length, onEnter]);

    const generateZodSchema = useCallback((fields: ApiFormField[]) => {
      const schemaObj: Record<string, z.ZodType> = {};

      fields.forEach((field) => {
        if (field.type === "number") {
          let fieldSchema = z.number();
          if (field.validation?.min !== undefined) {
            fieldSchema = fieldSchema.min(field.validation.min);
          }
          if (field.validation?.max !== undefined) {
            fieldSchema = fieldSchema.max(field.validation.max);
          }
          schemaObj[field.id] = field.required
            ? fieldSchema
            : fieldSchema.optional();
        } else {
          let fieldSchema = z.string();
          if (field.validation?.minLength !== undefined) {
            fieldSchema = fieldSchema.min(field.validation.minLength);
          }
          if (field.validation?.maxLength !== undefined) {
            fieldSchema = fieldSchema.max(field.validation.maxLength);
          }
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern)
            );
          }
          schemaObj[field.id] = field.required
            ? fieldSchema
            : fieldSchema.optional();
        }
      });

      return z.object(schemaObj);
    }, []);

    const form = useForm<FormValues>({
      resolver: fields ? zodResolver(generateZodSchema(fields)) : undefined,
      defaultValues: fields?.reduce(
        (acc, field) => ({
          ...acc,
          [field.id]: field.defaultValue || "",
        }),
        {} as FormValues
      ),
    });

    const renderFormField = (field: ApiFormField) => {
      const fieldValue = form.watch(field.id);

      switch (field.type) {
        case "text":
          return (
            <Input
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue as string}
              onChange={(e) => form.setValue(field.id, e.target.value)}
              required={field.required}
              className="w-full"
            />
          );
        case "textarea":
          return (
            <textarea
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue as string}
              onChange={(e) => form.setValue(field.id, e.target.value)}
              required={field.required}
              className="min-h-[100px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
            />
          );
        case "select":
          return (
            <Select
              value={fieldValue as string}
              onValueChange={(value) => form.setValue(field.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={field.placeholder || `Select ${field.label}`}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          );
        case "number":
          return (
            <Input
              type="number"
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue as number}
              onChange={(e) => form.setValue(field.id, Number(e.target.value))}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
              className="w-full"
            />
          );
        default:
          return null;
      }
    };

    // If we have form fields, render the structured form
    if (fields?.length) {
      return (
        <form
          onSubmit={form.handleSubmit((data) => onSubmit?.(data))}
          className="space-y-4"
        >
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {field.description}
                </p>
              )}
              {renderFormField(field)}
              {form.formState.errors[field.id]?.message && (
                <p className="text-sm text-red-500">
                  {form.formState.errors[field.id]?.message as string}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            className="rounded-lg p-2 text-primary hover:bg-muted"
          >
            Send
          </button>
        </form>
      );
    }

    // Regular chat editor using PromptInput
    return (
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn("w-full border shadow-lg", className)}
        maxHeight={maxHeight}
      >
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={file.previewUrl}
                className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Paperclip className="size-4" />
                <span className="max-w-[120px] truncate">{file.file.name}</span>
                {file.isUploading ? (
                  <Loading03Icon className="size-4 animate-spin" />
                ) : (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="hover:bg-secondary/50 rounded-full p-1"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <PromptInputTextarea
          placeholder={placeholder || "Ask me anything..."}
          autoFocus={autoFocus}
        />

        <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1">
            <PromptInputAction tooltip="Anonymous mode">
              <button
                onClick={toggleAnonymous}
                className={cn(
                  "hover:bg-secondary-foreground/10 flex h-8 w-8 items-center justify-center rounded-2xl transition-colors",
                  isAnonymous && "bg-muted-foreground/10 text-brand"
                )}
              >
                <HatGlasses className="size-5" />
              </button>
            </PromptInputAction>

            {/* Deep Think Mode Toggle */}
            <PromptInputAction tooltip="Think mode">
              <button
                onClick={toggleDeepThinkMode}
                className={cn(
                  "hover:bg-secondary-foreground/10 flex h-8 w-8 items-center justify-center rounded-2xl transition-colors",
                  isDeepThinkMode && "bg-muted-foreground/10 text-brand"
                )}
              >
                <DeepThinkIcon className="size-5" />
              </button>
            </PromptInputAction>
            {/* File upload */}
            <PromptInputAction tooltip="Attach files">
              <label
                htmlFor="file-upload"
                className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  ref={uploadInputRef}
                  accept="image/*"
                  disabled={uploadedFiles.length >= 5}
                />
                <Paperclip className="text-primary size-5" />
              </label>
            </PromptInputAction>
          </div>

          {/* Submit button */}
          <PromptInputAction
            tooltip={isLoading ? "Stop generation" : "Send message"}
          >
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleSubmit}
              disabled={
                (!input.trim() && uploadedFiles.length === 0) ||
                uploadedFiles.some((f) => f.isUploading)
              }
            >
              {isLoading ? (
                <Square className="size-5 fill-current" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>

        {/* Active mode indicators
        {(isWebSearchEnabled ||
          isDeepThinkMode ||
          (showAnonymous && isAnonymous)) && (
          <div className="flex items-center gap-1 pt-2">
            {isWebSearchEnabled && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                <GlobalSearchIcon className="size-3" />
                <span>Web search</span>
              </div>
            )}
            {isDebateMode && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                <AiBrain01Icon className="size-3" />
                <span>Group mode</span>
              </div>
            )}
            {showAnonymous && isAnonymous && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                <AnonymousIcon className="size-3" />
                <span>Anonymous</span>
              </div>
            )}
          </div>
        )} */}
      </PromptInput>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.placeholder === nextProps.placeholder;
  }
);
