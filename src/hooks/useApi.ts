import { useState, useCallback } from "react";
import { getErrorMessage } from "@/services/api";
import { useToast } from "./useToast";

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const execute = useCallback(async (fn: () => Promise<{ data: T }>, options?: { loadingMsg?: string; successMsg?: string }) => {
    setLoading(true);
    setError(null);
    const toastId = options?.loadingMsg ? toast.loading(options.loadingMsg) : undefined;
    try {
      const result = await fn();
      setData(result.data);
      if (options?.successMsg) toast.success(options.successMsg);
      return result.data;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
      if (toastId) toast.dismiss();
    }
  }, [toast]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
}

export function useFetch<T>() {
  const { data, loading, error, execute } = useApi<T>();

  const fetch = useCallback(async (fn: () => Promise<{ data: T }>) => {
    return execute(fn);
  }, [execute]);

  return { data, loading, error, fetch };
}
