import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module
vi.mock("./db", () => {
  const campaigns = new Map<number, any>();
  let nextId = 1;

  return {
    createCampaign: vi.fn(async (data: any) => {
      const id = nextId++;
      campaigns.set(id, { id, ...data, subjectConfirmed: false, subject: null, htmlContent: null, imageUrl: null, contentType: null, testSentAt: null, testSentTo: null, sentAt: null, sentCount: 0, failedCount: 0, recipientCount: 0, previewText: null, senderName: null, senderEmail: null, createdAt: new Date(), updatedAt: new Date() });
      return { id };
    }),
    getCampaignById: vi.fn(async (id: number, userId: number) => {
      const c = campaigns.get(id);
      if (!c || c.userId !== userId) return undefined;
      return c;
    }),
    updateCampaign: vi.fn(async (id: number, userId: number, data: any) => {
      const c = campaigns.get(id);
      if (c && c.userId === userId) {
        Object.assign(c, data);
      }
    }),
    getCampaigns: vi.fn(async () => []),
    deleteCampaign: vi.fn(async () => {}),
    getCampaignAttachments: vi.fn(async () => []),
    addCampaignAttachment: vi.fn(async () => ({ id: 1 })),
    deleteCampaignAttachment: vi.fn(async () => {}),
    getContactListById: vi.fn(async (id: number) => ({ id, name: "Test List", contactCount: 5 })),
    getListContacts: vi.fn(async () => []),
    getSmtpSettings: vi.fn(async () => null),
    createAuditLog: vi.fn(async () => {}),
    createContact: vi.fn(async (data: any) => ({ id: nextId++ })),
    bulkCreateContacts: vi.fn(async (arr: any[]) => arr.map((_, i) => ({ id: i + 1 }))),
    getContacts: vi.fn(async () => ({ contacts: [], total: 0 })),
    getContactById: vi.fn(async () => undefined),
    updateContact: vi.fn(async () => {}),
    deleteContact: vi.fn(async () => {}),
    addContactsToList: vi.fn(async () => {}),
    removeContactFromList: vi.fn(async () => {}),
    getContactListsForContact: vi.fn(async () => []),
    _reset: () => { campaigns.clear(); nextId = 1; },
    _getCampaigns: () => campaigns,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async () => ({ messageId: "test-id" })),
      verify: vi.fn(async () => true),
    })),
  },
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key: string) => ({ url: `https://cdn.example.com/${key}`, key })),
}));

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "pedro@real94.com.br",
    name: "Pedro",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("HTML Content - Size Validation", () => {
  let db: any;

  beforeEach(async () => {
    db = await import("./db");
    db._reset();
  });

  it("should accept normal-sized HTML content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha HTML Normal" });
    const result = await caller.campaigns.setContent({
      campaignId: 1,
      contentType: "html",
      htmlContent: "<h1>Olá Mundo</h1><p>Este é um e-mail de teste com conteúdo normal.</p>",
    });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.status).toBe("content_ready");
    expect(campaign.contentType).toBe("html");
  });

  it("should accept HTML content up to 2MB", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha HTML Grande" });

    // Create HTML content just under 2MB
    const htmlContent = "<p>" + "A".repeat(1_900_000) + "</p>";
    const result = await caller.campaigns.setContent({
      campaignId: 1,
      contentType: "html",
      htmlContent,
    });
    expect(result.success).toBe(true);
  });

  it("should reject HTML content exceeding 2MB via zod validation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha HTML Enorme" });

    // Create HTML content over 2.1M characters (zod max)
    const htmlContent = "<p>" + "A".repeat(2_200_000) + "</p>";
    await expect(
      caller.campaigns.setContent({
        campaignId: 1,
        contentType: "html",
        htmlContent,
      })
    ).rejects.toThrow();
  });

  it("should accept HTML with common email tags", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Email Tags" });

    const emailHtml = `
      <table width="600" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          <td bgcolor="#ffffff" style="padding: 20px;">
            <h1 style="color: #333;">Promoção Real 94</h1>
            <p style="font-size: 14px;">Aproveite nossas ofertas especiais!</p>
            <a href="https://real94.com.br" style="color: #cc0000;">Saiba mais</a>
            <img src="https://cdn.example.com/banner.jpg" alt="Banner" width="560" />
          </td>
        </tr>
      </table>
    `;

    const result = await caller.campaigns.setContent({
      campaignId: 1,
      contentType: "html",
      htmlContent: emailHtml,
    });
    expect(result.success).toBe(true);
  });

  it("should accept image content type without HTML", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Imagem" });
    const result = await caller.campaigns.setContent({
      campaignId: 1,
      contentType: "image",
      imageUrl: "https://cdn.example.com/campaign-image.jpg",
    });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.contentType).toBe("image");
    expect(campaign.imageUrl).toBe("https://cdn.example.com/campaign-image.jpg");
  });
});
