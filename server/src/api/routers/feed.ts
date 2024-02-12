import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc.js";

export const feedRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  addFeed: publicProcedure.input(z.object({
    url: z.string(),
    folderId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const folders: any = await ctx.feedUsecase.listFolders();
    const folderId = folders.find((f: any) => f.id === input.folderId)!.name;
    await ctx.feedUsecase.addFeed(input.url, folderId);
  }),
  listFeeds: publicProcedure
    .query(async ({ ctx }) => {
      const feeds: unknown = await ctx.feedUsecase.listFeeds();
      return feeds;
    }),
  listFolders: publicProcedure
    .query(async ({ ctx }) => {
      const folders: unknown = await ctx.feedUsecase.listFolders();
      return folders;
    }),
  addFolder: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.feedUsecase.addFolder(input.name);
    }),
  setEntryRead: publicProcedure
    .input(z.object({ id: z.number(), read: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.feedUsecase.setEntryRead(input.id, input.read);
    }),
  listEntries: publicProcedure
    .input(z.object({
      feedId: z.number().optional(),
      page: z.number().min(1).default(1),
      query: z.string().optional(),
      showRead: z.boolean().optional()
    }))
    .query(async ({ ctx, input }) => {

      const skip = (input.page - 1) * 20;

      const entries = await ctx.feedUsecase.listEntries({
        feedId: input.feedId,
        query: input.query,
        showRead: input.showRead,
        skip,
      });
      return entries;
    }),
  updateFeed: publicProcedure
    .input(z.object({ id: z.number(), refresh: z.boolean().optional(), folder: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.feedUsecase.updateFeed(input.id, input.refresh, input.folder);
    }),
});
