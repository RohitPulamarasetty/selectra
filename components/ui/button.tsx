import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export function Button({ variant = "default", size = "default", asChild, className, ...props }: React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
  asChild?: boolean;
}) {
  const Tag = asChild ? Slot : "button";
  return <Tag className={cn("button", `button-${variant}`, `button-${size}`, className)} {...props} />;
}
