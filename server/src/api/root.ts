import { feedRouter } from "./routers/feed.js";
import { createTRPCRouter } from "./trpc.js";
import { bookmarkRouter } from "./routers/bookmark.js";

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
