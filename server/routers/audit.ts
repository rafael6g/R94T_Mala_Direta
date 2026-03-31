import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const auditRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      entityType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getAuditLogs(ctx.user.id, input);
    }),
});

export const smtpRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.getSmtpSettings(ctx.user.id);
    if (!settings) return null;
    // Never return the password
    return { ...settings, password: "••••••••" };
  }),

  save: protectedProcedure
    .input(z.object({
      host: z.string().min(1),
      port: z.number().min(1).max(65535),
      username: z.string().min(1),
      password: z.string().min(1),
      encryption: z.enum(["tls", "ssl", "none"]),
      fromEmail: z.string().email(),
      fromName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.upsertSmtpSettings(ctx.user.id, input);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update",
        entityType: "smtp_settings",
        entityId: result.id,
        details: "Configurações SMTP atualizadas",
        status: "success",
      });
      return { success: true };
    }),

  test: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.getSmtpSettings(ctx.user.id);
    if (!settings) {
      return { success: false, message: "Configure as credenciais SMTP primeiro" };
    }
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.encryption === "ssl",
        auth: { user: settings.username, pass: settings.password },
        tls: settings.encryption === "tls" ? { rejectUnauthorized: false } : undefined,
      });
      await transporter.verify();
      return { success: true, message: "Conexão SMTP verificada com sucesso" };
    } catch (err) {
      return { success: false, message: `Falha na conexão: ${(err as Error).message}` };
    }
  }),
});

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    return db.getDashboardStats(ctx.user.id);
  }),
});
