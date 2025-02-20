import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { DB, prisma } from "db";
import fastify from "fastify";
import path from "path";
import { Rss, RssParser } from "../lib/rss/index.ts";
import { appRouter } from "./api/root.js";
import { createContext } from "./api/trpc.js";
import { BookmarkUsecase, IBookmarkUsecase } from "./usecase/bookmark.js";
import { FeedUsecase, IFeedUsecase, ListEntriesInput } from "./usecase/feeds.js";
import {
  command,
  binary,
  run,
  string,
  number,
  positional,
  option,
  subcommands,
} from "cmd-ts";
import chalk from 'chalk';

/**
 * This is the main entry point of the cave cli.
 * To run: build the project then run `node .next/root.js help`
 */
const db: DB = prisma;
const rss: Rss = new RssParser();
const feedUsecase: IFeedUsecase = new FeedUsecase(
  rss,
  db,
  process.env.YOUTUBE_TOKEN!
);
const bookmarkUsecase: IBookmarkUsecase = new BookmarkUsecase(db);

// Add a new feed url
const add = command({
  name: "add",
  description: "Add a Feed",
  args: {
    url: positional({ type: string, displayName: "url" }),
    folder: option({
      type: string,
      long: "folder",
      defaultValue: () => "Uncategorized",
    }),
  },
  handler: async ({ url, folder }) => {
    const feed = await feedUsecase.addFeed(url, folder);
    console.log(`Added new feed ${chalk.bgGreen(feed.id)}: ${chalk.bgBlue(feed.title)}`);
  },
});


// Fill all previous videos in the feed using YOUTUBE API    
const youtubeFill = command({
  name: "youtube-fill",
  description: "Fill in all videos from a channel",
  args: {
    feedId: positional({ type: number, displayName: "feedId" }),
  },
  handler: async ({ feedId }) => {
    await feedUsecase.youtubeFillVideos(feedId);
  },
});

// List all the feeds
const list = command({
  name: "list",
  description: "List all feeds",
  args: {},
  handler: async () => {
    const feeds = await feedUsecase.listFeeds();
    feeds.forEach(feed => {
      console.log(`${chalk.green(feed.id)}:\t${chalk.blue(feed.title)}`);
    })
  },
});

const entries = command({
  name: "list",
  description: "List all feeds",
  args: {
    feed: option({ type: number, long: "feedId", defaultValue: () => 0 }),
  },
  handler: async ({ feed }) => {
    let input: ListEntriesInput = { feedId: undefined };
    if (feed != 0) input = { feedId: feed };

    const entries = await feedUsecase.listEntries(input);
    entries.entries.forEach(entry => {
      console.log(`${chalk.green(entry.id)}:\t${chalk.blue(entry.title)}`);
    })
  },
});

// Delete a feed 
const del = command({
  name: "del",
  description: "Delete a feed",
  args: {
    id: positional({ type: number, displayName: "id", }),
  },
  handler: async ({ id }) => {
    const feed = await feedUsecase.deleteFeed(id);
    console.log(`Delted feed ${feed.id}:\t${feed.title}`)
  },
});

// Start the cave server 
const server = command({
  name: "server",
  description: "Start the server",
  args: {},
  handler: async () => {
    const server = fastify({
      maxParamLength: 5000,
    });

    server.register(cors, {});

    console.log(path.join(path.resolve(), "/dist/client"))
    server.register(fastifyStatic, {
      prefix: "/",
      root: path.join(path.resolve(), "/dist/client"),
    });

    server.register(fastifyTRPCPlugin, {
      prefix: "/trpc",
      trpcOptions: { router: appRouter, createContext },
    });

    (async () => {
      try {
        console.log("gonna listen");
        await server.listen({ port: 8080 });
        console.log("listeninig on port 8080");
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    })();
  },
});


// Refetch all the feeds.
const refresh = command({
  name: "refresh",
  description: "refresh the feeds",
  args: {
    id: option({ type: number, long: 'id', defaultValue: () => 0 })
  },
  handler: async ({ id }) => {
    const ids = id == 0 ? [] : [id];
    await feedUsecase.refreshFeeds(ids);
  },
});

// Add a new bookmark
const bookmarkAdd = command({
  name: 'add',
  description: 'Add a bookmark',
  args: {
    url: positional({ type: string, displayName: "url" }),
    title: option({
      type: string,
      long: "title",
      defaultValue: () => "",
    }),
  },
  handler: async ({ url, title }) => {
    const bookmark = await bookmarkUsecase.addBookmark(url, title || undefined);
    console.log(bookmark)
  },
});

// Delete a bookmark
const bookmarkDel = command({
  name: 'del',
  description: 'Delete a bookmark',
  args: {
    id: positional({ type: number, displayName: "id" }),
  },
  handler: async ({ id }) => {
    await bookmarkUsecase.deleteBookmark(id);
  },
});

// List all bookmarks
const bookmarkList = command({
  name: 'list',
  description: 'List all bookmarks',
  args: {},
  handler: async () => {
    await bookmarkUsecase.listBookmarks({ skip: 0, take: 50 });
  },
});

// Create a new tag 
const createTag = command({
  name: 'create-tag',
  description: 'Create a new tag',
  args: {
    tag: positional({ type: string, displayName: "tag" })
  },
  handler: async ({ tag }) => {
    await bookmarkUsecase.createTag(tag);
  }
})

// Edit a bookmark
const bookmarkEdit = command({
  name: 'edit',
  description: 'Edit a bookmark',
  args: {
    id: positional({ type: number, displayName: "bookmark-id" }),
    tag: option({
      type: string,
      long: "tag",
      defaultValue: () => "",
    }),
  },
  handler: async ({ id }) => {
    await bookmarkUsecase.editBookmark(id, { tagIds: [1] });
  }
})

const bookmark = subcommands({
  name: "bookmarks",
  description: "Manage bookmarks",
  cmds: {
    'add': bookmarkAdd,
    'del': bookmarkDel,
    'list': bookmarkList,
    'edit': bookmarkEdit,
    'create-tag': createTag,
  }
});

const appname = subcommands({
  name: "cave",
  description: "My personal dashboard",
  cmds: { bookmark, add, del, server, list, entries, refresh, 'youtube-fill': youtubeFill },
});

run(binary(appname), process.argv).then(console.log).catch(console.error);


