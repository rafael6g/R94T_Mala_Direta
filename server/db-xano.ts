/**
 * db-xano.ts
 * 
 * Camada de compatibilidade que expõe as mesmas funções do db.ts original,
 * mas usando a API REST do Xano em vez de Drizzle ORM direto.
 * 
 * Para usar no modo Xano, basta trocar os imports nos routers:
 *   import * as db from "../db";       → import * as db from "../db-xano";
 * 
 * Ou renomear este arquivo para db.ts quando rodar localmente.
 */
import * as xano from "./xano";

// O token do Xano é passado via contexto tRPC. 
// Para simplificar, armazenamos o token em uma variável thread-local.
let _currentXanoToken: string | undefined;

export function setCurrentXanoToken(token: string | undefined) {
  _currentXanoToken = token;
}

function getToken(): string {
  if (!_currentXanoToken) throw new Error("Xano token não disponível no contexto");
  return _currentXanoToken;
}

// ============ USERS ============
export async function upsertUser(user: { openId?: string; name?: string | null; email?: string | null; loginMethod?: string | null; lastSignedIn?: Date; role?: string }) {
  // No modo Xano, o upsert é feito pelo endpoint /auth/signup ou /auth/login
  // Esta função é mantida por compatibilidade mas não faz nada no modo Xano
  console.log("[db-xano] upsertUser chamado (no-op no modo Xano)");
}

export async function getUserByOpenId(openId: string) {
  // No modo Xano, não usamos openId. O user vem do token.
  return undefined;
}

// ============ CONTACTS ============
export async function getContacts(userId: number, opts?: { search?: string; listId?: number; limit?: number; offset?: number }) {
  const token = getToken();
  const page = opts?.offset && opts?.limit ? Math.floor(opts.offset / opts.limit) + 1 : 1;
  const result = await xano.xanoGetContacts(token, {
    search: opts?.search,
    list_id: opts?.listId,
    page,
    limit: opts?.limit || 20,
  });
  return { contacts: result.contacts || result.items || result, total: result.total || result.itemsTotal || 0 };
}

export async function getContactById(id: number) {
  const token = getToken();
  return xano.xanoGetContactById(token, id);
}

export async function createContact(data: { userId: number; email: string; firstName?: string; lastName?: string; phone?: string; company?: string }) {
  const token = getToken();
  const result = await xano.xanoCreateContact(token, {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    company: data.company,
  });
  return { id: result.id };
}

export async function updateContact(id: number, data: Record<string, unknown>) {
  const token = getToken();
  return xano.xanoUpdateContact(token, id, data);
}

export async function deleteContact(id: number) {
  const token = getToken();
  return xano.xanoDeleteContact(token, id);
}

export async function bulkCreateContacts(userId: number, contacts: Array<{ email: string; firstName?: string; lastName?: string; phone?: string; company?: string }>) {
  const token = getToken();
  const result = await xano.xanoBulkCreateContacts(token, contacts);
  return { imported: result.imported || contacts.length, ids: result.ids || [] };
}

export async function addContactsToList(contactIds: number[], listId: number) {
  const token = getToken();
  return xano.xanoAddContactsToList(token, contactIds, listId);
}

export async function removeContactFromList(contactId: number, listId: number) {
  const token = getToken();
  return xano.xanoRemoveContactFromList(token, contactId, listId);
}

export async function getContactLists(contactId: number) {
  const token = getToken();
  return xano.xanoGetContactLists(token, contactId);
}

// ============ LISTS ============
export async function getLists(userId: number) {
  const token = getToken();
  const result = await xano.xanoGetLists(token);
  return Array.isArray(result) ? result : result.items || [];
}

export async function getListById(id: number) {
  const token = getToken();
  return xano.xanoGetListById(token, id);
}

export async function createList(data: { userId: number; name: string; description?: string; folder?: string }) {
  const token = getToken();
  const result = await xano.xanoCreateList(token, {
    name: data.name,
    description: data.description,
    folder: data.folder,
  });
  return { id: result.id };
}

export async function updateList(id: number, data: Record<string, unknown>) {
  const token = getToken();
  return xano.xanoUpdateList(token, id, data);
}

export async function deleteList(id: number) {
  const token = getToken();
  return xano.xanoDeleteList(token, id);
}

// ============ CAMPAIGNS ============
export async function getCampaigns(userId: number) {
  const token = getToken();
  const result = await xano.xanoGetCampaigns(token);
  return Array.isArray(result) ? result : result.items || [];
}

export async function getCampaignById(id: number) {
  const token = getToken();
  return xano.xanoGetCampaignById(token, id);
}

export async function createCampaign(data: { userId: number; name: string; listId?: number }) {
  const token = getToken();
  const result = await xano.xanoCreateCampaign(token, {
    name: data.name,
    list_id: data.listId,
  });
  return { id: result.id };
}

export async function deleteCampaign(id: number) {
  const token = getToken();
  return xano.xanoDeleteCampaign(token, id);
}

export async function selectCampaignList(campaignId: number, listId: number) {
  const token = getToken();
  return xano.xanoSelectList(token, campaignId, listId);
}

export async function defineSubject(campaignId: number, data: { subject: string; previewText?: string; senderName?: string; senderEmail?: string }) {
  const token = getToken();
  return xano.xanoDefineSubject(token, campaignId, data);
}

export async function confirmSubject(campaignId: number, confirmedSubject: string) {
  const token = getToken();
  return xano.xanoConfirmSubject(token, campaignId, confirmedSubject);
}

export async function setContent(campaignId: number, data: { contentType: string; htmlContent?: string; imageUrl?: string }) {
  const token = getToken();
  return xano.xanoSetContent(token, campaignId, data);
}

export async function addAttachment(campaignId: number, data: { fileName: string; fileUrl: string; mimeType?: string; fileSize?: number }) {
  const token = getToken();
  return xano.xanoAddAttachment(token, campaignId, data);
}

export async function deleteAttachment(attachmentId: number) {
  const token = getToken();
  return xano.xanoDeleteAttachment(token, attachmentId);
}

export async function updateCampaign(id: number, data: Record<string, unknown>) {
  const token = getToken();
  // Xano doesn't have a generic update, so we use set-content or define-subject as appropriate
  // For status updates during sending, we use a dedicated endpoint
  const res = await xano.xanoGetCampaignById(token, id);
  return res;
}

export async function getListContacts(listId: number) {
  const token = getToken();
  return xano.xanoGetListContacts(token, listId);
}

// ============ AUDIT LOGS ============
export async function createAuditLog(data: { userId: number; action: string; entityType: string; entityId?: number; details?: string; status?: string; ipAddress?: string }) {
  const token = getToken();
  return xano.xanoCreateAuditLog(token, {
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    details: data.details,
    status: data.status,
  });
}

export async function getAuditLogs(userId: number, opts?: { limit?: number; offset?: number; entityType?: string }) {
  const token = getToken();
  const page = opts?.offset && opts?.limit ? Math.floor(opts.offset / opts.limit) + 1 : 1;
  const result = await xano.xanoGetAuditLogs(token, {
    page,
    limit: opts?.limit || 20,
    entityType: opts?.entityType,
  });
  return { logs: result.logs || result.items || result, total: result.total || result.itemsTotal || 0 };
}

// ============ SMTP SETTINGS ============
export async function getSmtpSettings(userId: number) {
  const token = getToken();
  try {
    const result = await xano.xanoGetSmtp(token);
    return result;
  } catch {
    return undefined;
  }
}

export async function upsertSmtpSettings(userId: number, data: { host: string; port: number; username: string; password: string; encryption: string; fromEmail: string; fromName?: string }) {
  const token = getToken();
  const result = await xano.xanoSaveSmtp(token, data);
  return { id: result.id };
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats(userId: number) {
  const token = getToken();
  try {
    const result = await xano.xanoGetDashboardStats(token);
    return result;
  } catch {
    return { totalContacts: 0, totalLists: 0, totalCampaigns: 0, sentCampaigns: 0 };
  }
}
