import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appRouter, createContext } from "@isysocial/api";

// Bump to 5 min (Vercel Pro max) — TikTok FILE_UPLOAD publishes can stream
// multi-MB videos through this function, which blows past the default 60s
// on slow upstreams. Other mutations finish in ms and aren't affected.
export const maxDuration = 300;

const handler = async (req: Request) => {
  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createContext(
        session
          ? {
              user: {
                id: (session.user as any).id,
                email: session.user?.email ?? "",
                name: session.user?.name ?? "",
                role: (session.user as any).role ?? "",
                agencyId: (session.user as any).agencyId,
                clientProfileId: (session.user as any).clientProfileId,
                editorProfileId: (session.user as any).editorProfileId,
                permissions: (session.user as any).permissions ?? [],
              },
            }
          : null
      ),
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("[tRPC] Server error:", error);
      }
    },
  });
};

export { handler as GET, handler as POST };
