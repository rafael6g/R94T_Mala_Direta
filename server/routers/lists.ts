import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const listsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getContactLists(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getContactListById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createContactList({ ...input, userId: ctx.user.id });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create",
        entityType: "list",
        entityId: result.id,
        details: `Lista criada: ${input.name}`,
        status: "success",
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateContactList(id, ctx.user.id, data);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update",
        entityType: "list",
        entityId: id,
        details: `Lista atualizada: #${id}`,
        status: "success",
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteContactList(input.id, ctx.user.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "delete",
        entityType: "list",
        entityId: input.id,
        details: `Lista removida: #${input.id}`,
        status: "success",
      });
      return { success: true };
    }),
});
