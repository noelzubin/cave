import { initTRPC } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { type DB, prisma } from "../../lib/db/index.ts";
import { type Rss, RssParser } from "../../lib/rss/index.ts";
import superjson from "superjson";
import { ZodError } from "zod";
import { BookmarkUsecase, type IBookmarkUsecase } from "../usecase/bookmark.ts";
import { FeedUsecase, type IFeedUsecase } from "../usecase/feeds.ts";

const db: DB = prisma;
const rss: Rss = new RssParser();
const feedUsecase: IFeedUsecase = new FeedUsecase(
  rss,
  db,
  process.env.YOUTUBE_TOKEN!
);
const bookmarkUsecase: IBookmarkUsecase = new BookmarkUsecase(db);

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    bookmarkUsecase,
    feedUsecase,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;
