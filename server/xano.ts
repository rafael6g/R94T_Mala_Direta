/**
 * Xano API Client
 * Camada de abstração para chamadas REST ao Xano.
 * Substitui o Drizzle ORM quando o sistema roda localmente com Xano como banco de dados.
 */
import axios, { type AxiosInstance } from "axios";

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!_client) {
    const baseURL = process.env.XANO_API_BASE_URL;
    if (!baseURL) {
      throw new Error("[Xano] XANO_API_BASE_URL não configurada no .env");
    }
    _client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });
  }
  return _client;
}

// Helper para adicionar auth token do Xano nas requisições
function authHeaders(xanoToken?: string) {
  if (!xanoToken) return {};
  return { Authorization: `Bearer ${xanoToken}` };
}

// ============ AUTH ============
export async function xanoSignup(data: { name: string; email: string; password: string }) {
  const res = await getClient().post("/auth/signup", data);
  return res.data; // { authToken, ... }
}

export async function xanoLogin(data: { email: string; password: string }) {
  const res = await getClient().post("/auth/login", data);
  return res.data; // { authToken, ... }
}

export async function xanoGetMe(xanoToken: string) {
  const res = await getClient().get("/auth/me", { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ CONTACTS ============
export async function xanoGetContacts(xanoToken: string, params?: { search?: string; list_id?: number; page?: number; limit?: number }) {
  const res = await getClient().get("/contacts", { headers: authHeaders(xanoToken), params });
  return res.data; // { contacts: [...], total: N }
}

export async function xanoGetContactById(xanoToken: string, id: number) {
  const res = await getClient().get(`/contacts/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoCreateContact(xanoToken: string, data: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string }) {
  const res = await getClient().post("/contacts", data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoUpdateContact(xanoToken: string, id: number, data: Record<string, unknown>) {
  const res = await getClient().patch(`/contacts/${id}`, data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoDeleteContact(xanoToken: string, id: number) {
  const res = await getClient().delete(`/contacts/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoBulkCreateContacts(xanoToken: string, contacts: Array<{ email: string; firstName?: string; lastName?: string; phone?: string; company?: string }>) {
  const res = await getClient().post("/contacts/bulk", { contacts }, { headers: authHeaders(xanoToken) });
  return res.data; // { imported: N, ids: [...] }
}

export async function xanoAddContactsToList(xanoToken: string, contactIds: number[], listId: number) {
  const res = await getClient().post("/contacts/add-to-list", { contactIds, listId }, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoRemoveContactFromList(xanoToken: string, contactId: number, listId: number) {
  const res = await getClient().post("/contacts/remove-from-list", { contactId, listId }, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoGetContactLists(xanoToken: string, contactId: number) {
  const res = await getClient().get(`/contacts/${contactId}/lists`, { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ LISTS ============
export async function xanoGetLists(xanoToken: string) {
  const res = await getClient().get("/lists", { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoGetListById(xanoToken: string, id: number) {
  const res = await getClient().get(`/lists/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoCreateList(xanoToken: string, data: { name: string; description?: string; folder?: string }) {
  const res = await getClient().post("/lists", data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoUpdateList(xanoToken: string, id: number, data: Record<string, unknown>) {
  const res = await getClient().patch(`/lists/${id}`, data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoDeleteList(xanoToken: string, id: number) {
  const res = await getClient().delete(`/lists/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ CAMPAIGNS ============
export async function xanoGetCampaigns(xanoToken: string) {
  const res = await getClient().get("/campaigns", { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoGetCampaignById(xanoToken: string, id: number) {
  const res = await getClient().get(`/campaigns/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoCreateCampaign(xanoToken: string, data: { name: string; list_id?: number }) {
  const res = await getClient().post("/campaigns", data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoDeleteCampaign(xanoToken: string, id: number) {
  const res = await getClient().delete(`/campaigns/${id}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoSelectList(xanoToken: string, campaignId: number, listId: number) {
  const res = await getClient().patch(`/campaigns/${campaignId}/select-list`, { list_id: listId }, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoDefineSubject(xanoToken: string, campaignId: number, data: { subject: string; previewText?: string; senderName?: string; senderEmail?: string }) {
  const res = await getClient().patch(`/campaigns/${campaignId}/define-subject`, data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoConfirmSubject(xanoToken: string, campaignId: number, confirmedSubject: string) {
  const res = await getClient().patch(`/campaigns/${campaignId}/confirm-subject`, { confirmedSubject }, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoSetContent(xanoToken: string, campaignId: number, data: { contentType: string; htmlContent?: string; imageUrl?: string }) {
  const res = await getClient().patch(`/campaigns/${campaignId}/set-content`, data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoAddAttachment(xanoToken: string, campaignId: number, data: { fileName: string; fileUrl: string; mimeType?: string; fileSize?: number }) {
  const res = await getClient().post(`/campaigns/${campaignId}/attachments`, data, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoDeleteAttachment(xanoToken: string, attachmentId: number) {
  const res = await getClient().delete(`/campaigns/attachments/${attachmentId}`, { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoGetCampaignStatus(xanoToken: string, campaignId: number) {
  const res = await getClient().get(`/campaigns/${campaignId}/status`, { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ AUDIT ============
export async function xanoGetAuditLogs(xanoToken: string, params?: { page?: number; limit?: number; entityType?: string }) {
  const res = await getClient().get("/audit", { headers: authHeaders(xanoToken), params });
  return res.data; // { logs: [...], total: N }
}

export async function xanoCreateAuditLog(xanoToken: string, data: { action: string; entityType: string; entityId?: number; details?: string; status?: string }) {
  const res = await getClient().post("/audit", data, { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ SMTP ============
export async function xanoGetSmtp(xanoToken: string) {
  const res = await getClient().get("/smtp", { headers: authHeaders(xanoToken) });
  return res.data;
}

export async function xanoSaveSmtp(xanoToken: string, data: { host: string; port: number; username: string; password: string; encryption: string; fromEmail: string; fromName?: string }) {
  const res = await getClient().post("/smtp", data, { headers: authHeaders(xanoToken) });
  return res.data;
}

// ============ DASHBOARD ============
export async function xanoGetDashboardStats(xanoToken: string) {
  const res = await getClient().get("/dashboard/stats", { headers: authHeaders(xanoToken) });
  return res.data; // { totalContacts, totalLists, totalCampaigns, sentCampaigns }
}

// ============ LIST CONTACTS (for sending) ============
export async function xanoGetListContacts(xanoToken: string, listId: number) {
  const res = await getClient().get(`/lists/${listId}/contacts`, { headers: authHeaders(xanoToken) });
  return res.data; // array of contacts
}
