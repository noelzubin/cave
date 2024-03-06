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
      const bookmark = await ctx.reviseUsecase.addDeck(input.name);
      return bookmark;
    }),
  listDecks: publicProcedure.query(async ({ ctx }) => {
    return await ctx.reviseUsecase.listDecks();
  }),
  addCard: publicProcedure
    .input(
      z.object({
        deckId: z.number(),
        desc: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.reviseUsecase.addCard(input.deckId, input.desc);
      return card;
    }),

  removeCard: publicProcedure
    .input(
      z.object({
        cardId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.reviseUsecase.removeCard(input.cardId);
      return card;
    }),
  editCard: publicProcedure
    .input(
      z.object({
        cardId: z.number(),
        desc: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.reviseUsecase.editCard(input.cardId, {
        desc: input.desc,
      });
      return card;
    }),
  listCards: publicProcedure
    .input(
      z.object({
        deckId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.reviseUsecase.listCards(input.deckId);
    }),
  getCard: publicProcedure
    .input(
      z.object({
        cardId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.reviseUsecase.getCard(input.cardId);
    }),
  reviewCard: publicProcedure
    .input(
      z.object({
        cardId: z.number(),
        rating: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.reviseUsecase.reviewCard(input.cardId, input.rating);
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
