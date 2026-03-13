import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@isysocial/api";

export const trpc = createTRPCReact<AppRouter>();
