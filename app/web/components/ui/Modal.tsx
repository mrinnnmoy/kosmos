"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-surface p-6",
            "shadow-2xl outline-none"
          )}
        >
          <Dialog.Title className="font-heading text-xl font-semibold text-foreground">
            {title}
          </Dialog.Title>
          <div className="mt-4"> {children} </div>
          <Dialog.Close className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
