import type { ReactNode } from "react";

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "red" | "green" | "ochre";
}) {
  return <span className={"pill pill--" + tone}>{children}</span>;
}
