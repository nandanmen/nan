import type { ComponentProps } from "react";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { useScrollerDispatch, type ScrollerEvent } from "../../../components/scroller";
import { sixthNodeAddedAtom } from "./little-internet-events";

type LittleInternetButtonProps = ComponentProps<"button"> & {
  event: ScrollerEvent;
};

export function LittleInternetButton({
  event,
  children,
  className,
  disabled,
  onClick,
  ...props
}: LittleInternetButtonProps) {
  const dispatch = useScrollerDispatch();
  const sixthNodeAdded = useAtomValue(sixthNodeAddedAtom);
  const completed = event.type === "add" && sixthNodeAdded;

  return (
    <button
      {...props}
      type="button"
      className={cn(
        "w-fit rounded bg-gray-12 border-t-2 border-gray-11 px-4 py-2 text-gray-1 font-medium cursor-pointer hover:bg-gray-11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-12 disabled:opacity-50 disabled:cursor-default",
        className,
      )}
      disabled={disabled || completed}
      onClick={(eventObject) => {
        onClick?.(eventObject);
        if (!eventObject.defaultPrevented) dispatch(event);
      }}
    >
      {children}
    </button>
  );
}
