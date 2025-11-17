import * as React from "react";
import { cn } from "../../lib/utils";

type Toast = { id: number; title: string; description?: string; variant?: "success" | "error" | "info" };

const ToastContext = React.createContext<{ show: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const show = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "toast",
              t.variant === "success" && "toast-success",
              t.variant === "error" && "toast-error",
              (!t.variant || t.variant === "info") && "toast-info"
            )}
          >
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}