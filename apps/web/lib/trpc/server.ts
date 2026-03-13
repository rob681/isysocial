import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@isysocial/api";

export const trpcServer = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/trpc`,
    }),
  ],
});
