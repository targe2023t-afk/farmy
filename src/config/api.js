// ============================================================
// ملف: src/config/api.js
// يحل مشكلة: عدم الاتصال بالسيرفر + رسالة "إصدار قديم"
// ============================================================

// ✅ 1) غيّر هذا العنوان لعنوان سيرفرك الحقيقي
const SERVERS = {
  production: "https://your-api-server.com/api",
  local:      "http://localhost:5000/api",
  render:     "https://farmy-api.onrender.com/api",
};

// اختار السيرفر المناسب
export const API_BASE = SERVERS.production;

// ✅ 2) إصدار التطبيق - لازم يتطابق مع السيرفر
export const APP_VERSION = "1.1.0";
export const MIN_REQUIRED_VERSION = "1.0.0";

// ============================================================
// دالة الاتصال بالـ API مع معالجة كاملة للأخطاء
// ============================================================
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-App-Version": APP_VERSION,
    "X-Platform": "android",
    ...(options.headers || {}),
  };

  // أضف token المصادقة لو موجود
  const token = localStorage.getItem("auth_token");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    // ✅ معالجة رسالة "إصدار قديم" (426 Upgrade Required)
    if (response.status === 426) {
      const data = await response.json();
      console.warn("App version outdated:", data);
      return { 
        error: true, 
        code: "VERSION_OUTDATED",
        message: "يرجى تحديث التطبيق للاستمرار",
        minVersion: data.minVersion 
      };
    }

    // ✅ معالجة مشكلة انتهاء الجلسة
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.reload();
      return { error: true, code: "UNAUTHORIZED" };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();

  } catch (err) {
    // ✅ لو مفيش إنترنت أو السيرفر مش شغال — اشتغل offline
    console.warn("API unavailable, using offline mode:", err.message);
    return { error: true, code: "OFFLINE", offline: true };
  }
}

// ============================================================
// فحص الاتصال عند بدء التطبيق
// ============================================================
export async function checkServerConnection() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: { "X-App-Version": APP_VERSION },
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 426) {
      return { connected: true, versionOutdated: true };
    }

    return { connected: res.ok, versionOutdated: false };
  } catch {
    return { connected: false, versionOutdated: false };
  }
}
