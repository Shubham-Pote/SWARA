"use client";

import { CornerRightUp, Mic } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  onSubmit?: (value: string) => void
  onMicClick?: () => void
  disabled?: boolean
  className?: string
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 52,
  maxHeight = 200,
  onSubmit,
  onMicClick,
  disabled = false,
  className
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [inputValue, setInputValue] = useState("");

  const handleReset = () => {
    if (!inputValue.trim()) return;
    onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto">
        <Textarea
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "max-w-xl bg-white rounded-3xl pl-6 pr-16 shadow-lg border border-gray-200",
            "placeholder:text-gray-500",
            "text-gray-900 text-wrap",
            "overflow-y-auto resize-none",
            "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0 focus-visible:bg-white",
            "transition-all duration-200 ease-out",
            "leading-[1.2] py-[16px]",
            `min-h-[${minHeight}px]`,
            `max-h-[${maxHeight}px]`,
            "[&::-webkit-resizer]:hidden"
          )}
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReset();
            }
          }}
        />

        <button
          onClick={onMicClick}
          type="button"
          disabled={disabled}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-xl bg-gray-100 py-1 px-1 transition-all duration-200 shadow-sm",
            "hover:bg-gray-200 cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            inputValue ? "right-10" : "right-3"
          )}
        >
          <Mic className="w-4 h-4 text-gray-600" />
        </button>
       <button
  onClick={handleReset}
  type="button"
  disabled={disabled || !inputValue.trim()}
  className={cn(
    "absolute top-1/2 -translate-y-1/2 right-3",
    "rounded-xl bg-purple-500 py-1 px-1 shadow-sm",
    "transition-all duration-200",
    "hover:bg-purple-600",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    inputValue && !disabled
      ? "opacity-100 scale-100" 
      : "opacity-0 scale-95 pointer-events-none"
  )}
>
  <CornerRightUp className="w-4 h-4 text-white" />
</button>
      </div>
    </div>
  );
}