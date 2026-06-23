// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════
const SUPABASE_URL = "https://eczbanusmdjfeenttusb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemJhbnVzbWRqZmVlbnR0dXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTcyOTQsImV4cCI6MjA5NjYzMzI5NH0.Kd9CttNPY4BkXyF3SA74bWHfat734aEBEytyDrgFfzs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'farmy-app-v6'
    }
  }
});

// ═══════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Get current user's farmId from localStorage
 */
function getCurrentFarmId() {
  try {
    const userData = localStorage.getItem('fmv6_user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    // Use user.id as farmId (each user = one farm in your design)
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Ensure item has farmId before saving
 */
function ensureFarmId(item) {
  const farmId = item.farmId || getCurrentFarmId();
  if (!farmId) {
    console.warn('⚠️ No farmId found - item may not be properly isolated');
  }
  return { ...item, farmId };
}

// ═══════════════════════════════════════════════════
// 🧪 TEST CONNECTION
// ═══════════════════════════════════════════════════

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("❌ Supabase connection failed:", error.message);
      return false;
    }
    
    console.log("✅ Connected to Supabase successfully!");
    return true;
  } catch(e) {
    console.error("❌ Connection error:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════
// 💰 EXPENSES
// ═══════════════════════════════════════════════════

export async function getExpenses(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    
    // Filter by farmId if available
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getExpenses error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getExpenses failed:', error);
    return [];
  }
}

export async function upsertExpense(item) {
  try {
    const itemWithFarm = ensureFarmId(item);
    
    const { data, error } = await supabase
      .from('expenses')
      .upsert(itemWithFarm, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || itemWithFarm;
  } catch (error) {
    console.error('❌ upsertExpense error:', error.message);
    throw error;
  }
}

export async function deleteExpense(id) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ deleteExpense error:', error.message);
    throw error;
  }
}

export async function batchUpsertExpenses(items) {
  try {
    const itemsWithFarm = items.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from('expenses')
      .upsert(itemsWithFarm, { onConflict: 'id' });
    
    if (error) throw error;
    return data || itemsWithFarm;
  } catch (error) {
    console.error('❌ batchUpsertExpenses error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 💵 REVENUES
// ═══════════════════════════════════════════════════

export async function getRevenues(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('revenues')
      .select('*')
      .order('date', { ascending: false });
    
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getRevenues error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getRevenues failed:', error);
    return [];
  }
}

export async function upsertRevenue(item) {
  try {
    const itemWithFarm = ensureFarmId(item);
    
    const { data, error } = await supabase
      .from('revenues')
      .upsert(itemWithFarm, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || itemWithFarm;
  } catch (error) {
    console.error('❌ upsertRevenue error:', error.message);
    throw error;
  }
}

export async function deleteRevenue(id) {
  try {
    const { error } = await supabase
      .from('revenues')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ deleteRevenue error:', error.message);
    throw error;
  }
}

export async function batchUpsertRevenues(items) {
  try {
    const itemsWithFarm = items.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from('revenues')
      .upsert(itemsWithFarm, { onConflict: 'id' });
    
    if (error) throw error;
    return data || itemsWithFarm;
  } catch (error) {
    console.error('❌ batchUpsertRevenues error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 📦 INVENTORY
// ═══════════════════════════════════════════════════

export async function getInventory(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('inventory')
      .select('*')
      .order('name');
    
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getInventory error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getInventory failed:', error);
    return [];
  }
}

export async function upsertInventory(item) {
  try {
    const itemWithFarm = ensureFarmId(item);
    
    const { data, error } = await supabase
      .from('inventory')
      .upsert(itemWithFarm, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || itemWithFarm;
  } catch (error) {
    console.error('❌ upsertInventory error:', error.message);
    throw error;
  }
}

export async function deleteInventory(id) {
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ deleteInventory error:', error.message);
    throw error;
  }
}

export async function batchUpsertInventory(items) {
  try {
    const itemsWithFarm = items.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from('inventory')
      .upsert(itemsWithFarm, { onConflict: 'id' });
    
    if (error) throw error;
    return data || itemsWithFarm;
  } catch (error) {
    console.error('❌ batchUpsertInventory error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 👷 WORKERS
// ═══════════════════════════════════════════════════

export async function getWorkers(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('workers')
      .select('*')
      .order('name');
    
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getWorkers error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getWorkers failed:', error);
    return [];
  }
}

export async function upsertWorker(item) {
  try {
    const itemWithFarm = ensureFarmId(item);
    
    const { data, error } = await supabase
      .from('workers')
      .upsert(itemWithFarm, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || itemWithFarm;
  } catch (error) {
    console.error('❌ upsertWorker error:', error.message);
    throw error;
  }
}

export async function deleteWorker(id) {
  try {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ deleteWorker error:', error.message);
    throw error;
  }
}

export async function batchUpsertWorkers(items) {
  try {
    const itemsWithFarm = items.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from('workers')
      .upsert(itemsWithFarm, { onConflict: 'id' });
    
    if (error) throw error;
    return data || itemsWithFarm;
  } catch (error) {
    console.error('❌ batchUpsertWorkers error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 📝 USAGE LOG
// ═══════════════════════════════════════════════════

export async function getUsageLog(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('usage_log')
      .select('*')
      .order('date', { ascending: false });
    
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getUsageLog error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getUsageLog failed:', error);
    return [];
  }
}

export async function upsertUsageLog(item) {
  try {
    const itemWithFarm = ensureFarmId(item);
    
    const { data, error } = await supabase
      .from('usage_log')
      .upsert(itemWithFarm, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || itemWithFarm;
  } catch (error) {
    console.error('❌ upsertUsageLog error:', error.message);
    throw error;
  }
}

export async function batchUpsertUsageLog(items) {
  try {
    const itemsWithFarm = items.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from('usage_log')
      .upsert(itemsWithFarm, { onConflict: 'id' });
    
    if (error) throw error;
    return data || itemsWithFarm;
  } catch (error) {
    console.error('❌ batchUpsertUsageLog error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 👥 USERS
// ═══════════════════════════════════════════════════

export async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ getUsers error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getUsers failed:', error);
    return [];
  }
}

export async function getUsersByFarm(farmId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('farmId', farmId)
      .order('name');
    
    if (error) {
      console.error('❌ getUsersByFarm error:', error.message);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getUsersByFarm failed:', error);
    return [];
  }
}

export async function upsertUser(item) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(item, { onConflict: 'id' })
      .select();
    
    if (error) throw error;
    return data?.[0] || item;
  } catch (error) {
    console.error('❌ upsertUser error:', error.message);
    throw error;
  }
}

export async function deleteUser(id) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ deleteUser error:', error.message);
    throw error;
  }
}

export async function batchUpsertUsers(items) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(items, { onConflict: 'id' });
    
    if (error) throw error;
    return data || items;
  } catch (error) {
    console.error('❌ batchUpsertUsers error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 🔄 BATCH SYNC (Generic)
// ═══════════════════════════════════════════════════

export async function syncTable(tableName, rows) {
  try {
    if (!rows || rows.length === 0) {
      console.log(`ℹ️ No data to sync for table: ${tableName}`);
      return [];
    }
    
    // Ensure farmId on all items (except users table)
    const processedRows = tableName === 'users' 
      ? rows 
      : rows.map(ensureFarmId);
    
    const { data, error } = await supabase
      .from(tableName)
      .upsert(processedRows, { 
        onConflict: 'id', 
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ syncTable error for ${tableName}:`, error.message);
      throw error;
    }
    
    console.log(`✅ Synced ${processedRows.length} rows to ${tableName}`);
    return data || processedRows;
  } catch (error) {
    console.error(`❌ syncTable failed for ${tableName}:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 📊 FETCH ALL DATA
// ═══════════════════════════════════════════════════

export async function fetchAllData(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    console.log(`🔄 Fetching all data for farmId: ${targetFarmId || 'ALL'}`);
    
    // Build queries with optional farm filtering
    const buildQuery = (table) => {
      let query = supabase.from(table).select('*');
      if (targetFarmId) {
        query = query.eq('farmId', targetFarmId);
      }
      return query;
    };
    
    const [
      { data: expenses, error: e1 },
      { data: revenues, error: e2 },
      { data: inventory, error: e3 },
      { data: workers, error: e4 },
      { data: usageLog, error: e5 },
      { data: users, error: e6 }
    ] = await Promise.all([
      buildQuery('expenses'),
      buildQuery('revenues'),
      buildQuery('inventory'),
      buildQuery('workers'),
      buildQuery('usage_log'),
      supabase.from('users').select('*') // No farm filter for users
    ]);

    // Check for errors
    if (e1) throw new Error(`expenses: ${e1.message}`);
    if (e2) throw new Error(`revenues: ${e2.message}`);
    if (e3) throw new Error(`inventory: ${e3.message}`);
    if (e4) throw new Error(`workers: ${e4.message}`);
    if (e5) throw new Error(`usage_log: ${e5.message}`);
    if (e6) throw new Error(`users: ${e6.message}`);

    const result = { 
      expenses: expenses || [], 
      revenues: revenues || [], 
      inventory: inventory || [], 
      workers: workers || [], 
      usageLog: usageLog || [], 
      users: users || [] 
    };
    
    console.log('✅ All data fetched successfully:', {
      expenses: result.expenses.length,
      revenues: result.revenues.length,
      inventory: result.inventory.length,
      workers: result.workers.length,
      usageLog: result.usageLog.length,
      users: result.users.length
    });
    
    return result;
  } catch (error) {
    console.error('❌ fetchAllData error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 📡 REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════

export function subscribeToTable(tableName, callback, farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    const channelName = targetFarmId 
      ? `${tableName}-${targetFarmId}` 
      : tableName;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: targetFarmId ? `farmId=eq.${targetFarmId}` : undefined
        },
        (payload) => {
          console.log(`📡 ${tableName} change detected:`, payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${tableName}:`, status);
      });

    console.log(`✅ Subscribed to ${tableName} changes`);
    return channel;
  } catch (error) {
    console.error(`❌ subscribeToTable error for ${tableName}:`, error);
    return null;
  }
}

export function unsubscribe(channel) {
  try {
    if (channel) {
      supabase.removeChannel(channel);
      console.log('✅ Unsubscribed from channel');
    }
  } catch (error) {
    console.error('❌ unsubscribe error:', error);
  }
}

// ═══════════════════════════════════════════════════
// 📜 AUDIT LOG
// ═══════════════════════════════════════════════════

export async function logAudit(entry) {
  try {
    const farmId = entry.farmId || getCurrentFarmId();
    
    const auditEntry = {
      id: crypto.randomUUID(),
      ...entry,
      farmId,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('audit_log')
      .insert(auditEntry)
      .select();
    
    if (error) {
      console.error('❌ Audit log error:', error.message);
      return null;
    }
    
    return data?.[0] || auditEntry;
  } catch (error) {
    console.error('❌ logAudit failed:', error);
    return null;
  }
}

export async function getAuditLog(farmId = null, limit = 100) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (targetFarmId) {
      query = query.eq('farmId', targetFarmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ getAuditLog error:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ getAuditLog failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════
// 📈 STATISTICS
// ═══════════════════════════════════════════════════

export async function getStatistics(farmId = null) {
  try {
    const targetFarmId = farmId || getCurrentFarmId();
    
    console.log(`📊 Calculating statistics for farmId: ${targetFarmId}`);
    
    const [expensesData, revenuesData, workersData, inventoryData] = await Promise.all([
      getExpenses(targetFarmId),
      getRevenues(targetFarmId),
      getWorkers(targetFarmId),
      getInventory(targetFarmId)
    ]);

    const totalExpenses = expensesData.reduce(
      (sum, e) => sum + (Number(e.amount) || 0), 
      0
    );
    
    const totalRevenues = revenuesData.reduce(
      (sum, r) => sum + (Number(r.amount) || 0), 
      0
    );
    
    const netProfit = totalRevenues - totalExpenses;
    
    const inventoryValue = inventoryData.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 
      0
    );
    
    const activeWorkers = workersData.filter(w => !w.endDate).length;
    
    const lowStockItems = inventoryData.filter(
      i => Number(i.minStock) > 0 && Number(i.quantity) <= Number(i.minStock)
    );
    
    const stats = {
      totalExpenses,
      totalRevenues,
      netProfit,
      inventoryValue,
      activeWorkers,
      totalWorkers: workersData.length,
      lowStockItems: lowStockItems.length,
      lowStockDetails: lowStockItems,
      totalItems: inventoryData.length,
      totalExpenseRecords: expensesData.length,
      totalRevenueRecords: revenuesData.length
    };
    
    console.log('✅ Statistics calculated:', stats);
    
    return stats;
  } catch (error) {
    console.error('❌ getStatistics error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 🔐 LEGACY AUTH (Kept for compatibility - not used in App.jsx)
// ═══════════════════════════════════════════════════

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ signIn error:', error.message);
    throw error;
  }
}

export async function signUp(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ signUp error:', error.message);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('fmv6_user');
    return true;
  } catch (error) {
    console.error('❌ signOut error:', error.message);
    throw error;
  }
}

export async function getCurrentAuthUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('❌ getCurrentAuthUser error:', error.message);
    return null;
  }
}

export async function resetPassword(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ resetPassword error:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════

export async function ping() {
  try {
    const start = Date.now();
    await supabase.from('expenses').select('id').limit(1);
    const latency = Date.now() - start;
    console.log(`🏓 Supabase ping: ${latency}ms`);
    return latency;
  } catch (error) {
    console.error('❌ ping failed:', error);
    return -1;
  }
}

export async function clearAllData(farmId) {
  try {
    if (!farmId) {
      throw new Error('farmId is required to clear data');
    }
    
    const tables = ['expenses', 'revenues', 'inventory', 'workers', 'usage_log'];
    
    const results = await Promise.all(
      tables.map(table => 
        supabase.from(table).delete().eq('farmId', farmId)
      )
    );
    
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error('❌ Some tables failed to clear:', errors);
      throw new Error('Failed to clear all data');
    }
    
    console.log('✅ All farm data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ clearAllData error:', error);
    throw error;
  }
}

export function getSupabaseStatus() {
  return {
    url: SUPABASE_URL,
    connected: !!supabase,
    currentFarmId: getCurrentFarmId()
  };
}

// ═══════════════════════════════════════════════════
// 🎯 DEFAULT EXPORT
// ═══════════════════════════════════════════════════

export default supabase;
