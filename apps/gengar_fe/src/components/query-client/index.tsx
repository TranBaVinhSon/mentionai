"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { getQueryClient } from "./get-query-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
