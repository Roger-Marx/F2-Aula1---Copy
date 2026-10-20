import type { ReactNode } from "react";

type AlertTone = "error" | "info" | "success";

const toneClasses: Record<AlertTone, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-indigo-200 bg-indigo-50 text-indigo-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function Alert({
  tone = "error",
  children,
}: {
  tone?: AlertTone;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}
