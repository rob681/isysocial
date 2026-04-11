"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 60s default: data is considered fresh for 1 minute,
            // eliminating redundant refetches on navigation/tab switches.
            // Individual queries that need fresher data can override this.
            staleTime: 60 * 1000,
            // Keep cached data in memory for 10 minutes after last use (v4: cacheTime)
            cacheTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              if (error?.data?.code === "UNAUTHORIZED") return false;
              if (error?.data?.code === "FORBIDDEN") return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: "/api/trpc",
          fetch: async (url, options) => {
            const res = await fetch(url, options);
            const contentType = res.headers.get("content-type") ?? "";
            if (!res.ok && !contentType.includes("application/json")) {
              if (res.status === 401 || res.redirected) {
                window.location.href = "/login";
                return new Response(
                  JSON.stringify([
                    {
                      error: {
                        message: "Sesión expirada.",
                        code: -32001,
                        data: { code: "UNAUTHORIZED" },
                      },
                    },
                  ]),
                  { status: 401, headers: { "content-type": "application/json" } }
                );
              }
              return new Response(
                JSON.stringify([
                  {
                    error: {
                      message: "Error del servidor.",
                      code: -32603,
                      data: { code: "INTERNAL_SERVER_ERROR" },
                    },
                  },
                ]),
                { status: res.status, headers: { "content-type": "application/json" } }
              );
            }
            return res;
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
