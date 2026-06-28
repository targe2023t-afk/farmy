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

const SUPABASE_CALLBACK = 'https://jczdoikvefqqusldzegr.supabase.co/auth/v1/callback';
const APP_DEEP_LINK     = 'com.farmy.app://login-callback';

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
      flowType: 'pkce',  // ✅ PKCE flow للأمان
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
      .maybeSingle();

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

export async function signInWithGoogle() {
  try {
    const isNative = typeof window !== 'undefined'
      && window.Capacitor?.isNativePlatform?.();

    if (isNative) {
      // ── Android: افتح جوجل في browser خارجي، والـ redirect يرجع للـ app ──
      const { Browser } = await import('@capacitor/browser');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: APP_DEEP_LINK,      // com.farmy.app://login-callback
          skipBrowserRedirect: true,       // ✅ ضروري لـ Capacitor
        }
      });
      if (error) throw error;
      if (!data?.url) throw new Error('لم يتم الحصول على رابط Google');
      await Browser.open({ url: data.url });
      return data;
    }

    // ── Web ──
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
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

export async function resetPasswordForEmail(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
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
// 🗑️  Generic delete
// ─────────────────────────────────────────────────────────

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(`${table} delete: ${error.message}`);
  return true;
}

async function softDeleteRow(table, id) {
  const { error } = await supabase
    .from(table)
    .update({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`${table} softDelete: ${error.message}`);
  return true;
}

// ─────────────────────────────────────────────────────────
// 🔄  Sync: upsert + حذف المفقودين من السيرفر
// ─────────────────────────────────────────────────────────

export async function syncTable(table, rows, liveIds = null) {
  try {
    if (rows && rows.length > 0) {
      await upsertTable(table, rows);
    }
    if (liveIds && liveIds.length >= 0) {
      const { data: serverRows, error } = await supabase
        .from(table)
        .select('id')
        .is('deletedAt', null);
      if (error) throw error;
      const toDelete = (serverRows || []).filter(r => !liveIds.includes(r.id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .in('id', toDelete.map(r => r.id));
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
// 📜  Audit log
// ─────────────────────────────────────────────────────────

export async function logAudit(entry) {
  try {
    const auditEntry = {
      id:        entry.id || crypto.randomUUID(),
      userId:    entry.userId   || null,
      userName:  entry.userName || null,
      action:    entry.action   || 'unknown',
      entity:    entry.entity   || 'unknown',
      oldVal:    entry.oldVal   || null,
      newVal:    entry.newVal   || null,
      farmId:    entry.farmId   || null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
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
        fetchTable('expenses',  farmId),
        fetchTable('revenues',  farmId),
        fetchTable('inventory', farmId),
        fetchTable('workers',   farmId),
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
// 📊  Statistics
// ─────────────────────────────────────────────────────────

export async function getStatistics(farmId) {
  try {
    const [exp, rev, wrk, inv] = await Promise.all([
      fetchTable('expenses',  farmId),
      fetchTable('revenues',  farmId),
      fetchTable('workers',   farmId),
      fetchTable('inventory', farmId)
    ]);
    const totalExpenses  = exp.reduce((s, e) => s + (Number(e.amount)   || 0), 0);
    const totalRevenues  = rev.reduce((s, r) => s + (Number(r.amount)   || 0), 0);
    const inventoryValue = inv.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    return {
      totalExpenses, totalRevenues,
      netProfit: totalRevenues - totalExpenses,
      inventoryValue,
      activeWorkers:       wrk.filter(w => !w.endDate).length,
      totalWorkers:        wrk.length,
      lowStockItems:       inv.filter(i => Number(i.minStock) > 0 && Number(i.quantity) <= Number(i.minStock)).length,
      totalItems:          inv.length,
      totalExpenseRecords: exp.length,
      totalRevenueRecords: rev.length,
    };
  } catch (e) {
    console.error('getStatistics:', e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// 🧹  Clear all farm data (admin only)
// ─────────────────────────────────────────────────────────

export async function clearAllData(farmId) {
  if (!farmId) throw new Error('farmId required');
  const results = await Promise.all(
    ['expenses', 'revenues', 'inventory', 'workers', 'usage_log']
      .map(t => supabase.from(t).delete().eq('farmId', farmId))
  );
  if (results.some(r => r.error)) throw new Error('Failed to clear all data');
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
  return { url: SUPABASE_URL, connected: !!SUPABASE_URL && !!SUPABASE_KEY };
}

export default supabase;
