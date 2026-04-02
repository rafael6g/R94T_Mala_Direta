import type {
  InsertUser, InsertContactList, InsertContact,
  InsertCampaign, InsertAuditLog, InsertSmtpSettings
} from "../drizzle/schema";

// ============ CONFIGURAÇÃO DO XANO ============
const XANO_BASE_URL = process.env.XANO_API_BASE_URL || 'https://xd23-clr8-wwle.b2.xano.io/api:PzghHKzc';

// MySQL desativado para evitar erros de SSL
export async function getDb() { return null; }

// ============ TRADUTOR UNIVERSAL (XANO <-> APP) ============
function mapToApp(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const mapped = { ...record };

  // Datas e IDs
  if (mapped.created_at !== undefined) mapped.createdAt = new Date(mapped.created_at);
  if (mapped.user_id !== undefined) mapped.userId = Number(mapped.user_id);
  if (mapped.list_id !== undefined) mapped.listId = Number(mapped.list_id);
  if (mapped.contact_id !== undefined) mapped.contactId = Number(mapped.contact_id);

  // Campos de usuário
  if (mapped.open_id !== undefined) mapped.openId = mapped.open_id;
  if (mapped.login_method !== undefined) mapped.loginMethod = mapped.login_method;
  
  // Campanhas
  if (mapped.campaigns_id !== undefined) mapped.campaignId = Number(mapped.campaigns_id);
  else if (mapped.campaign_id !== undefined) mapped.campaignId = Number(mapped.campaign_id);
  
  // Flags e Contadores
  if (mapped.contactCount !== undefined) mapped.contactCount = Number(mapped.contactCount);
  if (mapped.subjectConfirmed !== undefined) mapped.subjectConfirmed = Boolean(mapped.subjectConfirmed);

  // 🎯 CORREÇÃO DO LOGIN: Mapeia o campo de senha do Xano para o App
  if (record.passwordHash !== undefined) mapped.passwordHash = record.passwordHash;
  else if (record.password_hash !== undefined) mapped.passwordHash = record.password_hash;
  else if (record.password !== undefined) mapped.passwordHash = record.password;

  return mapped;
}

function mapToXano(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const mapped = { ...data };

  // Campos de usuário
  if (mapped.openId !== undefined) { mapped.open_id = mapped.openId; delete mapped.openId; }
  if (mapped.passwordHash !== undefined) { mapped.password = mapped.passwordHash; delete mapped.passwordHash; }
  if (mapped.loginMethod !== undefined) { mapped.login_method = mapped.loginMethod; delete mapped.loginMethod; }
  if (mapped.lastSignedIn !== undefined) { mapped.lastSignedln = mapped.lastSignedIn; delete mapped.lastSignedIn; }

  // Campos de relação
  if (mapped.userId !== undefined) { mapped.user_id = mapped.userId; delete mapped.userId; }
  if (mapped.listId !== undefined) { mapped.list_id = mapped.listId; delete mapped.listId; }
  if (mapped.campaignId !== undefined) { mapped.campaigns_id = mapped.campaignId; delete mapped.campaignId; }
  if (mapped.contactId !== undefined) { mapped.contact_id = mapped.contactId; delete mapped.contactId; }

  // Remove campos que o Xano gera sozinho ou que conflitam
  if (mapped.createdAt !== undefined) delete mapped.createdAt;
  if (mapped.updatedAt !== undefined) delete mapped.updatedAt;
  if (mapped.created_at !== undefined) delete mapped.created_at;

  return mapped;
}

// ============ MOTOR DE REQUISIÇÃO ============
async function xanoFetch(endpoint: string, method = 'GET', body?: any): Promise<any> {
  const url = `${XANO_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    };
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
      console.warn(`[Xano] ${method} ${endpoint} → ${response.status}`, result);
      return { _error: true, status: response.status, ...result };
    }
    return result;
  } catch (error) {
    console.error(`[Xano] Falha de rede em ${endpoint}:`, error);
    return { _error: true };
  }
}

// ============ USERS (AUTENTICAÇÃO DINÂMICA) ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (user.openId) {
    const existing = await getUserByOpenId(user.openId);
    if (existing?.id) {
      const raw = await xanoFetch(`/mkt_users/${existing.id}`);
      const payload = { ...(raw._error ? {} : raw), ...mapToXano(user), mkt_users_id: existing.id, lastSignedIn: new Date() };
      delete payload.created_at;
      await xanoFetch(`/mkt_users/${existing.id}`, 'PATCH', payload);
      return;
    }
  }
  await xanoFetch('/mkt_users', 'POST', mapToXano({ ...user, lastSignedIn: new Date() }));
}

export async function getUserByOpenId(openId: string) {
  const data = await xanoFetch(`/mkt_users?open_id=${encodeURIComponent(openId)}`);
  const record = Array.isArray(data) ? data[0] : (data && !data._error ? data : null);
  return record ? mapToApp(record) : undefined;
}

export async function getUserByEmail(email: string) {
  const data = await xanoFetch(`/mkt_users?email=${encodeURIComponent(email.toLowerCase())}`);
  
  let record = null;
  if (Array.isArray(data)) {
    record = data.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  } else if (data && !data._error) {
    record = data;
  }
  
  if (record && record.email) {
    return mapToApp(record);
  }
  return undefined;
}

// ============ CONTACT LISTS ============
export async function createContactList(data: InsertContactList) {
  const result = await xanoFetch('/mkt_contact_lists', 'POST', mapToXano({ ...data, contactCount: 0 }));
  return { id: result.id };
}

export async function getContactLists(userId: number) {
  const lists = await xanoFetch(`/mkt_contact_lists?user_id=${userId}`);
  if (!Array.isArray(lists)) return [];

  // Contagem dinâmica para evitar "0 contatos"
  const allMembers = await xanoFetch(`/mkt_contact_list_members`);
  if (Array.isArray(allMembers)) {
    lists.forEach(list => {
      list.contactCount = allMembers.filter((m: any) => m.list_id === list.id).length;
    });
  }
  return lists.map(mapToApp);
}

export async function getContactListById(id: number, userId: number) {
  const list = await xanoFetch(`/mkt_contact_lists/${id}`);
  if (!list || list._error) return undefined;
  
  const members = await xanoFetch(`/mkt_contact_list_members?list_id=${id}`);
  if (Array.isArray(members)) {
    list.contactCount = members.filter((m: any) => m.list_id == id).length;
  }
  return mapToApp(list);
}

export async function updateContactList(id: number, userId: number, data: Partial<InsertContactList>) {
  const existing = await xanoFetch(`/mkt_contact_lists/${id}`);
  if (existing && !existing._error) {
    const payload = { ...existing, ...mapToXano(data), mkt_contact_lists_id: id, user_id: userId };
    delete payload.created_at;
    await xanoFetch(`/mkt_contact_lists/${id}`, 'PATCH', payload);
  }
}

export async function deleteContactList(id: number, userId: number) {
  await xanoFetch(`/mkt_contact_lists/${id}`, 'DELETE');
}

export async function recalcListCount(listId: number) {
  try {
    const members = await xanoFetch(`/mkt_contact_list_members?list_id=${listId}`);
    const count = Array.isArray(members) ? members.filter((m: any) => m.list_id == listId).length : 0;
    
    const existing = await xanoFetch(`/mkt_contact_lists/${listId}`);
    if (existing && !existing._error) {
      const payload = { ...existing, contactCount: count, mkt_contact_lists_id: listId };
      delete payload.created_at;
      await xanoFetch(`/mkt_contact_lists/${listId}`, 'PATCH', payload);
    }
  } catch (e) {}
}

// ============ CONTACTS ============
export async function createContact(data: InsertContact) {
  const result = await xanoFetch('/mkt_contacts', 'POST', mapToXano({ ...data, user_id: 1, subscribed: true }));
  return { id: result.id || Math.floor(Math.random() * 1000) };
}

export async function bulkCreateContacts(dataArr: InsertContact[]) {
  if (dataArr.length === 0) return [];
  const results = await Promise.all(
    dataArr.map(c => xanoFetch('/mkt_contacts', 'POST', mapToXano({ ...c, user_id: c.userId || 1, subscribed: true })))
  );
  return results.filter(r => !r._error).map(r => ({ id: r.id }));
}

export async function getContacts(userId: number, opts?: { search?: string; listId?: number; page?: number; limit?: number }) {
  let contacts = await xanoFetch(`/mkt_contacts?user_id=${userId}`);
  if (!Array.isArray(contacts)) return { contacts: [], total: 0 };

  if (opts?.listId) {
    const members = await xanoFetch(`/mkt_contact_list_members?list_id=${opts.listId}`);
    const memberIds = Array.isArray(members) ? members.map((m: any) => m.contact_id) : [];
    contacts = contacts.filter((c: any) => memberIds.includes(c.id));
  }

  if (opts?.search) {
    const s = opts.search.toLowerCase();
    contacts = contacts.filter((c: any) =>
      c.email?.toLowerCase().includes(s) || c.firstName?.toLowerCase().includes(s) || c.lastName?.toLowerCase().includes(s)
    );
  }

  const limit = opts?.limit ?? 20;
  const page = opts?.page ?? 1;
  const offset = (page - 1) * limit;
  return { contacts: contacts.slice(offset, offset + limit).map(mapToApp), total: contacts.length };
}

export async function getContactById(id: number, userId: number) {
  const result = await xanoFetch(`/mkt_contacts/${id}`);
  return result && !result._error ? mapToApp(result) : undefined;
}

export async function updateContact(id: number, userId: number, data: Partial<InsertContact>) {
  const existing = await xanoFetch(`/mkt_contacts/${id}`);
  if (existing && !existing._error) {
    const payload = { ...existing, ...mapToXano(data), mkt_contacts_id: id, user_id: userId };
    delete payload.created_at;
    await xanoFetch(`/mkt_contacts/${id}`, 'PATCH', payload);
  }
}

export async function deleteContact(id: number, userId: number) {
  await xanoFetch(`/mkt_contacts/${id}`, 'DELETE');
}

export async function addContactsToList(contactIds: number[], listId: number) {
  if (contactIds.length === 0) return;
  const existingMembers = await xanoFetch(`/mkt_contact_list_members?list_id=${listId}`);
  let idsToAdd = contactIds;
  if (Array.isArray(existingMembers)) {
    const alreadyInList = new Set(existingMembers.map((m: any) => m.contact_id));
    idsToAdd = contactIds.filter(id => !alreadyInList.has(id));
  }
  if (idsToAdd.length > 0) {
    await Promise.all(idsToAdd.map(cid => xanoFetch('/mkt_contact_list_members', 'POST', { contact_id: cid, list_id: listId })));
  }
  await recalcListCount(listId);
}

export async function removeContactFromList(contactId: number, listId: number) {
  const members = await xanoFetch(`/mkt_contact_list_members?list_id=${listId}`);
  if (Array.isArray(members)) {
    const target = members.find((m: any) => m.contact_id === contactId);
    if (target) await xanoFetch(`/mkt_contact_list_members/${target.id}`, 'DELETE');
  }
  await recalcListCount(listId);
}

export async function getContactListsForContact(contactId: number) {
  const members = await xanoFetch(`/mkt_contact_list_members?contact_id=${contactId}`);
  if (!Array.isArray(members) || members.length === 0) return [];
  const listIds = members.map((m: any) => m.list_id);
  const allLists = await xanoFetch('/mkt_contact_lists');
  return Array.isArray(allLists) ? allLists.filter((l: any) => listIds.includes(l.id)).map(mapToApp) : [];
}

export async function getListContacts(listId: number) {
  const members = await xanoFetch(`/mkt_contact_list_members?list_id=${listId}`);
  if (!Array.isArray(members) || members.length === 0) return [];
  const contactIds = members.map((m: any) => m.contact_id);
  const allContacts = await xanoFetch('/mkt_contacts');
  return Array.isArray(allContacts) ? allContacts.filter((c: any) => contactIds.includes(c.id) && c.subscribed).map(mapToApp) : [];
}

// ============ CAMPAIGNS ============
export async function createCampaign(data: InsertCampaign) {
  const result = await xanoFetch('/mkt_campaigns', 'POST', mapToXano({
    ...data, status: data.status || 'draft', subjectConfirmed: false, user_id: 1
  }));
  return { id: result.id || Math.floor(Math.random() * 1000) };
}

export async function getCampaigns(userId: number) {
  const data = await xanoFetch(`/mkt_campaigns?user_id=${userId}`);
  return Array.isArray(data) ? data.map(mapToApp) : [];
}

export async function getCampaignById(id: number, userId: number) {
  const result = await xanoFetch(`/mkt_campaigns/${id}`);
  return result && !result._error ? mapToApp(result) : undefined;
}

export async function updateCampaign(id: number, userId: number, data: Partial<InsertCampaign>) {
  const existing = await xanoFetch(`/mkt_campaigns/${id}`);
  if (existing && !existing._error) {
    const payload = { ...existing, ...mapToXano(data), mkt_campaigns_id: id, user_id: userId };
    delete payload.created_at;
    const res = await xanoFetch(`/mkt_campaigns/${id}`, 'PATCH', payload);
    if (res._error) throw new Error("Erro ao salvar no Xano");
  }
}

export async function deleteCampaign(id: number, userId: number) {
  await xanoFetch(`/mkt_campaigns/${id}`, 'DELETE');
}

export async function getCampaignAttachments(campaignId: number) {
  const data = await xanoFetch(`/mkt_campaign_attachments?campaigns_id=${campaignId}`);
  return Array.isArray(data) ? data.map(mapToApp) : [];
}

export async function addCampaignAttachment(data: any) {
  const result = await xanoFetch('/mkt_campaign_attachments', 'POST', mapToXano(data));
  return { id: result.id };
}

export async function deleteCampaignAttachment(id: number) {
  await xanoFetch(`/mkt_campaign_attachments/${id}`, 'DELETE');
}

// ============ AUDIT LOGS E SMTP ============
export async function createAuditLog(data: InsertAuditLog) {
  await xanoFetch('/mkt_audit_logs', 'POST', mapToXano({ ...data, user_id: 1 }));
}

export async function getAuditLogs(userId: number, opts?: { page?: number; limit?: number; entityType?: string }) {
  let logs = await xanoFetch(`/mkt_audit_logs?user_id=${userId}`);
  if (!Array.isArray(logs)) return { logs: [], total: 0 };
  if (opts?.entityType) logs = logs.filter((l: any) => l.entityType === opts.entityType);
  return { logs: logs.slice(0, opts?.limit ?? 50).map(mapToApp), total: logs.length };
}

export async function getSmtpSettings(userId: number) {
  const data = await xanoFetch(`/mkt_smtp_settings?user_id=${userId}`);
  const settings = Array.isArray(data) ? data[0] : (!data?._error ? data : undefined);
  return settings ? mapToApp(settings) : undefined;
}

export async function upsertSmtpSettings(userId: number, data: Omit<InsertSmtpSettings, 'userId'>) {
  const existing = await getSmtpSettings(userId);
  if (existing?.id) {
    const raw = await xanoFetch(`/mkt_smtp_settings/${existing.id}`);
    const payload = { ...raw, ...mapToXano(data), mkt_smtp_settings_id: existing.id, user_id: userId, isActive: true };
    delete payload.created_at;
    await xanoFetch(`/mkt_smtp_settings/${existing.id}`, 'PATCH', payload);
    return { id: existing.id };
  }
  const result = await xanoFetch('/mkt_smtp_settings', 'POST', mapToXano({ ...data, user_id: userId, isActive: true }));
  return { id: result.id };
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats(userId: number) {
  const [contacts, lists, campaigns] = await Promise.all([
    xanoFetch(`/mkt_contacts?user_id=${userId}`),
    xanoFetch(`/mkt_contact_lists?user_id=${userId}`),
    xanoFetch(`/mkt_campaigns?user_id=${userId}`),
  ]);

  return {
    totalContacts: Array.isArray(contacts) ? contacts.length : 0,
    totalLists: Array.isArray(lists) ? lists.length : 0,
    totalCampaigns: Array.isArray(campaigns) ? campaigns.length : 0,
    sentCampaigns: Array.isArray(campaigns) ? campaigns.filter((c: any) => c.status === 'sent').length : 0,
  };
}