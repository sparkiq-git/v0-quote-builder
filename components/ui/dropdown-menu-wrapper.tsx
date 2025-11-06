"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/**
 * Client-side wrapper for DropdownMenu to ensure proper context preservation
 * when used within Server Components.
 * 
 * This wrapper ensures that:
 * 1. The entire dropdown tree is client-side rendered
 * 2. React Context is properly preserved
 * 3. Hydration issues are avoided
 * 
 * Usage:
 * ```tsx
 * <DropdownMenuWrapper>
 *   <DropdownMenuTrigger>Open</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Item 1</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenuWrapper>
 * ```
 */
interface DropdownMenuWrapperProps {
  children: React.ReactNode;
  modal?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenuWrapper({
  children,
  modal = false,
  defaultOpen,
  open,
  onOpenChange,
}: DropdownMenuWrapperProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only render the dropdown after hydration to avoid SSR/hydration mismatches
  if (!mounted) {
    return <>{children}</>;
  }

  // Find DropdownMenu, DropdownMenuTrigger, and DropdownMenuContent in children
  const childrenArray = React.Children.toArray(children);
  let trigger: React.ReactNode = null;
  let content: React.ReactNode = null;
  let otherChildren: React.ReactNode[] = [];

  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      // Check if it's a DropdownMenuTrigger or DropdownMenuContent
      const childType = (child.type as any)?.displayName || (child.type as any)?.name;
      
      if (childType === "DropdownMenuTrigger" || 
          (typeof child.type === "object" && (child.type as any)?.$$typeof)) {
        // Check if it's wrapped in DropdownMenuTrigger
        const props = child.props as any;
        if (props?.asChild || childType === "DropdownMenuTrigger") {
          trigger = child;
          return;
        }
      }
      
      // Check if it's DropdownMenuContent by looking for specific props
      if (child.props?.side !== undefined || child.props?.align !== undefined) {
        content = child;
        return;
      }
    }
    
    otherChildren.push(child);
  });

  // If we can't find the structure, just wrap in DropdownMenu
  if (!trigger || !content) {
    return (
      <DropdownMenu
        modal={modal}
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onOpenChange}
      >
        {children}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu
      modal={modal}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger}
      {content}
      {otherChildren}
    </DropdownMenu>
  );
}

