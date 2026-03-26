"use client";

import { useState } from "react";
import { Model } from "../../../app/(tools)/tools/llm-comparison/types";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModelMultiSelectProps {
  models: Model[];
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  maxSelections?: number;
}

const ModelMultiSelect = ({
  models,
  selectedModels,
  setSelectedModels,
  maxSelections = 5,
}: ModelMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const modelCategories = [
    {
      name: "OpenAI Models",
      prefix: "GPT-",
      identifier: (name: string) => name.toUpperCase().startsWith("GPT-"),
    },
    {
      name: "Google Models",
      prefix: "Gemini",
      identifier: (name: string) => name.toUpperCase().includes("GEMINI"),
    },
    {
      name: "Anthropic Models",
      prefix: "Claude",
      identifier: (name: string) => name.toUpperCase().includes("CLAUDE"),
    },
  ];

  const getModelsByCategory = () => {
    const categorizedModels: { [key: string]: Model[] } = {};
    const assignedModels = new Set<string>();

    modelCategories.forEach((category) => {
      categorizedModels[category.name] = [];
      models.forEach((model) => {
        if (
          !assignedModels.has(model.name) &&
          category.identifier(model.name)
        ) {
          categorizedModels[category.name].push(model);
          assignedModels.add(model.name);
        }
      });
    });

    categorizedModels["Others"] = [];
    models.forEach((model) => {
      if (!assignedModels.has(model.name)) {
        categorizedModels["Others"].push(model);
      }
    });

    return Object.entries(categorizedModels)
      .map(([categoryName, categoryModels]) => ({
        category: categoryName,
        models: categoryModels.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((categoryGroup) => categoryGroup.models.length > 0)
      .sort((a, b) => {
        const order = [
          "OpenAI Models",
          "Google Models",
          "Anthropic Models",
          "Others",
        ];
        return order.indexOf(a.category) - order.indexOf(b.category);
      });
  };

  const toggleModel = (modelName: string) => {
    const currentSelected = Array.isArray(selectedModels) ? selectedModels : [];

    if (currentSelected.includes(modelName)) {
      setSelectedModels(currentSelected.filter((item) => item !== modelName));
    } else {
      if (currentSelected.length < maxSelections) {
        setSelectedModels([...currentSelected, modelName]);
      }
    }
  };

  const removeModel = (modelName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedModels(selectedModels.filter((item) => item !== modelName));
  };

  const modelsByCategory = getModelsByCategory();

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedModels.length > 0
              ? `${selectedModels.length} model${
                  selectedModels.length > 1 ? "s" : ""
                } selected`
              : "Select models to compare..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandList>
              {modelsByCategory.map((category) => (
                <CommandGroup
                  key={category.category}
                  heading={category.category}
                >
                  {category.models.map((model) => (
                    <CommandItem
                      key={model.name}
                      value={model.name}
                      onSelect={() => toggleModel(model.name)}
                      disabled={
                        selectedModels.length >= maxSelections &&
                        !selectedModels.includes(model.name)
                      }
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModels.includes(model.name)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-sm text-gray-500 truncate max-w-md">
                          {model.description}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {selectedModels.length >= maxSelections && (
                <div className="p-2 text-sm text-amber-600 bg-amber-50">
                  Maximum of {maxSelections} models can be selected at once.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {selectedModels.map((modelName) => {
          const model = models.find((m) => m.name === modelName);
          if (!model) return null;

          return (
            <Badge key={modelName} variant="secondary" className="py-2">
              {model.name}
              <button
                className="h-4 w-4 p-0 ml-2 bg-transparent border-0 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => removeModel(modelName, e)}
                aria-label={`Remove ${model.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default ModelMultiSelect;
