"use client";

import * as React from "react";
import { X } from "lucide-react"; // Ensure you have lucide-react installed

// 1. Create Context to manage state between components
interface DialogContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The id of the title, which names the dialog for screen readers. */
  titleId: string;
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
  const titleId = React.useId();
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: !!isOpen, setOpen: setIsOpen || (() => {}), titleId }}>
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

/** What the Tab key can reach inside the dialog. */
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogContent({ children, className = "" }: DialogContentProps) {
  const { open, setOpen, titleId } = useDialog();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  // Handle Escape Key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Focus goes into the dialog when it opens (so a keyboard user does not have to cross the page
  // behind it) and back to the button that opened it when it closes. When that button is gone (the
  // row left the list: the job was assigned), it goes to the element the page marks as its fallback
  // (data-dialog-fallback, the page title), not to nowhere.
  React.useEffect(() => {
    if (!open) return;

    const before = document.activeElement as HTMLElement | null;

    boxRef.current?.focus();

    return () => {
      const back = before && before !== document.body && before.isConnected && typeof before.focus === "function" ? before : null;

      (back ?? document.querySelector<HTMLElement>("[data-dialog-fallback]"))?.focus();
    };
  }, [open]);

  // Tab stays inside the dialog. The listener is on the document, not on the dialog: when the control
  // that had the focus becomes disabled (the confirm button while it saves), the focus falls to the
  // page and no key event reaches the dialog any more, but this one still does and brings it back.
  React.useEffect(() => {
    if (!open) return;

    const keepFocusInside = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const box: HTMLDivElement | null = boxRef.current;

      if (!box) return;

      const items: HTMLElement[] = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));

      if (items.length === 0) {
        e.preventDefault();
        box.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!box.contains(active) || (e.shiftKey && (active === first || active === box))) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInside);

    return () => document.removeEventListener("keydown", keepFocusInside);
  }, [open]);

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
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-50 w-full rounded-lg border bg-white p-6 shadow-lg outline-none animate-in fade-in zoom-in-95 duration-200 sm:rounded-xl ${className}`}
      >
        {children}
        
        {/* Close 'X' Button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
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
  const { titleId } = useDialog();

  return (
    <h2 id={titleId} className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`}>
      {children}
    </h2>
  );
}
