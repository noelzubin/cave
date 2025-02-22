import type { DB } from "../../lib/db/index.ts";
import type { Prisma } from "../../node_modules/@prisma/client/index.d.ts";
import { run } from "open-graph-scraper";
import ollama from "ollama";

export interface EditBookmarkOptions {
  title?: string;
  imageUrl?: string;
  description?: string;
  tagIds?: number[];
}

export interface Tag {
  id: number;
  name: string;
  count: number;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  imageUrl?: string;
  description?: string;
  faviconUrl?: string;
  tags: number[];
}

export interface ListBookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
}

export interface IBookmarkUsecase {
  // Add a new bookmark
  addBookmark(
    url: string,
    title?: string,
    imageUrl?: string,
    description?: string,
    faviconUrl?: string,
    tags?: string[]
  ): Promise<Bookmark>;
  // Delete a bookmark
  deleteBookmark(id: number): Promise<void>;
  // List bookmarks by input
  listBookmarks(input: ListBookmarksInput): Promise<ListBookmarksResponse>;
  // Create a new tag
  createTag(name: string): Promise<Tag>;
  // Edit a bookmark
  editBookmark(id: number, options: EditBookmarkOptions): Promise<void>;
  // List all tags
  listTags(): Promise<Tag[]>;
  // Bulk add tags to multiple bookmarks.
  bulkUpdateBookmarks(ids: number[], tagIds: number[]): Promise<void>;
  autoAssignTags(): Promise<void>;
}

// Input to filter listing bookmarks
export interface ListBookmarksInput {
  skip?: number; // pagination skip
  take?: number; // pagination pageSize
  tags?: number[]; // Filter by tags
  query?: string; // filter title or url for given query
}

type OptString = string | undefined;

const coalesce = (...args: OptString[]): OptString => {
  for (const arg of args) {
    if (arg?.trim()) return arg;
  }
};

export class BookmarkUsecase implements IBookmarkUsecase {
  db: DB;

  constructor(prisma: DB) {
    this.db = prisma;
  }

  /**
   * Add a new bookmark.
   * By default adds the current url as title and url for the bookmark.
   * If the url is reachable and has metadata, fills those as well into the url
   * asyncrhonously.
   */
  async addBookmark(
    url: string,
    title?: string,
    imageUrl?: string,
    description?: string,
    faviconUrl?: string,
    tags?: string[]
  ) {
    const bookmark = await this.db.bookmark.create({
      data: {
        url,
        title: coalesce(title, url)!,
        imageUrl,
        description,
        faviconUrl,
      },
    });

    const result = {
      id: bookmark.id,
      url: bookmark.url,
      title: bookmark.title,
      imageUrl: bookmark.imageUrl ?? undefined,
      description: bookmark.description ?? undefined,
      faviconUrl: bookmark.faviconUrl ?? undefined,
      tags: [],
    };

    void this.populateBookmark(result);

    return result;
  }

  async populateBookmark(bm: Bookmark) {
    const { result } = await run({ url: bm.url });

    await this.db.bookmark.update({
      where: {
        id: bm.id,
      },
      data: {
        title: coalesce(result.ogTitle, bm.url),
        description: coalesce(bm.description, result.ogDescription),
        faviconUrl: coalesce(bm.faviconUrl, result.favicon),
        imageUrl: coalesce(bm.imageUrl, result.ogImage?.[0]?.url),
      },
    });
  }

  async deleteBookmark(id: number) {
    const bookmark = await this.db.bookmark.delete({
      where: {
        id: id,
      },
    });

    console.log(bookmark);
  }

  async listBookmarks(
    input: ListBookmarksInput
  ): Promise<ListBookmarksResponse> {
    const { skip = 0, take = 50, tags, query } = input;
    const where: Prisma.bookmarkWhereInput = {};
    if (query) where.title = { contains: query };
    if (tags && tags.length > 0)
      where.bookmarkTag = { some: { tagId: { in: tags } } };

    const [bmEntries, count] = await Promise.all([
      this.db.bookmark.findMany({
        skip,
        take,
        where,
        include: {
          bookmarkTag: true,
        },
        orderBy: {
          id: "desc",
        },
      }),
      this.db.bookmark.count({ where }),
    ]);

    const bookmarks = bmEntries.map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url,
      description: b.description ?? undefined,
      faviconUrl: b.faviconUrl ?? undefined,
      imageUrl: b.imageUrl ?? undefined,
      tags: b.bookmarkTag.map((t) => t.tagId),
    }));

    return {
      bookmarks,
      total: count,
    };
  }

  async listTags(): Promise<Tag[]> {
    const results = await this.db.$queryRaw<Tag[]>`
      select t.*, count(bt.tagId)  count from tag t left join bookmarkTag bt on bt.tagId = t.id group by t.id order by count desc
    `;
    return results;
  }

  async createTag(name: string): Promise<Tag> {
    const res = await this.db.tag.upsert({
      update: {},
      create: {
        name,
      },
      where: {
        name: name,
      },
    });
    return { ...res, count: 0 };
  }

  async editBookmark(id: number, options: EditBookmarkOptions): Promise<void> {
    const { title, description, tagIds, imageUrl } = options;
    const oldBookmark = await this.db.bookmark.findFirst({ where: { id } })!;

    if (!oldBookmark) throw new Error("Bookmark not found");

    console.log("Updating bookmark ", options);

    await this.db.bookmark.update({
      where: {
        id: id,
      },
      data: {
        title: coalesce(title, oldBookmark.title),
        description: coalesce(
          description,
          oldBookmark.description ?? undefined
        ),
        imageUrl: coalesce(imageUrl, oldBookmark.imageUrl ?? undefined),
      },
    });

    // delete removed
    await this.db.bookmarkTag.deleteMany({
      where: {
        bookmarkId: id,
      },
    });

    // create all
    await Promise.all(
      (tagIds ?? []).map((t) =>
        this.db.bookmarkTag.create({
          data: {
            bookmarkId: id,
            tagId: t,
          },
        })
      )
    );
  }

  async bulkUpdateBookmarks(ids: number[], tagIds: number[]): Promise<void> {
    console.log("bulk update", ids, tagIds);

    const values: string[] = [];
    ids.forEach((id) =>
      tagIds.forEach((tagId) => {
        values.push(`(${id}, ${tagId})`);
      })
    );

    await this.db.$queryRawUnsafe(`
      INSERT OR IGNORE INTO bookmarkTag (bookmarkId, tagId) VALUES ${values.join(
      ", "
    )}
    `);
  }



  async autoAssignTags(): Promise<void> {
    const tags = await this.db.tag.findMany();

    const tagEmbeddings: TagEmbedddings = {};
    await Promise.all(tags.map(async (tag) => {
      tagEmbeddings[tag.id] = { embeddings: await getEmbeddings(tag.name), name: tag.name };
    }));

    const bookmarks = await this.db.bookmark.findMany({
      include: {
        bookmarkTag: true,
      },
      where: {
        id: {
          gt: 500
        }
      }
    });

    for (let bookmark of bookmarks) {
      console.log(bookmark.id + "\t" + bookmark.url);
      if (bookmark.bookmarkTag.length) { continue }

      const newTags = await suggestTagsForBookmark(bookmark, tagEmbeddings);
      await this.db.bookmarkTag.createMany({
        data: newTags.map((tag) => ({ bookmarkId: bookmark.id, tagId: parseInt(tag.tagId) }))
      })
    }

  }
}

type TagEmbedddings = { [key: number]: { embeddings: number[], name: string } };

const suggestTagsForBookmark = async (bookmark: Partial<Bookmark>, tagEmbeddings: TagEmbedddings) => {
  const BOOKMARK_PROMPT = "Assign closest programming related tag for the new bookmark in my bookmark manager \n"
  const bookmark_embedddings = await getEmbeddings(
    BOOKMARK_PROMPT + bookmark.url + " " + (bookmark.title ?? "") + " " + (bookmark.description ?? "")
  );

  let results: any[] = [];

  Object.keys(tagEmbeddings).forEach((tagId) => {
    const tag = tagEmbeddings[tagId];
    const similarity2 = cosineSimilarity(bookmark_embedddings, tag.embeddings);
    results.push({ tagId, similarity2, name: tag.name });
  })

  results = results
    .sort((a, b) => b.similarity2 - a.similarity2)

  const moreThan0_5 = results.filter((r) => r.similarity2 > 0.5);
  const moreThan0_475 = results.filter((r) => r.similarity2 > 0.475);

  if (moreThan0_5.length) {
    return moreThan0_5.slice(0, 3);
  } else if (moreThan0_475.length) {
    return [results[0]]
  } else { return [] }
}

// Calculate cosine similarity between two vectors
const cosineSimilarity = (vec1: number[], vec2: number[]): number => {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitude1 * magnitude2);
}


// Get embeddings from ollama 
const getEmbeddings = async (prompt: string) => {
  const res = await ollama.embeddings({ model: "nomic-embed-text", prompt });
  return res.embedding;
};