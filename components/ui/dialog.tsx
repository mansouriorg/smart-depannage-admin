"use client";

import * as React from "react";
import { X } from "lucide-react"; // Ensure you have lucide-react installed

// 1. Create Context to manage state between components
interface DialogContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextProps | null>(null);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a <Dialog />");
  }
  return context;
}

// 2. The Root Component
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open, onOpenChange }: DialogProps) {
  // If no state is provided, we maintain internal state (uncontrolled).
  // If state is provided (controlled), we use that.
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: !!isOpen, setOpen: setIsOpen || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
}

// 3. The Trigger (Button) - UPDATED TO FIX TS ERRORS
interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DialogTrigger({ asChild, children, className }: DialogTriggerProps) {
  const { setOpen } = useDialog();

  const handleClick = (e: React.MouseEvent) => {
    // Preserve existing onClick if the child has one
    // Cast to 'any' to safely access props on an unknown child
    const childProps = (children as any)?.props;
    if (childProps?.onClick) {
      childProps.onClick(e);
    }
    setOpen(true);
  };

  // If asChild is true, we clone the immediate child and add our onClick handler
  if (asChild && React.isValidElement(children)) {
    // We cast to ReactElement<any> so TS knows this element accepts props
    const child = children as React.ReactElement<any>;
    
    return React.cloneElement(child, {
      onClick: handleClick,
      className: `${child.props.className || ""} ${className || ""}`.trim(),
    });
  }

  return (
    <button onClick={() => setOpen(true)} className={className}>
      {children}
    </button>
  );
}

// 4. The Content (The actual Modal)
interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  const { open, setOpen } = useDialog();
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // Handle Escape Key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Handle Scroll Lock
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  // Handle Click Outside (Backdrop)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      />
      
      {/* Modal Box */}
      <div 
        className={`relative z-50 w-full rounded-lg border bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200 sm:rounded-xl ${className}`}
      >
        {children}
        
        {/* Close 'X' Button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

// 5. Header Wrapper
export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ""}`}>
      {children}
    </div>
  );
}

// 6. Title Wrapper
export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`}>
      {children}
    </h2>
  );
}