import type { DB } from "db";
import type { Prisma } from "db/node_modules/@prisma/client";
// import pLimit from 'p-limit';
import type { Rss } from "rss";
import { Youtube } from "youtube";

// const limit = pLimit(5);

export interface Feed {
  id: number;
  title: string;
  feedLink: string;
  link?: string;
  folderId: number;
  unreadCount: number;
}

export interface Folder {
  id: number;
  name: string;
}

export interface CreateFeedInput {
  url: string;
  folderId?: number;
}

export interface Entry {
  id: number;
  title: string;
  read: boolean;
  link: string;
  pubTime: Date;
  feedId: number;
}

export interface PaginatedEntries {
  total: number;
  entries: Entry[];
}

export interface ListEntriesInput {
  feedId?: number;
  skip?: number;
  take?: number;
  query?: string;
  showRead?: boolean;
}

export interface IFeedUsecase {
  // Add a new feed to given folder
  addFeed(url: string, folder: string): Promise<Feed>;
  // Update a feed
  updateFeed(id: number, refresh?: boolean, folder?: number): Promise<Feed>;
  // List all feeds
  listFeeds(): Promise<Feed[]>;
  // Delete a feed by id
  deleteFeed(id: number): Promise<Feed>;
  // Add a new folder
  addFolder(name: string): Promise<Folder>;
  // List all folders
  listFolders(): Promise<Folder[]>;
  // List all entries in a folder
  listEntries(input: ListEntriesInput): Promise<PaginatedEntries>;
  // Set given entry's `read` status
  setEntryRead(id: number, read: boolean): Promise<Entry>;
  // Fill youtube feed will all videos. Including the ones not in the RSS feed response.
  youtubeFillVideos(feedId: number): Promise<void>;
  // Refresh all the RSS Feeds
  refreshFeeds(feedIds: number[]): Promise<void>;
}

const DEFAULT_PAGE_SIZE = 20;
export class FeedUsecase implements IFeedUsecase {
  rss: Rss;
  db: DB;
  youtube: Youtube;

  constructor(rss: Rss, prisma: DB, youtubeToken: string) {
    this.rss = rss;
    this.db = prisma;
    this.youtube = new Youtube(youtubeToken);
  }

  async setEntryRead(id: number, read: boolean): Promise<Entry> {
    const readAt = read ? new Date() : null;
    const entry = await this.db.entry.update({
      where: { id },
      data: { readAt },
    });
    return {
      id: entry.id,
      title: entry.title,
      read: !!entry.readAt,
      link: entry.link!,
      pubTime: entry.pubDate ?? new Date(),
      feedId: entry.feedId,
    };
  }

  async listEntries(input: ListEntriesInput): Promise<PaginatedEntries> {
    const { feedId, skip, take = DEFAULT_PAGE_SIZE, query, showRead } = input;

    // create where clause
    const where: Prisma.entryWhereInput = feedId == undefined ? {} : { feedId };
    if (query) where.title = { contains: query };
    if (!showRead) where.readAt = null;

    const [entries, total] = await Promise.all([
      this.db.entry.findMany({
        where,
        skip,
        take,
        orderBy: { pubDate: "desc" },
      }),
      this.db.entry.count({ where }),
    ]);

    const parsedEntries = entries.map((e) => ({
      id: e.id,
      title: e.title,
      read: !!e.readAt,
      link: e.link!,
      pubTime: e.pubDate ?? new Date(),
      feedId: e.feedId
    }));

    return {
      entries: parsedEntries,
      total: total,
    };
  }

  async deleteFeed(id: number): Promise<Feed> {
    const resp = await this.db.feed.delete({ where: { id } });
    const feed: Feed = {
      id: resp.id,
      title: resp.title,
      folderId: resp.folderId,
      unreadCount: 0,
      feedLink: resp.feedLink!,
      link: resp.link ?? undefined,
    };
    return feed;
  }

  async addFolder(name: string): Promise<Folder> {
    const folder = await this.db.folder.create({
      data: {
        name: name,
      },
    });

    return folder;
  }

  getDate(date?: string): Date {
    return date ? new Date(date) : new Date();
  }

  async addFeed(url: string, folder: string): Promise<Feed> {
    let feedUrl = url;

    const isYoutube = url.startsWith("https://www.youtube.com");
    if (isYoutube) {
      feedUrl = await this.youtube.getFeedUrl(url);
    }

    const feed = await this.rss.parseRss(feedUrl);

    const resp = await this.db.feed.create({
      data: {
        title: feed.title!,
        feedLink: feedUrl,
        link: isYoutube ? url : feed.link,
        folder: {
          connectOrCreate: {
            create: {
              name: folder,
            },
            where: {
              name: folder,
            },
          },
        },
        entry: {
          create: feed.items.map((item) => ({
            title: item.title!,
            author: item.creator,
            content: item.content,
            description: item.summary,
            link: item.link,
            pubDate: this.getDate(item.isoDate),
          }))
        },
      },
    });

    return {
      id: resp.id,
      title: resp.title,
      folderId: resp.folderId,
      unreadCount: feed.items.length,
      feedLink: resp.feedLink!,
      link: resp.link ?? undefined,
    };
  }

  async youtubeFillVideos(feedId: number): Promise<void> {
    const feed = await this.db.feed.findUnique({
      where: { id: feedId },
      include: { entry: true },
    });
    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }

    const videos = await this.youtube.getVideos(feed.feedLink!);

    const promises = [];

    const addedUrls = new Set(feed.entry.map((entry) => entry.link));

    for (const video of videos) {
      if (!addedUrls.has(video.link)) {
        addedUrls.add(video.link);
        promises.push(
          this.db.entry.create({
            data: {
              title: video.title,
              author: video.author,
              content: video.content,
              description: video.description,
              link: video.link,
              pubDate: video.pubDate,
              feedId: feed.id,
            },
          })
        );
      }
    }

    await Promise.all(promises);
  }

  async listFeeds(): Promise<Feed[]> {
    const feeds = await this.db.feed.findMany({});
    const counts = await this.db.entry.groupBy({
      by: "feedId",
      where: { readAt: null },
      _count: { id: true },
    });

    const countsMap = new Map<number, number>();
    for (const count of counts) {
      countsMap.set(count.feedId, count._count.id);
    }

    return feeds.map((f) => ({
      id: f.id,
      title: f.title,
      folderId: f.folderId,
      unreadCount: countsMap.get(f.id) ?? 0,
      feedLink: f.feedLink!,
      link: f.link ?? undefined,
    }));
  }

  async listFolders(): Promise<Folder[]> {
    const folders = await this.db.folder.findMany({});
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
    }));
  }

  async refreshFeeds(feedIds: number[]): Promise<void> {
    const where: undefined | Prisma.feedWhereInput =
      feedIds.length > 0 ? { id: { in: feedIds } } : undefined;
    const feeds = await this.db.feed.findMany({ where });

    const pool = new PromisePool(5);
    feeds.forEach(async (feed) => {
      pool.addTask(async () => {
        const parsedFeed = await this.rss.parseRss(feed.feedLink!);
        console.log("processing feed", feed.feedLink!);
        const existingEntries = await this.db.entry.findMany({
          where: { feedId: feed.id },
          select: { link: true },
        });

        const existingLinks = new Set(existingEntries.map((e) => e.link));

        await Promise.all(
          parsedFeed.items.map(async (item) => {
            if (!existingLinks.has(item.link!)) {
              await this.db.entry.create({
                data: {
                  feedId: feed.id,
                  title: item.title!,
                  author: item.creator,
                  content: item.content,
                  description: item.summary,
                  link: item.link,
                  pubDate: this.getDate(item.isoDate),
                },
              });
            }
          })
        );

        // Keep only first 500 entires per feed.
        await this.db
          .$queryRaw`delete from entry where feedId = ${feed.id} and id not in (
            select id from entry where feedId = ${feed.id} order by pubDate desc limit 500
        )`;
      });
    });

    await pool.run();
    await this.db.$disconnect();
  }

  async updateFeed(
    id: number,
    refresh?: boolean,
    folder?: number | undefined
  ): Promise<Feed> {
    if (folder !== undefined) {
      await this.db.feed.update({ where: { id }, data: { folderId: folder } });
    }

    if (refresh !== undefined) {
      await this.refreshFeeds([id]);
    }

    const feed = await this.db.feed.findUnique({ where: { id } });
    const feedCount = await this.db.entry.count({
      where: { feedId: id, readAt: null },
    });

    if (!feed) throw new Error("feed not found");

    return {
      id: feed.id,
      title: feed.title,
      folderId: feed.folderId,
      unreadCount: feedCount,
      feedLink: feed.feedLink!,
      link: feed.link ?? undefined,
    };
  }
}

// Run n promises at a time.
class PromisePool {
  maxConcurrent: number;
  currentRunning: number;
  taskQueue: (() => Promise<any>)[];

  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent; // Maximum number of promises to run at a time
    this.taskQueue = []; // Queue of tasks to run
  }

  // Adds a task to the pool
  addTask(task) {
    this.taskQueue.push(task);
  }

  // Executes the tasks in the pool with the concurrency limit
  async run() {
    // A function that executes a single task from the task queue
    const executeTask = async () => {
      if (this.taskQueue.length === 0) {
        console.log("TASK DONE")
        return; // Do nothing if we've hit the concurrency limit or there are no tasks left
      }

      const task = this.taskQueue.shift()!; // Get the next task from the queue

      try {
        await task(); // Execute the task
      } catch (error) {
        console.error(error);
      } finally {
        if (this.taskQueue.length > 0) {
          executeTask(); // Execute the next task if there are more tasks in the queue
        }
      }
    };

    // Start executing tasks up to the maximum concurrency limit
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.maxConcurrent; i++) {
      workers.push(executeTask());
    }

    await Promise.all(workers);
  }
}
