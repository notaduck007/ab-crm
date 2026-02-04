import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: number | string;
  onChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Format number with commas for display
    const formatNumber = (num: number): string => {
      if (num === 0) return "";
      return new Intl.NumberFormat("en-US").format(num);
    };

    // Parse string with commas back to number
    const parseNumber = (str: string): number => {
      const cleaned = str.replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Update display value when external value changes
    React.useEffect(() => {
      if (!isFocused) {
        const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
        setDisplayValue(formatNumber(numValue));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty or just formatting characters
      if (inputValue === "" || inputValue === "$") {
        setDisplayValue("");
        onChange(0);
        return;
      }

      // Remove non-numeric characters except commas and decimal
      const cleanedForDisplay = inputValue.replace(/[^0-9,.-]/g, "");
      setDisplayValue(cleanedForDisplay);

      // Parse and emit the numeric value
      const numericValue = parseNumber(inputValue);
      onChange(numericValue);
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number on focus for easier editing
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
      if (numValue > 0) {
        setDisplayValue(numValue.toString());
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Re-format with commas on blur
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
      setDisplayValue(formatNumber(numValue));
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
