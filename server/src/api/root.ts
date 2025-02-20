import { feedRouter } from "./routers/feed.ts";
import { createTRPCRouter } from "./trpc.ts";
import { bookmarkRouter } from "./routers/bookmark.ts";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  feed: feedRouter,
  bookmark: bookmarkRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
