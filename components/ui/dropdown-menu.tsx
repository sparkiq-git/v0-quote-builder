"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";

type DropdownMenuContextValue = {
  trigger: HTMLElement | null;
  setTrigger: (node: HTMLElement | null) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

/**
 * Fix for Radix UI Dropdown positioning in Next.js App Router (production/SSR)
 * 
 * Problem: Dropdowns appear at (0,0) or don't appear due to SSR/hydration issues.
 * 
 * Solution:
 * 1. Use `useLayoutEffect` to force position recalculation after mount/hydration
 * 2. Add mounted state check to prevent portal rendering until after hydration
 * 3. Ensure proper context synchronization between Trigger and Content
 * 4. Force position update after DOM is ready (fonts, layout, etc.)
 */

/* Root with proper hydration handling */
function DropdownMenuRoot({
  onOpenChange,
  modal = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  const [mounted, setMounted] = React.useState(false);
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    onOpenChange?.(open);
    
    if (open && mounted) {
      // Force position recalculation after opening
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Trigger a resize event to force Floating UI to recalculate
          window.dispatchEvent(new Event("resize"));
          // Also force a reflow by reading layout properties
          if (typeof document !== "undefined") {
            document.body.offsetHeight;
          }
        });
      });
    }
  }, [onOpenChange, mounted]);

  const contextValue = React.useMemo(
    () => ({
      trigger,
      setTrigger,
    }),
    [trigger],
  );

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <DropdownMenuPrimitive.Root
        data-slot="dropdown-menu"
        modal={modal}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ ...props }, forwardedRef) => {
  const context = React.useContext(DropdownMenuContext);

  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
      context?.setTrigger(node);
    },
    [forwardedRef, context],
  );

  return (
    <DropdownMenuPrimitive.Trigger
      ref={setRefs}
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
});

DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

function DropdownMenuContent({
  className,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  avoidCollisions = true,
  collisionPadding = 8,
  sticky = "always",
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const [mounted, setMounted] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const cleanupAutoUpdateRef = React.useRef<(() => void) | null>(null);
  const context = React.useContext(DropdownMenuContext);

  // Ensure we only render after hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Force position recalculation when dropdown opens
  // This handles the SSR/hydration timing issue
  const handleOpenAutoFocus = React.useCallback((event: Event) => {
    // Call original handler if provided
    if (onOpenAutoFocus) {
      onOpenAutoFocus(event);
    }

    // Force Floating UI to recalculate position after hydration
    // Wait for next frame to ensure DOM is fully ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Trigger resize event to force Floating UI recalculation
        window.dispatchEvent(new Event("resize"));
        
        // Force a reflow by reading layout properties
        if (typeof document !== "undefined") {
          void document.body.offsetHeight;
        }

        // Find the content element and force position update
        const contentElement = document.querySelector(
          '[data-slot="dropdown-menu-content"][data-state="open"]'
        ) as HTMLElement;
        
        if (contentElement) {
          // Trigger a layout recalculation
          void contentElement.offsetHeight;
          
          // Dispatch a custom event that Floating UI might listen to
          contentElement.dispatchEvent(new Event("positionupdate"));
        }
      });
    });
  }, [onOpenAutoFocus]);

  // Additional position update on mount if content is already open
  // This handles cases where the dropdown opens before hydration completes
  React.useLayoutEffect(() => {
    if (!mounted) return;

    // Check if any dropdown content is already open
    const contentElement = document.querySelector(
      '[data-slot="dropdown-menu-content"][data-state="open"]'
    ) as HTMLElement;

    if (contentElement) {
      // Force position recalculation for already-open dropdowns
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
          void contentElement.offsetHeight;
        });
      });
    }
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const wrapper = contentElement.parentElement as HTMLElement | null;
    if (!wrapper) return;

    const placement =
      align && align !== "center"
        ? (`${side}-${align}` as const)
        : (side as const);

    const middleware = [
      offset(sideOffset),
      flip(),
      shift({ padding: collisionPadding }),
    ];

    const updatePosition = () => {
      const triggerElement = context?.trigger;
      if (!triggerElement) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[DropdownMenu] Unable to position content; trigger ref missing.");
        }
        return;
      }

      computePosition(triggerElement, contentElement, {
        placement,
        middleware,
      }).then(({ x, y }) => {
        wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };

    const startAutoUpdate = () => {
      const triggerElement = context?.trigger;
      if (!triggerElement) return;

      cleanupAutoUpdateRef.current?.();
      cleanupAutoUpdateRef.current = autoUpdate(
        triggerElement,
        contentElement,
        updatePosition
      );

      updatePosition();
    };

    const stopAutoUpdate = () => {
      cleanupAutoUpdateRef.current?.();
      cleanupAutoUpdateRef.current = null;
    };

    const handleStateChange = () => {
      if (contentElement.dataset.state === "open") {
        startAutoUpdate();
      } else {
        stopAutoUpdate();
      }
    };

    const observer = new MutationObserver(handleStateChange);
    observer.observe(contentElement, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    // run once in case it's already open
    handleStateChange();

    return () => {
      observer.disconnect();
      stopAutoUpdate();
    };
  }, [mounted, side, align, sideOffset, collisionPadding, context?.trigger]);

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={contentRef}
        data-slot="dropdown-menu-content"
        side={side}
        align={align}
        sideOffset={sideOffset}
        avoidCollisions={avoidCollisions}
        collisionPadding={collisionPadding}
        sticky={sticky as any}
        onOpenAutoFocus={handleOpenAutoFocus}
        className={cn(
          "bg-popover text-popover-foreground pointer-events-auto",
          "z-[10000] max-h-[var(--radix-dropdown-menu-content-available-height)]",
          "min-w-[8rem] origin-[var(--radix-dropdown-menu-content-transform-origin)]",
          "overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground",
        "data-[variant=destructive]:text-destructive",
        "data-[variant=destructive]:focus:bg-destructive/10",
        "dark:data-[variant=destructive]:focus:bg-destructive/20",
        "data-[variant=destructive]:focus:text-destructive",
        "data-[variant=destructive]:*:[svg]:!text-destructive",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        "outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground",
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm",
        "outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground",
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm",
        "outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden",
        "select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground",
        "z-[10000] min-w-[8rem] origin-[var(--radix-dropdown-menu-content-transform-origin)]",
        "overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenuRoot as DropdownMenu,         // exportamos nuestro Root con fixes
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
