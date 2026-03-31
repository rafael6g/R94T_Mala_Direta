import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

async function getTransporter(userId: number) {
  const smtp = await db.getSmtpSettings(userId);
  if (!smtp) throw new TRPCError({ code: "BAD_REQUEST", message: "Configure as credenciais SMTP antes de enviar e-mails." });
  return {
    transporter: nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.encryption === "ssl",
      auth: { user: smtp.username, pass: smtp.password },
      tls: smtp.encryption === "tls" ? { rejectUnauthorized: false } : undefined,
    }),
    fromEmail: smtp.fromEmail,
    fromName: smtp.fromName || "Mala Direta",
  };
}

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getCampaigns(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.id, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campanha não encontrada" });
      const attachments = await db.getCampaignAttachments(input.id);
      return { ...campaign, attachments };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      listId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createCampaign({
        name: input.name,
        userId: ctx.user.id,
        listId: input.listId,
        status: "draft",
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create",
        entityType: "campaign",
        entityId: result.id,
        details: `Campanha criada: ${input.name}`,
        status: "success",
      });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCampaign(input.id, ctx.user.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "delete",
        entityType: "campaign",
        entityId: input.id,
        details: `Campanha removida: #${input.id}`,
        status: "success",
      });
      return { success: true };
    }),

  // Step 1: Select/assign list
  selectList: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      listId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      const list = await db.getContactListById(input.listId, ctx.user.id);
      if (!list) throw new TRPCError({ code: "NOT_FOUND", message: "Lista não encontrada" });
      await db.updateCampaign(input.campaignId, ctx.user.id, {
        listId: input.listId,
        recipientCount: list.contactCount,
      });
      return { success: true };
    }),

  // Step 2: Define subject
  defineSubject: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      subject: z.string().min(1).max(500),
      previewText: z.string().max(500).optional(),
      senderName: z.string().optional(),
      senderEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateCampaign(input.campaignId, ctx.user.id, {
        subject: input.subject,
        previewText: input.previewText,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        status: "subject_defined",
        subjectConfirmed: false,
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "define_subject",
        entityType: "campaign",
        entityId: input.campaignId,
        details: `Assunto definido: "${input.subject}"`,
        status: "success",
      });
      return { success: true };
    }),

  // Step 3: Confirm subject (double validation)
  confirmSubject: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      confirmedSubject: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (!campaign.subject) throw new TRPCError({ code: "BAD_REQUEST", message: "Defina o assunto primeiro" });
      if (campaign.subject !== input.confirmedSubject) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O assunto confirmado não corresponde ao assunto definido. Verifique e tente novamente." });
      }
      await db.updateCampaign(input.campaignId, ctx.user.id, {
        subjectConfirmed: true,
        status: "subject_confirmed",
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "confirm_subject",
        entityType: "campaign",
        entityId: input.campaignId,
        details: `Assunto confirmado: "${input.confirmedSubject}"`,
        status: "success",
      });
      return { success: true };
    }),

  // Step 4: Set content
  setContent: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      contentType: z.enum(["html", "image", "template"]),
      htmlContent: z.string().max(2_100_000, "O conteúdo HTML excede o tamanho máximo de 2MB").optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate HTML size on server side as well
      if (input.htmlContent) {
        const sizeBytes = Buffer.byteLength(input.htmlContent, "utf-8");
        if (sizeBytes > 2 * 1024 * 1024) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: `O conteúdo HTML é muito grande (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB). O tamanho máximo é 2 MB.`,
          });
        }
      }

      await db.updateCampaign(input.campaignId, ctx.user.id, {
        contentType: input.contentType,
        htmlContent: input.htmlContent,
        imageUrl: input.imageUrl,
        status: "content_ready",
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "set_content",
        entityType: "campaign",
        entityId: input.campaignId,
        details: `Conteúdo definido (${input.contentType})`,
        status: "success",
      });
      return { success: true };
    }),

  // Upload image for campaign body
  uploadImage: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      fileName: z.string(),
      base64Data: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      const buffer = Buffer.from(input.base64Data, "base64");
      const fileKey = `campaigns/${input.campaignId}/images/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { url, fileKey };
    }),

  // Upload attachment
  uploadAttachment: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      fileName: z.string(),
      base64Data: z.string(),
      mimeType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      const buffer = Buffer.from(input.base64Data, "base64");
      const fileKey = `campaigns/${input.campaignId}/attachments/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const result = await db.addCampaignAttachment({
        campaignId: input.campaignId,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
      });
      return { id: result.id, url, fileKey, fileName: input.fileName };
    }),

  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCampaignAttachment(input.id);
      return { success: true };
    }),

  // Step 5: Send test email (homologation)
  sendTest: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (!campaign.subject || !campaign.subjectConfirmed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Confirme o assunto antes de enviar o teste" });
      }
      if (!campaign.htmlContent && !campaign.imageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Defina o conteúdo antes de enviar o teste" });
      }
      if (!ctx.user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seu perfil não possui e-mail cadastrado" });
      }

      const { transporter, fromEmail, fromName } = await getTransporter(ctx.user.id);
      const attachments = await db.getCampaignAttachments(input.campaignId);

      let htmlBody = campaign.htmlContent || "";
      if (campaign.contentType === "image" && campaign.imageUrl) {
        htmlBody = `<div style="text-align:center;"><img src="${campaign.imageUrl}" style="max-width:100%;" alt="Campaign Image" /></div>`;
      }

      const mailAttachments = attachments.map(a => ({
        filename: a.fileName,
        path: a.fileUrl,
      }));

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: ctx.user.email,
        subject: `[TESTE] ${campaign.subject}`,
        html: htmlBody,
        attachments: mailAttachments,
      });

      await db.updateCampaign(input.campaignId, ctx.user.id, {
        testSentAt: new Date(),
        testSentTo: ctx.user.email,
        status: "test_sent",
      });

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "send_test",
        entityType: "campaign",
        entityId: input.campaignId,
        details: `E-mail de teste enviado para: ${ctx.user.email}`,
        status: "success",
      });

      return { success: true, sentTo: ctx.user.email };
    }),

  // Step 6: Send campaign (final)
  sendCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status !== "test_sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um e-mail de teste antes do envio final" });
      }
      if (!campaign.listId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma lista de destinatários" });
      }

      const recipients = await db.getListContacts(campaign.listId);
      if (recipients.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A lista selecionada não possui contatos ativos" });
      }

      await db.updateCampaign(input.campaignId, ctx.user.id, { status: "sending" });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "send_campaign_start",
        entityType: "campaign",
        entityId: input.campaignId,
        details: `Envio iniciado para ${recipients.length} destinatários`,
        status: "in_progress",
      });

      // Send emails asynchronously
      (async () => {
        try {
          const { transporter, fromEmail, fromName } = await getTransporter(ctx.user.id);
          const attachments = await db.getCampaignAttachments(input.campaignId);

          let htmlBody = campaign.htmlContent || "";
          if (campaign.contentType === "image" && campaign.imageUrl) {
            htmlBody = `<div style="text-align:center;"><img src="${campaign.imageUrl}" style="max-width:100%;" alt="Campaign Image" /></div>`;
          }

          const mailAttachments = attachments.map(a => ({
            filename: a.fileName,
            path: a.fileUrl,
          }));

          let sentCount = 0;
          let failedCount = 0;

          for (const recipient of recipients) {
            try {
              await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipient.email,
                subject: campaign.subject!,
                html: htmlBody,
                attachments: mailAttachments,
              });
              sentCount++;
            } catch (err) {
              failedCount++;
              console.error(`Failed to send to ${recipient.email}:`, err);
            }
          }

          await db.updateCampaign(input.campaignId, ctx.user.id, {
            status: "sent",
            sentCount,
            failedCount,
            sentAt: new Date(),
          });

          await db.createAuditLog({
            userId: ctx.user.id,
            action: "send_campaign_complete",
            entityType: "campaign",
            entityId: input.campaignId,
            details: `Envio concluído: ${sentCount} enviados, ${failedCount} falhas`,
            status: failedCount > 0 ? "error" : "success",
          });
        } catch (err) {
          await db.updateCampaign(input.campaignId, ctx.user.id, { status: "failed" });
          await db.createAuditLog({
            userId: ctx.user.id,
            action: "send_campaign_error",
            entityType: "campaign",
            entityId: input.campaignId,
            details: `Erro no envio: ${(err as Error).message}`,
            status: "error",
          });
        }
      })();

      return { success: true, recipientCount: recipients.length };
    }),

  // Get campaign send status
  getStatus: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        status: campaign.status,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        recipientCount: campaign.recipientCount,
        sentAt: campaign.sentAt,
      };
    }),
});
