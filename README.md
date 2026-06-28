# Farmy v7.0 — Secure Edition 🌾

نظام إدارة المزرعة — نسخة محسّنة أمنياً ومزودة بـ:
- ✅ **Supabase Auth** حقيقي (بدل كلمات المرور بنص صريح)
- 🛡️ **Row Level Security (RLS)** على كل الجداول
- 🔄 **مزامنة ذكية** تحترم `updatedAt` وتحذف من السيرفر فعلياً
- 📜 **سجل تغييرات** يُكتب على السيرفر تلقائياً
- 🧯 **Error Boundary** يمنع الشاشة البيضاء
- ⚡ **PWA / Service Worker** للتشغيل offline فعلياً
- 🔙 **زر رجوع Android** يتصرف بشكل صحيح
- 🛡️ **تحقق من المدخلات** في كل النماذج

---

## 📦 التثبيت

```bash
# 1) انسخ .env.example إلى .env واملأ القيم
cp .env.example .env

# 2) ثبّت الاعتماديات
npm install

# 3) شغّل التطبيق
npm run dev
```

---

## 🛡️ خطوات Supabase الإلزامية

### 1) شغّل SQL migration
افتح **Supabase Dashboard → SQL Editor** والصق محتوى:
```
sql/rls_migration.sql
```
ثم اضغط **Run**. هذا سيفعّل RLS على كل الجداول ويضيف أعمدة `updatedAt` و `authId`.

### 2) فعّل Email/Password Auth
- Dashboard → **Authentication → Providers**
- فعّل **Email** (و Google لو محتاج)

### 3) أنشئ أول admin
بعد تفعيل Email Auth:
1. سجّل حساب جديد من التطبيق (email + password)
2. في Supabase Dashboard → **Table Editor → users**
3. غيّر `role` للمستخدم الجديد إلى `admin` يدوياً

### 4) احذف عمود password من جدول users (اختياري لكن موصى به)
بعد التأكد من أن كل المستخدمين لهم `authId`:
```sql
ALTER TABLE users DROP COLUMN IF EXISTS password;
```

---

## 🚀 البناء للأندرويد

```bash
# ربط Capacitor (أول مرة فقط)
npx cap init farmy com.farmy.app --web-dir=dist

# إضافة منصة Android
npx cap add android

# نسخ ملفات Android المخصصة (AndroidManifest.xml + build.gradle)
cp android-config/AndroidManifest.xml android/app/src/main/
cp android-config/build.gradle android/app/

# البناء
npm run build:android

# فتح في Android Studio
npx cap open android
```

---

## 🔐 ملاحظات أمنية مهمة

| القاعدة | لماذا |
|---------|-------|
| لا ترفع `.env` إلى Git | يحتوي على مفاتيح |
| شغّل `rls_migration.sql` قبل النشر | بدون RLS، anon key يخترق كل البيانات |
| لا تستخدم `service_role` key في الكود | يكسر الـ RLS تماماً |
| لا تخزّن كلمات مرور بنص صريح | استخدم Supabase Auth فقط |
| تحقق من `user.status === "active"` | عشان المستخدمين الموقوفين |

---

## 📁 هيكل المشروع

```
farmy-fixed/
├── .env.example              # نموذج المتغيرات البيئية
├── .eslintrc.json            # إعدادات ESLint
├── .prettierrc               # إعدادات Prettier
├── .gitignore
├── package.json              # v7.0.0 — secure edition
├── vite.config.js            # ✅ مع PWA plugin
├── capacitor.config.json
├── codemagic.yaml            # CI/CD
├── index.html
├── README.md                 # هذا الملف
├── sql/
│   └── rls_migration.sql     # ✅ RLS + triggers + schema
├── android-config/
│   ├── AndroidManifest.xml   # + deep link + permissions
│   └── build.gradle
├── public/
│   ├── manifest.json
│   ├── logo.png
│   └── icons/                # PWA icons
└── src/
    ├── main.jsx              # ✅ مع ErrorBoundary
    ├── App.jsx               # ✅ معاد كتابته بالكامل
    ├── App.css
    ├── index.css
    ├── components/
    │   └── ErrorBoundary.jsx # ✅ جديد
    ├── hooks/
    │   └── useCamera.js
    └── config/
        ├── supabase.js       # ✅ معاد كتابته بالكامل
        └── api.js
```

---

## 🆚 الفرق عن الإصدار السابق (v6.4 → v7.0)

| المشكلة في v6.4 | الحل في v7.0 |
|-----------------|--------------|
| كلمات المرور بنص صريح | Supabase Auth (email + password) |
| Admin افتراضي `1234` | مفيش admin افتراضي |
| Auth bypass عبر `password:""` | مستخدمو Google فقط عبر OAuth |
| ثقة في `user` من localStorage | تحقق من السيرفر عبر `authId` |
| لا يوجد RLS | SQL migration كامل + policies |
| الحذف ما يوصلش السيرفر | `syncTable` يحذف المفقودين |
| `mergeById` يتجاهل التحديثات | يحترم `updatedAt` |
| Audit log محلي فقط | `logAudit` يكتب على السيرفر |
| لا Error Boundary | `ErrorBoundary` component |
| لا Service Worker | `vite-plugin-pwa` |
| مفيش back button | `Capacitor App.addListener('backButton')` |
| مفيش validation | تحقق في كل save |
| مفتاح Supabase hard-coded | `.env` فقط |
| localStorage keys بـ `fmv6_` | `fmv7_` (للعزل) |

---

## ❓ مشاكل شائعة

**Q: الشاشة فاضية بعد الـ deploy؟**  
A: تأكد إن `.env` فيه القيم الصحيحة، وتأكد إن `rls_migration.sql` اشتغل.

**Q: مينفعش أعمل login؟**  
A: سجل حساب جديد من التطبيق → في Supabase Table Editor غيّر role إلى `admin` أو `manager`.

**Q: Google OAuth مش شغال على Web؟**  
A: في Supabase → Authentication → URL Configuration، تأكد إن `Site URL` و `Redirect URLs` صحيحين.

**Q: البيانات مش بتظهر؟**  
A: تأكد إن المستخدم له `farmId` مطابق للبيانات، وإن الـ RLS policy بتسمح له.

---

## 📞 الدعم

لأي مشكلة في التركيب، راجع:
1. Console logs في المتصفح (F12)
2. Supabase Dashboard → Logs
3. ملف `sql/rls_migration.sql` لو فيه خطأ في الـ policies
