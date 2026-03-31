import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      listId: z.number().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getContacts(ctx.user.id, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getContactById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createContact({ ...input, userId: ctx.user.id });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create",
        entityType: "contact",
        entityId: result.id,
        details: `Contato criado: ${input.email}`,
        status: "success",
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      subscribed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateContact(id, ctx.user.id, data);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update",
        entityType: "contact",
        entityId: id,
        details: `Contato atualizado: #${id}`,
        status: "success",
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteContact(input.id, ctx.user.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "delete",
        entityType: "contact",
        entityId: input.id,
        details: `Contato removido: #${input.id}`,
        status: "success",
      });
      return { success: true };
    }),

  quickImport: protectedProcedure
    .input(z.object({
      rawText: z.string().min(1),
      listId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lines = input.rawText.trim().split("\n").filter(l => l.trim());
      if (lines.length === 0) throw new Error("Nenhum dado encontrado");

      // Detect separator: tab, semicolon, or comma
      const firstLine = lines[0];
      const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

      // Detect if the first line is a header or data
      // A header line typically contains words like "email", "nome", "name", "telefone", etc.
      // and does NOT contain an @ symbol
      const headerKeywords = [
        "email", "e-mail", "endereco", "nome", "name", "firstname", "first_name",
        "sobrenome", "lastname", "last_name", "telefone", "phone", "tel", "celular",
        "empresa", "company", "organizacao", "organization", "contato", "contact",
      ];
      const firstLineLower = firstLine.toLowerCase().replace(/[^a-z0-9@\t;,\s-_]/g, "");
      const firstLineCells = firstLine.split(separator).map(c => c.trim().toLowerCase());
      const looksLikeHeader = firstLineCells.some(cell => {
        const normalized = cell.replace(/[^a-z0-9]/g, "");
        return headerKeywords.includes(normalized);
      }) && !firstLine.includes("@");

      let dataStartIndex = 0;
      const fieldMap: Record<string, string> = {};

      if (looksLikeHeader) {
        // Parse header columns
        dataStartIndex = 1;
        const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
        headers.forEach((h, i) => {
          const normalized = h.replace(/[^a-z0-9]/g, "");
          if (["email", "emailaddress", "endereco", "enderecodeemail", "enderecoemail", "emailendereco", "emailcontato", "contato"].includes(normalized)) fieldMap[String(i)] = "email";
          else if (["nome", "name", "firstname", "primeironome", "firstnamename"].includes(normalized)) fieldMap[String(i)] = "firstName";
          else if (["sobrenome", "lastname", "ultimonome"].includes(normalized)) fieldMap[String(i)] = "lastName";
          else if (["telefone", "phone", "tel", "celular", "mobile", "fone"].includes(normalized)) fieldMap[String(i)] = "phone";
          else if (["empresa", "company", "organizacao", "organization", "org"].includes(normalized)) fieldMap[String(i)] = "company";
        });
        // If no email column detected in header, assume first column is email
        if (!Object.values(fieldMap).includes("email")) {
          fieldMap["0"] = "email";
        }
      } else {
        // No header detected - auto-map columns based on content analysis
        // First, check how many columns exist
        const sampleCols = firstLine.split(separator).map(c => c.trim());
        
        if (sampleCols.length === 1) {
          // Single column: treat everything as email
          fieldMap["0"] = "email";
        } else {
          // Multiple columns: detect which column contains emails
          // Scan first few data lines to find the email column
          const sampleLines = lines.slice(0, Math.min(5, lines.length));
          let emailColIdx = -1;
          for (let colIdx = 0; colIdx < sampleCols.length; colIdx++) {
            const hasEmail = sampleLines.some(line => {
              const cols = line.split(separator);
              return cols[colIdx]?.trim().includes("@");
            });
            if (hasEmail) { emailColIdx = colIdx; break; }
          }
          
          if (emailColIdx === -1) emailColIdx = 0; // fallback to first column
          fieldMap[String(emailColIdx)] = "email";
          
          // Try to guess other columns based on position relative to email
          let otherCols = [];
          for (let i = 0; i < sampleCols.length; i++) {
            if (i !== emailColIdx) otherCols.push(i);
          }
          // Assign remaining columns in order: firstName, lastName, phone, company
          const guessOrder = ["firstName", "lastName", "phone", "company"];
          otherCols.forEach((colIdx, i) => {
            if (i < guessOrder.length) {
              fieldMap[String(colIdx)] = guessOrder[i];
            }
          });
        }
      }

      const contactsToCreate: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        company?: string;
        userId: number;
      }> = [];
      const errors: string[] = [];

      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(separator).map(c => c.trim());
        const contact: Record<string, string> = {};

        Object.entries(fieldMap).forEach(([colIdx, field]) => {
          const val = cols[parseInt(colIdx)];
          if (val) contact[field] = val;
        });

        // Validate email
        if (!contact.email || !contact.email.includes("@")) {
          // If the entire line looks like an email, use it
          const lineAsEmail = line.trim();
          if (lineAsEmail.includes("@") && !lineAsEmail.includes(separator)) {
            contact.email = lineAsEmail;
          } else {
            errors.push(`Linha ${i + 1}: e-mail inválido ou não encontrado`);
            continue;
          }
        }

        // Clean email
        contact.email = contact.email.trim().toLowerCase();

        contactsToCreate.push({
          email: contact.email,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          phone: contact.phone || undefined,
          company: contact.company || undefined,
          userId: ctx.user.id,
        });
      }

      let imported = 0;
      if (contactsToCreate.length > 0) {
        const results = await db.bulkCreateContacts(contactsToCreate);
        imported = results.length;

        if (input.listId) {
          await db.addContactsToList(results.map(r => r.id), input.listId);
        }
      }

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "quick_import",
        entityType: "contact",
        details: `Importação rápida: ${imported} contatos importados de ${lines.length - dataStartIndex}${errors.length > 0 ? `, ${errors.length} erros` : ""}`,
        status: errors.length > 0 && imported === 0 ? "error" : "success",
      });

      return { imported, errors, total: lines.length - dataStartIndex };
    }),

  addToList: protectedProcedure
    .input(z.object({
      contactIds: z.array(z.number()),
      listId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.addContactsToList(input.contactIds, input.listId);
      return { success: true };
    }),

  removeFromList: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      listId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.removeContactFromList(input.contactId, input.listId);
      return { success: true };
    }),

  getListsForContact: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getContactListsForContact(input.contactId);
    }),
});
