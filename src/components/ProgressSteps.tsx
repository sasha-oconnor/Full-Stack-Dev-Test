import { Check } from "lucide-react";

const STEPS = [
  { label: "Customer" },
  { label: "Build" },
  { label: "Summary" },
];

interface ProgressStepsProps {
  step: 1 | 2 | 3;
}

export function ProgressSteps({ step }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full py-2">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const isCompleted = num < step;
        const isActive = num === step;

        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : num}
              </div>
              <span
                className={`text-[10px] font-medium leading-none ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                {s.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={`w-10 h-px mx-1 mb-3 transition-colors ${
                  num < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
