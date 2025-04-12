// Simplified toast implementation for this demo

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast(props: ToastProps) {
  // In a real implementation, this would be handled by a toast library
  console.log("Toast:", props.title, props.description, props.variant)
} 