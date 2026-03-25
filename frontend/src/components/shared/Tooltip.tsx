import { ReactNode, useState } from "react";

type TooltipProps = {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
};

export default function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span className={`tooltip-bubble ${position}`} role="tooltip">
          {content}
        </span>
      ) : null}
    </span>
  );
}
