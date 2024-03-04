import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc.js";

export const reviseRouter = createTRPCRouter({
  addDeck: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bookmark = await ctx.reviseUsecase.addDeck(
        input.name,
      );
      return bookmark;
    }),
  listDecks: publicProcedure.query(async ({ ctx }) => {
    return await ctx.reviseUsecase.listDecks();
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
