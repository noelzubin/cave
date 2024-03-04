import { initTRPC } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { DB, prisma } from "db";
import { Rss, RssParser } from "rss";
import superjson from "superjson";
import { ZodError } from "zod";
import { BookmarkUsecase, IBookmarkUsecase } from "../usecase/bookmark.js";
import { ReviseUsecase, IReviseUsecase } from "../usecase/revise.js";
import { FeedUsecase, IFeedUsecase } from "../usecase/feeds.js";

const db: DB = prisma;
const rss: Rss = new RssParser();
const feedUsecase: IFeedUsecase = new FeedUsecase(
  rss,
  db,
  process.env.YOUTUBE_TOKEN!
);
const bookmarkUsecase: IBookmarkUsecase = new BookmarkUsecase(db);
const reviseUsecase: IReviseUsecase = new ReviseUsecase(db);

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    bookmarkUsecase,
    feedUsecase,
    reviseUsecase
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
