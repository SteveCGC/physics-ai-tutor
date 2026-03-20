import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  leadingIcon?: React.ReactNode;
  trailingAdornment?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, trailingAdornment, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="relative">
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle [&_svg]:size-5">
              {leadingIcon}
            </span>
          ) : null}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border bg-bg-card px-4 text-sm text-text-default shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-danger pr-4"
                : "border-border focus-visible:border-[var(--color-primary)]",
              leadingIcon ? "pl-12" : "",
              trailingAdornment ? "pr-12" : "",
              className
            )}
            ref={ref}
            {...props}
          />
          {trailingAdornment ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-subtle [&_button]:pointer-events-auto [&_svg]:size-5">
              {trailingAdornment}
            </span>
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
