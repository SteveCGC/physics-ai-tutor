"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type Listener = (items: ToastItem[]) => void;

let store: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(store));
}

function pushToast(item: Omit<ToastItem, "id">) {
  const id = crypto.randomUUID();
  store = [...store, { ...item, id }];
  emit();
  window.setTimeout(() => {
    store = store.filter((toast) => toast.id !== id);
    emit();
  }, 3200);
}

export const toast = Object.assign(
  (title: string, description?: string) => pushToast({ title, description, variant: "info" }),
  {
    success: (title: string, description?: string) =>
      pushToast({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      pushToast({ title, description, variant: "error" }),
    info: (title: string, description?: string) =>
      pushToast({ title, description, variant: "info" }),
  }
);

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success/20 bg-bg-card text-text-default",
  error: "border-danger/20 bg-bg-card text-text-default",
  info: "border-border bg-bg-card text-text-default",
};

const variantIcon = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
} satisfies Record<ToastVariant, typeof Info>;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (nextItems) => setItems(nextItems);
    listeners.add(listener);
    listener(store);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => {
        const Icon = variantIcon[item.variant];
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-[16px] border p-4 shadow-md",
              variantClasses[item.variant]
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-strong">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-text-subtle transition-colors hover:bg-primary-soft hover:text-primary"
                onClick={() => {
                  store = store.filter((toast) => toast.id !== item.id);
                  emit();
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
