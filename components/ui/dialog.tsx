"use client";

import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./button";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({ title, description, children, className }: {
  title: string; description: string; children: ReactNode; className?: string;
}) {
  return <Primitive.Portal>
    <Primitive.Overlay className="dialog-overlay" />
    <Primitive.Content className={cn("dialog-content", className)}>
      <Primitive.Title className="dialog-title">{title}</Primitive.Title>
      <Primitive.Description className="dialog-description">{description}</Primitive.Description>
      <Primitive.Close className="dialog-x" aria-label="Close dialog"><X size={19} /></Primitive.Close>
      {children}
    </Primitive.Content>
  </Primitive.Portal>;
}
