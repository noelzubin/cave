import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc.ts";

export const bookmarkRouter = createTRPCRouter({
  addBookmark: publicProcedure
    .input(
      z.object({
        url: z.string(),
        title: z.string(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        faviconUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bookmark = await ctx.bookmarkUsecase.addBookmark(
        input.url,
        input.title,
        input.imageUrl,
        input.description,
        input.faviconUrl,
        input.tags
      );
      return bookmark;
    }),
  editBookmark: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        tags: z.number().array(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bookmark = await ctx.bookmarkUsecase.editBookmark(input.id, {
        description: input.description,
        tagIds: input.tags,
        title: input.title,
        imageUrl: input.imageUrl,
      });
      return bookmark;
    }),
  listTags: publicProcedure.query(async ({ ctx }) => {
    return await ctx.bookmarkUsecase.listTags();
  }),
  addTag: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.bookmarkUsecase.createTag(input.name);
    }),
  listBookmarks: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        query: z.string().optional(),
        tags: z.number().array().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * 20;

      const result = await ctx.bookmarkUsecase.listBookmarks({
        skip,
        query: input.query,
        tags: input.tags,
      });

      return result;
    }),
  deleteBookmark: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bookmark = await ctx.bookmarkUsecase.deleteBookmark(input.id);
      return bookmark;
    }),
  bulkUpdateBookmarks: publicProcedure
    .input(z.object({ ids: z.number().array(), tagsIds: z.number().array() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.bookmarkUsecase.bulkUpdateBookmarks(input.ids, input.tagsIds);
    }),
});
