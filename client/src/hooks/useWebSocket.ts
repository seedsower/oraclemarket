import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const simulateUpdates = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    }, 30000);

    return () => clearInterval(simulateUpdates);
  }, [queryClient]);
}
