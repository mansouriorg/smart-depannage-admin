// src/components/ui/button.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // J'ai ajouté 'gold' à la liste des variantes
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gold";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 1. Styles de base (Transition, Focus, Centrage)
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          
          // 2. Variantes de couleurs (Adaptées à la charte Admin)
          variant === "default" && "bg-blue-950 text-white hover:bg-blue-900/90 shadow-sm",
          
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-600/90 shadow-sm",
          
          variant === "outline" && "border border-stone-200 bg-white hover:bg-stone-100 hover:text-stone-900",
          
          variant === "secondary" && "bg-stone-100 text-stone-900 hover:bg-stone-200/80",
          
          variant === "ghost" && "hover:bg-stone-100 hover:text-stone-900 text-stone-600",
          
          variant === "link" && "text-blue-900 underline-offset-4 hover:underline",
          
          // La variante LUXE (Or)
          variant === "gold" && "bg-gradient-to-r from-[#D4AF37] to-[#B69121] text-white hover:brightness-110 border-none shadow-md",
          
          // 3. Tailles
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 rounded-md px-3",
          size === "lg" && "h-11 rounded-md px-8",
          size === "icon" && "h-10 w-10",
          
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }