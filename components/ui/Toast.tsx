"use client";

import React from "react";
import { Toaster, toast } from "react-hot-toast";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import Icon from "./Icon";

export type ToastType = "success" | "error" | "warning" | "info";

export const showToast = {
  success: (message: string) =>
    toast.success(message, {
      icon: <Icon icon={CheckCircle} size="sm" className="text-green-500" />,
      style: {
        background: "rgb(34 197 94)",
        color: "white",
        border: "1px solid rgb(22 163 74)",
      },
    }),

  error: (message: string) =>
    toast.error(message, {
      icon: <Icon icon={XCircle} size="sm" className="text-red-500" />,
      style: {
        background: "rgb(239 68 68)",
        color: "white",
        border: "1px solid rgb(220 38 38)",
      },
    }),

  warning: (message: string) =>
    toast(message, {
      icon: <Icon icon={AlertCircle} size="sm" className="text-yellow-500" />,
      style: {
        background: "rgb(245 158 11)",
        color: "white",
        border: "1px solid rgb(217 119 6)",
      },
    }),

  info: (message: string) =>
    toast(message, {
      icon: <Icon icon={Info} size="sm" className="text-blue-500" />,
      style: {
        background: "rgb(59 130 246)",
        color: "white",
        border: "1px solid rgb(37 99 235)",
      },
    }),
};

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: "500",
          padding: "12px 16px",
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        },
        success: {
          iconTheme: {
            primary: "rgb(34 197 94)",
            secondary: "white",
          },
        },
        error: {
          iconTheme: {
            primary: "rgb(239 68 68)",
            secondary: "white",
          },
        },
      }}
    />
  );
}

export default ToastProvider;