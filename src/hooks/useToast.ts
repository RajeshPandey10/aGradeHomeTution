import { useMemo } from "react";
import { toast } from "sonner";

export function useToast() {
  return useMemo(() => ({
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
    info: (message: string) => toast.info(message),
    dismiss: () => toast.dismiss(),
  }), []);
}
