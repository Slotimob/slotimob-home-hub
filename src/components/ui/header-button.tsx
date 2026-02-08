import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderButtonProps extends ButtonProps {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  /** Breakpoint at which to show text. Defaults to "sm" */
  showTextAt?: "sm" | "lg" | "md" | "xl";
  /** If true, button stays icon-only until showTextAt breakpoint */
  iconOnly?: boolean;
}

const HeaderButton = React.forwardRef<HTMLButtonElement, HeaderButtonProps>(
  ({ className, icon, children, showTextAt = "md", iconOnly = false, variant, ...props }, ref) => {
    const textBreakpoint = showTextAt;
    const textVisibilityClass = `hidden ${textBreakpoint}:inline`;
    
    // For icon-only responsive buttons
    if (iconOnly) {
      return (
        <Button
          ref={ref}
          variant={variant}
          size="icon"
          className={cn(
            `h-8 w-8 sm:h-9 sm:w-9 ${textBreakpoint}:h-9 ${textBreakpoint}:w-auto ${textBreakpoint}:px-3`,
            className
          )}
          {...props}
        >
          {icon}
          {children && <span className={cn(textVisibilityClass, `${textBreakpoint}:ml-2`)}>{children}</span>}
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        size="sm"
        className={cn("h-8 sm:h-9", className)}
        {...props}
      >
        {icon}
        {children && <span className={cn(textVisibilityClass, `${textBreakpoint}:ml-2`)}>{children}</span>}
      </Button>
    );
  }
);

HeaderButton.displayName = "HeaderButton";

export { HeaderButton };
