import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { contactsRouter } from "./routers/contacts";
import { listsRouter } from "./routers/lists";
import { campaignsRouter } from "./routers/campaigns";
import { auditRouter, smtpRouter, dashboardRouter } from "./routers/audit";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),
  contacts: contactsRouter,
  lists: listsRouter,
  campaigns: campaignsRouter,
  audit: auditRouter,
  smtp: smtpRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
