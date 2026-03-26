"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUGGESTED_QUESTION_MAX_LENGTH, SUGGESTED_QUESTION_MAX_COUNT } from "@/utils/constants";
import { DragOverlay } from "@dnd-kit/core";
import { Textarea } from "./ui/textarea";

interface SortableQuestionItemProps {
  id: string;
  question: string;
  index: number;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function SortableQuestionItem({
  id,
  question,
  index,
  onUpdate,
  onRemove,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="space-y-1">
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg bg-background border transition-all",
          isDragging
            ? "opacity-50 shadow-lg border-primary"
            : "hover:border-muted-foreground/50"
        )}
      >
        <button
          type="button"
          className="flex-shrink-0 cursor-grab hover:cursor-grabbing focus:outline-none touch-none p-1 rounded hover:bg-accent transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        <div className="flex-1">
          <Textarea
            placeholder="Enter a question..."
            value={question}
            onChange={(e) => {
              const value = e.target.value.slice(
                0,
                SUGGESTED_QUESTION_MAX_LENGTH
              );
              onUpdate(index, value);
            }}
            className="w-full max-h-[90px] min-h-[30px] py-1"
            maxLength={SUGGESTED_QUESTION_MAX_LENGTH}
            rows={1}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface SuggestedQuestionsEditorProps {
  questions: string[];
  onChange: (questions: string[]) => void;
}

export function SuggestedQuestionsEditor({
  questions,
  onChange,
}: SuggestedQuestionsEditorProps) {
  const [items, setItems] = useState<Array<{ id: string; question: string }>>(
    () =>
      questions.map((q, i) => ({
        id: `question-${i}-${Date.now()}`,
        question: q,
      }))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const isInternalChange = useRef(false);
  const prevQuestionsLength = useRef(questions.length);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const lengthChanged = questions.length !== prevQuestionsLength.current;
    const contentCompletelyDifferent =
      questions.length > 0 &&
      items.length === questions.length &&
      questions.every((q, i) => q !== items[i]?.question);

    if (lengthChanged || contentCompletelyDifferent) {
      setItems(
        questions.map((q, i) => ({
          id: `question-${i}-${Date.now()}`,
          question: q,
        }))
      );
      prevQuestionsLength.current = questions.length;
    }
  }, [questions, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      isInternalChange.current = true;
      onChange(newItems.map((item) => item.question));
    }

    setActiveId(null);
  };

  const handleUpdate = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].question = value;
    setItems(newItems);
    isInternalChange.current = true;
    onChange(newItems.map((item) => item.question));
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    isInternalChange.current = true;
    onChange(newItems.map((item) => item.question));
  };

  const handleAdd = () => {
    if (items.length >= SUGGESTED_QUESTION_MAX_COUNT) {
      return;
    }
    const newItems = [...items, { id: `question-${Date.now()}`, question: "" }];
    setItems(newItems);
    isInternalChange.current = true;
    onChange(newItems.map((item) => item.question));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Custom Questions</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={items.length >= SUGGESTED_QUESTION_MAX_COUNT}
          className="flex items-center gap-2"
        >
          <Plus className="w-3 h-3" />
          Add Question ({items.length}/{SUGGESTED_QUESTION_MAX_COUNT})
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableQuestionItem
                key={item.id}
                id={item.id}
                question={item.question}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border shadow-lg">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 px-3 py-1.5 text-sm">
                {items.find((item) => item.id === activeId)?.question ||
                  "Question"}
              </div>
              <div className="w-8" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
          No questions added yet. Click "Add Question" to get started.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Drag and drop to reorder questions. Users will see these as suggested
        conversation starters.
      </p>
    </div>
  );
}
