import { useState } from "react"

export interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

let toastFunction: ((props: ToastProps) => void) | null = null

export function setToastFunction(fn: (props: ToastProps) => void) {
  toastFunction = fn
}

export function toast(props: ToastProps) {
  if (toastFunction) {
    toastFunction(props)
  } else {
    // Fallback to console or basic alert
    console.log('Toast:', props.title, props.description)
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const showToast = (props: ToastProps) => {
    setToasts(prev => [...prev, props])
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 3000)
  }

  // Set the global toast function
  if (!toastFunction) {
    setToastFunction(showToast)
  }

  return {
    toast: showToast,
    toasts,
    dismiss: (index: number) => {
      setToasts(prev => prev.filter((_, i) => i !== index))
    }
  }
}