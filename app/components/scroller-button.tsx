import type { ReactElement, ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";
import { Button, type ButtonProps } from "./button";
import { useScrollerCanSend, useScrollerDispatch, type ScrollerEvent } from "./scroller";

export type ScrollerButtonProps = Omit<ButtonProps, "disabled" | "onClick"> & {
  onClick: ScrollerEvent;
  render?: ReactElement;
  children: ReactNode;
};

export function ScrollerButton({
  className,
  onClick,
  children,
  render,
  shape,
}: ScrollerButtonProps) {
  const dispatch = useScrollerDispatch();
  const disabled = !useScrollerCanSend(onClick);

  return useRender({
    render: render ?? <Button />,
    props: {
      className,
      disabled,
      onClick: () => dispatch(onClick),
      shape,
      children,
    },
  });
}
