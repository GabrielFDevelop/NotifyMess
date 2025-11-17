import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;

export function SelectTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn("select-trigger", className)} {...props}>
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon>
        <ChevronDown size={16} className="text-gray-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn("select-content", className)} {...props}>
        <SelectPrimitive.Viewport className="select-viewport">
          {props.children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn("select-item", className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export const SelectValue = SelectPrimitive.Value;