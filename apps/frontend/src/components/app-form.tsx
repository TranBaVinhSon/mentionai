import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { FormField } from "@/services/api";
import { cn } from "@/lib/utils";
import { ArrowRight as ArrowRight02Icon } from "lucide-react";
import { Textarea } from "./ui/textarea";

type FormValues = Record<string, string | number>;

interface AppFormProps {
  fields: FormField[];
  onSubmit: (values: FormValues) => void;
  className?: string;
}

const generateZodSchema = (fields: FormField[]) => {
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
        fieldSchema = fieldSchema.regex(new RegExp(field.validation.pattern));
      }
      schemaObj[field.id] = field.required
        ? fieldSchema
        : fieldSchema.optional();
    }
  });

  return z.object(schemaObj);
};

export function AppForm({ fields, onSubmit, className }: AppFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(generateZodSchema(fields)),
    defaultValues: fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.id]: field.defaultValue || "",
      }),
      {} as FormValues
    ),
  });

  const renderFormField = (field: FormField) => {
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
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={fieldValue as string}
            onChange={(e) => form.setValue(field.id, e.target.value)}
            required={field.required}
            className="w-full"
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

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("space-y-4", className)}
    >
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          {/* {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )} */}
          {renderFormField(field)}
          {form.formState.errors[field.id]?.message && (
            <p className="text-sm text-red-500">
              {form.formState.errors[field.id]?.message as string}
            </p>
          )}
        </div>
      ))}
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-sidebar-primary text-white rounded-lg items-center justify-center flex gap-1 px-2 py-1"
        >
          <p className="text-sm">Send</p>
          <ArrowRight02Icon size={18} />
        </button>
      </div>
    </form>
  );
}
