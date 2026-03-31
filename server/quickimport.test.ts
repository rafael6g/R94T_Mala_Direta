import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  bulkCreateContacts: vi.fn().mockImplementation((arr: any[]) =>
    arr.map((_, i) => ({ id: i + 1 }))
  ),
  addContactsToList: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("contacts.quickImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports a single email without header", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com",
    });
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.total).toBe(1);
  });

  it("imports multiple emails without header (one per line)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com\njose@email.com\nmaria@email.com",
    });
    expect(result.imported).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(result.total).toBe(3);
  });

  it("imports tab-separated data with header", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "Email\tNome\tSobrenome\tTelefone\tEmpresa\npedro@email.com\tPedro\tSilva\t11999999999\tReal 94\njose@email.com\tJosé\tSantos\t11888888888\tEmpresa X",
    });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.total).toBe(2);
  });

  it("imports tab-separated data WITHOUT header (Excel paste)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com\tPedro\tSilva\t11999999999\tReal 94\njose@email.com\tJosé\tSantos\t11888888888\tEmpresa X",
    });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.total).toBe(2);
  });

  it("imports semicolon-separated CSV data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "Email;Nome;Empresa\npedro@email.com;Pedro;Real 94",
    });
    expect(result.imported).toBe(1);
    expect(result.total).toBe(1);
  });

  it("detects email column when not in first position", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "Pedro\tpedro@email.com\t11999999999\nJosé\tjose@email.com\t11888888888",
    });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("reports errors for lines without valid email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com\ninvalid-line\njose@email.com",
    });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it("handles empty lines gracefully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com\n\n\njose@email.com\n",
    });
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("adds contacts to list when listId is provided", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const { addContactsToList } = await import("./db");
    const result = await caller.contacts.quickImport({
      rawText: "pedro@email.com\njose@email.com",
      listId: 5,
    });
    expect(result.imported).toBe(2);
    expect(addContactsToList).toHaveBeenCalledWith([1, 2], 5);
  });

  it("throws error for empty input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contacts.quickImport({ rawText: "" })).rejects.toThrow();
  });
});
