import { toast as sonnerToast } from "sonner"

interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export const useToast = () => {
  const toast = ({ title, description, variant }: ToastProps) => {
    const message = description ? `${title}\n${description}` : title
    
    if (variant === "destructive") {
      sonnerToast.error(message)
    } else {
      sonnerToast.success(message)
    }
  }

  return { toast }
}