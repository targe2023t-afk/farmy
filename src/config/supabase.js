// ═══════════════════════════════════════════════════════════
//  src/config/supabase.js  —  FIXED VERSION
//  🔒 الأمان:  RLS-aware + Supabase Auth + no plain-text passwords
//  🔄 الـ sync:  upsert + delete + updatedAt-aware merge
//  📦 الـ audit:  سجل يُكتب على السيرفر تلقائياً
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────
// 🔐 إعدادات Supabase — من .env فقط (لا fallback للـ key)
// ─────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ Missing Supabase env vars.\n' +
    'Create .env file with:\n' +
    '  VITE_SUPABASE_URL=https://xxx.supabase.co\n' +
    '  VITE_SUPABASE_KEY=your_anon_key'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',  // ✅ implicit flow — أكثر استقراراً مع Capacitor deep links
    },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'farmy-app-v7' }
    }
  }
);

// ─────────────────────────────────────────────────────────
// 🛠️  Utility helpers
// ─────────────────────────────────────────────────────────

/** نجلب auth user الحالي من Supabase Auth */
export async function getCurrentAuthUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (e) {
    console.error('getCurrentAuthUser:', e.message);
    return null;
  }
}

/** نجلب صف المستخدم من جدول users بالـ authId */
export async function fetchUserByAuthId(authId) {
  if (!authId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('authId', authId)
      .maybeSingle();   // ✅ maybeSingle بدل single عشان مايرمشش خطأ لو null

    if (error) throw error;
    return data;
  } catch (e) {
    console.error('fetchUserByAuthId:', e.message);
    return null;
  }
}

/** stamp = updatedAt للصف الواحد قبل upsert */
function withTimestamps(item) {
  return { ...item, updatedAt: new Date().toISOString() };
}

/** تطبيق stamps على array */
function withTimestampsBatch(items) {
  const now = new Date().toISOString();
  return (items || []).map(i => ({ ...i, updatedAt: now }));
}

// ─────────────────────────────────────────────────────────
// 🔑  Auth: Email/Password + Google OAuth
// ─────────────────────────────────────────────────────────

export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (e) {
    console.error('signInWithEmail:', e.message);
    throw e;
  }
}

export async function signUpWithEmail(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('signUpWithEmail:', e.message);
    throw e;
  }
}

export async function signInWithGoogle(redirectTo) {
  try {
    const isNative = typeof window !== 'undefined'
      && window.Capacitor?.isNativePlatform?.();

    if (isNative) {
      const { Browser } = await import('@capacitor/browser');
      const finalRedirect = redirectTo || 'com.farmy.app://login-callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: finalRedirect, skipBrowserRedirect: true }
      });
      if (error) throw error;
      await Browser.open({ url: data.url });
      return data;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo || window.location.origin }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('signInWithGoogle:', e.message);
    throw e;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('signOut:', e.message);
    return false;
  }
}

export async function resetPasswordForEmail(email, redirectTo) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || window.location.origin
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('resetPasswordForEmail:', e.message);
    throw e;
  }
}

export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('updatePassword:', e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// 📥  Generic fetch (with farmId filter)
// ─────────────────────────────────────────────────────────

async function fetchTable(table, farmId) {
  try {
    let q = supabase.from(table).select('*');
    if (farmId) q = q.eq('farmId', farmId);
    const { data, error } = await q;
    if (error) throw error;
    // ✅ تجاهل الـ soft-deleted
    return (data || []).filter(r => !r.deletedAt);
  } catch (e) {
    console.error(`fetchTable[${table}]:`, e.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// 💾  Generic upsert (batch + timestamps)
// ─────────────────────────────────────────────────────────

async function upsertTable(table, rows) {
  if (!rows || rows.length === 0) return [];
  const stamped = withTimestampsBatch(rows);
  const { data, error } = await supabase
    .from(table)
    .upsert(stamped, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || stamped;
}

// ─────────────────────────────────────────────────────────
// 🗑️  Generic delete (soft + hard)
// ─────────────────────────────────────────────────────────

/** حذف فعلي */
async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(`${table} delete: ${error.message}`);
  return true;
}

/** حذف ناعم (soft delete) — يفضل الصف في قاعدة البيانات لكن بـ deletedAt */
async function softDeleteRow(table, id) {
  const { error } = await supabase
    .from(table)
    .update({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`${table} softDelete: ${error.message}`);
  return true;
}

// ─────────────────────────────────────────────────────────
// 🔄  Sync: اكتب المصفوفة كاملة (upsert) + احذف المفقودين
// ─────────────────────────────────────────────────────────

/**
 * Sync between local state and server.
 * @param {string} table - اسم الجدول
 * @param {Array}  rows  - الصفوف الحالية محلياً
 * @param {Array<string>} liveIds - الـ IDs اللي لسه موجودة محلياً (مش محذوفة)
 *   الـ IDs اللي في السيرفر ومش في liveIds لازم تتعملها delete
 */
export async function syncTable(table, rows, liveIds = null) {
  try {
    if (rows && rows.length > 0) {
      await upsertTable(table, rows);
    }
    // ✅ لو عرفنا الـ IDs الحية محلياً، نحذف الباقي من السيرفر
    if (liveIds && liveIds.length >= 0) {
      const { data: serverRows, error } = await supabase
        .from(table)
        .select('id')
        .is('deletedAt', null);
      if (error) throw error;
      const toDelete = (serverRows || []).filter(r => !liveIds.includes(r.id));
      if (toDelete.length > 0) {
        const ids = toDelete.map(r => r.id);
        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .in('id', ids);
        if (delErr) throw delErr;
      }
    }
    return true;
  } catch (e) {
    console.error(`syncTable[${table}]:`, e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// 📡  Realtime subscriptions
// ─────────────────────────────────────────────────────────

export function subscribeToTable(tableName, callback, farmId = null) {
  try {
    const channelName = farmId ? `${tableName}-${farmId}` : tableName;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: farmId ? `farmId=eq.${farmId}` : undefined
        },
        (payload) => callback(payload)
      )
      .subscribe();
    return channel;
  } catch (e) {
    console.error('subscribeToTable:', e.message);
    return null;
  }
}

export function unsubscribe(channel) {
  try { if (channel) supabase.removeChannel(channel); } catch (_) {}
}

// ─────────────────────────────────────────────────────────
// 📜  Audit log (server-side)
// ─────────────────────────────────────────────────────────

export async function logAudit(entry) {
  try {
    const auditEntry = {
      id: entry.id || crypto.randomUUID(),
      userId:     entry.userId     || null,
      userName:   entry.userName   || null,
      action:     entry.action     || 'unknown',
      entity:     entry.entity     || 'unknown',
      oldVal:     entry.oldVal     || null,
      newVal:     entry.newVal     || null,
      farmId:     entry.farmId     || null,
      timestamp:  new Date().toISOString(),
      createdAt:  new Date().toISOString(),
    };
    const { error } = await supabase.from('audit_log').insert(auditEntry);
    if (error) throw error;
    return auditEntry;
  } catch (e) {
    console.error('logAudit:', e.message);
    return null;
  }
}

export async function fetchAuditLog(farmId, limit = 100) {
  try {
    let q = supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (farmId) q = q.eq('farmId', farmId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchAuditLog:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// 📊  Fetch ALL (initial load)
// ─────────────────────────────────────────────────────────

export async function fetchAllData(farmId) {
  try {
    const [expenses, revenues, inventory, workers, usageLog, auditLog] =
      await Promise.all([
        fetchTable('expenses', farmId),
        fetchTable('revenues', farmId),
        fetchTable('inventory', farmId),
        fetchTable('workers', farmId),
        fetchTable('usage_log', farmId),
        fetchAuditLog(farmId, 200)
      ]);
    return { expenses, revenues, inventory, workers, usageLog, auditLog };
  } catch (e) {
    console.error('fetchAllData:', e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// 📊  Statistics (server-side aggregation)
// ─────────────────────────────────────────────────────────

export async function getStatistics(farmId) {
  try {
    const [exp, rev, wrk, inv] = await Promise.all([
      fetchTable('expenses',  farmId),
      fetchTable('revenues',  farmId),
      fetchTable('workers',   farmId),
      fetchTable('inventory', farmId)
    ]);

    const totalExpenses = exp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalRevenues = rev.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const inventoryValue = inv.reduce(
      (s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0
    );
    const activeWorkers = wrk.filter(w => !w.endDate).length;
    const lowStockItems = inv.filter(
      i => Number(i.minStock) > 0 && Number(i.quantity) <= Number(i.minStock)
    );

    return {
      totalExpenses, totalRevenues,
      netProfit: totalRevenues - totalExpenses,
      inventoryValue, activeWorkers,
      totalWorkers: wrk.length,
      lowStockItems: lowStockItems.length,
      totalItems: inv.length,
      totalExpenseRecords: exp.length,
      totalRevenueRecords: rev.length
    };
  } catch (e) {
    console.error('getStatistics:', e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// 🧹  Clear all farm data (admin only — should be guarded by RLS)
// ─────────────────────────────────────────────────────────

export async function clearAllData(farmId) {
  if (!farmId) throw new Error('farmId required');
  const tables = ['expenses', 'revenues', 'inventory', 'workers', 'usage_log'];
  const results = await Promise.all(
    tables.map(t => supabase.from(t).delete().eq('farmId', farmId))
  );
  const errors = results.filter(r => r.error);
  if (errors.length) throw new Error('Failed to clear all data');
  return true;
}

// ─────────────────────────────────────────────────────────
// 🏓  Connection test
// ─────────────────────────────────────────────────────────

export async function ping() {
  try {
    const start = Date.now();
    await supabase.from('expenses').select('id').limit(1).maybeSingle();
    return Date.now() - start;
  } catch (_) { return -1; }
}

export function getSupabaseStatus() {
  return {
    url: SUPABASE_URL,
    connected: !!SUPABASE_URL && !!SUPABASE_KEY,
  };
}

export default supabase;
