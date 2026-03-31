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
    getListContacts: vi.fn(async () => [
      { id: 1, email: "test1@example.com", subscribed: true },
      { id: 2, email: "test2@example.com", subscribed: true },
    ]),
    getSmtpSettings: vi.fn(async () => null),
    createAuditLog: vi.fn(async () => {}),
    // Contact-related mocks
    createContact: vi.fn(async (data: any) => ({ id: nextId++ })),
    bulkCreateContacts: vi.fn(async (arr: any[]) => arr.map((_, i) => ({ id: i + 1 }))),
    getContacts: vi.fn(async () => ({ contacts: [], total: 0 })),
    getContactById: vi.fn(async () => undefined),
    updateContact: vi.fn(async () => {}),
    deleteContact: vi.fn(async () => {}),
    addContactsToList: vi.fn(async () => {}),
    removeContactFromList: vi.fn(async () => {}),
    getContactListsForContact: vi.fn(async () => []),
    // Reset helper for tests
    _reset: () => { campaigns.clear(); nextId = 1; },
    _getCampaigns: () => campaigns,
  };
});

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async () => ({ messageId: "test-id" })),
      verify: vi.fn(async () => true),
    })),
  },
}));

// Mock storage
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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Campaign Wizard Flow", () => {
  let db: any;

  beforeEach(async () => {
    db = await import("./db");
    db._reset();
  });

  it("should create a campaign in draft status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({ name: "Campanha Teste" });
    expect(result.id).toBe(1);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.status).toBe("draft");
    expect(campaign.name).toBe("Campanha Teste");
  });

  it("should select a list for the campaign", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Lista" });
    const result = await caller.campaigns.selectList({ campaignId: 1, listId: 10 });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.listId).toBe(10);
  });

  it("should define subject for the campaign", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Assunto" });
    const result = await caller.campaigns.defineSubject({
      campaignId: 1,
      subject: "Promoção de Frete Grátis",
      previewText: "Aproveite!",
    });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.subject).toBe("Promoção de Frete Grátis");
    expect(campaign.status).toBe("subject_defined");
    expect(campaign.subjectConfirmed).toBe(false);
  });

  it("should confirm subject with matching text (double validation)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Confirma" });
    await caller.campaigns.defineSubject({
      campaignId: 1,
      subject: "Promoção Especial",
    });

    const result = await caller.campaigns.confirmSubject({
      campaignId: 1,
      confirmedSubject: "Promoção Especial",
    });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.subjectConfirmed).toBe(true);
    expect(campaign.status).toBe("subject_confirmed");
  });

  it("should REJECT subject confirmation when text does not match", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Rejeita" });
    await caller.campaigns.defineSubject({
      campaignId: 1,
      subject: "Promoção Especial",
    });

    await expect(
      caller.campaigns.confirmSubject({
        campaignId: 1,
        confirmedSubject: "Promoção Diferente",
      })
    ).rejects.toThrow("O assunto confirmado não corresponde ao assunto definido");
  });

  it("should set HTML content for the campaign", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Conteúdo" });
    const result = await caller.campaigns.setContent({
      campaignId: 1,
      contentType: "html",
      htmlContent: "<h1>Olá!</h1><p>Promoção especial.</p>",
    });
    expect(result.success).toBe(true);

    const campaign = db._getCampaigns().get(1);
    expect(campaign.contentType).toBe("html");
    expect(campaign.status).toBe("content_ready");
  });

  it("should REQUIRE test email before final send", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Sem Teste" });
    await caller.campaigns.selectList({ campaignId: 1, listId: 10 });
    await caller.campaigns.defineSubject({ campaignId: 1, subject: "Teste" });
    await caller.campaigns.confirmSubject({ campaignId: 1, confirmedSubject: "Teste" });
    await caller.campaigns.setContent({ campaignId: 1, contentType: "html", htmlContent: "<p>Olá</p>" });

    // Try to send without test - should fail because status is "content_ready", not "test_sent"
    await expect(
      caller.campaigns.sendCampaign({ campaignId: 1 })
    ).rejects.toThrow("Envie um e-mail de teste antes do envio final");
  });

  it("should REQUIRE SMTP settings for test email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha SMTP" });
    await caller.campaigns.defineSubject({ campaignId: 1, subject: "Teste SMTP" });
    await caller.campaigns.confirmSubject({ campaignId: 1, confirmedSubject: "Teste SMTP" });
    await caller.campaigns.setContent({ campaignId: 1, contentType: "html", htmlContent: "<p>Test</p>" });

    // SMTP not configured
    await expect(
      caller.campaigns.sendTest({ campaignId: 1 })
    ).rejects.toThrow("Configure as credenciais SMTP");
  });

  it("should REQUIRE confirmed subject before test email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Campanha Sem Confirma" });
    await caller.campaigns.defineSubject({ campaignId: 1, subject: "Assunto" });
    // Do NOT confirm subject
    await caller.campaigns.setContent({ campaignId: 1, contentType: "html", htmlContent: "<p>Test</p>" });

    await expect(
      caller.campaigns.sendTest({ campaignId: 1 })
    ).rejects.toThrow("Confirme o assunto antes de enviar o teste");
  });

  it("should reject unauthenticated access to campaign creation", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.campaigns.create({ name: "Unauthorized" })
    ).rejects.toThrow();
  });
});

describe("Quick Import - Contact Parsing", () => {
  let db: any;

  beforeEach(async () => {
    db = await import("./db");
    vi.mocked(db.bulkCreateContacts).mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("should import tab-separated contacts from Excel paste", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rawText = `Email\tNome\tSobrenome\tEmpresa
joao@example.com\tJoão\tSilva\tReal 94
maria@example.com\tMaria\tSantos\tLogística
pedro@example.com\tPedro\tOliveira\tTransportes`;

    const result = await caller.contacts.quickImport({ rawText });
    expect(result.imported).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(result.total).toBe(3);
  });

  it("should import semicolon-separated contacts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rawText = `Email;Nome;Telefone
joao@example.com;João;11999999999
maria@example.com;Maria;11888888888`;

    vi.mocked(db.bulkCreateContacts).mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await caller.contacts.quickImport({ rawText });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("should report errors for invalid email lines", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rawText = `Email\tNome
joao@example.com\tJoão
invalido-sem-arroba\tMaria
pedro@example.com\tPedro`;

    vi.mocked(db.bulkCreateContacts).mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await caller.contacts.quickImport({ rawText });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("e-mail inválido");
  });

  it("should handle first column as email when no header matches", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rawText = `coluna1\tcoluna2
joao@example.com\tDados`;

    vi.mocked(db.bulkCreateContacts).mockResolvedValue([{ id: 1 }]);

    const result = await caller.contacts.quickImport({ rawText });
    expect(result.imported).toBe(1);
  });
});
