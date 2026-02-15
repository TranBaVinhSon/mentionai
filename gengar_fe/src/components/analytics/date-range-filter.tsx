"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  initialRange: DateRange;
}

export function DateRangeFilter({ onDateRangeChange, initialRange }: DateRangeFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);
  const [isOpen, setIsOpen] = useState(false);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    onDateRangeChange(newRange);
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange) => {
    const start = range.startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const end = range.endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  const presetRanges = [
    {
      label: "Last 7 days",
      range: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
    },
    {
      label: "Last 30 days",
      range: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
    },
    {
      label: "Last 90 days",
      range: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
    },
    {
      label: "Last year",
      range: {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{formatDateRange(dateRange)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Preset ranges */}
          <div className="border-r p-3">
            <div className="text-sm font-medium mb-2">Quick select</div>
            <div className="space-y-1">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2"
                  onClick={() => handleDateRangeChange(preset.range)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Custom date selection */}
          <div className="p-3">
            <div className="text-sm font-medium mb-2">Custom range</div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Start date</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.startDate}
                    onSelect={(date) => {
                      if (date) {
                        const newRange = { ...dateRange, startDate: date };
                        if (date <= dateRange.endDate) {
                          setDateRange(newRange);
                        }
                      }
                    }}
                    disabled={(date) => date > dateRange.endDate || date > new Date()}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End date</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.endDate}
                    onSelect={(date) => {
                      if (date) {
                        const newRange = { ...dateRange, endDate: date };
                        if (date >= dateRange.startDate) {
                          setDateRange(newRange);
                        }
                      }
                    }}
                    disabled={(date) => date < dateRange.startDate || date > new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleDateRangeChange(dateRange)}
                className="w-full"
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}