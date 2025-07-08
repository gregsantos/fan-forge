import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-lg border border-input bg-input/50 backdrop-blur-sm px-4 py-3 text-sm ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:border-primary focus:bg-background hover:border-primary/60 hover:bg-input/70 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-muted-foreground/80 dark:text-foreground",
            error && "border-destructive focus-visible:ring-destructive hover:border-destructive/60",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }