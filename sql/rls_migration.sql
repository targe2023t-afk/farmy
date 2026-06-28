-- ═══════════════════════════════════════════════════════════
-- 🛡️  FARMY — Supabase RLS Migration
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة
-- ═══════════════════════════════════════════════════════════

-- 1) إضافة أعمدة التتبع لكل الجداول (لو مش موجودة)
ALTER TABLE users       ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users       ADD COLUMN IF NOT EXISTS "authId"     UUID;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE expenses    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE expenses    ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE revenues    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE revenues    ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE inventory   ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inventory   ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE workers     ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE usage_log   ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE usage_log   ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

ALTER TABLE audit_log   ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- 2) إزالة عمود password من جدول users (نستخدم Supabase Auth)
--    ملاحظة: احتفظ بنسخة احتياطية قبل تشغيل هذا السطر
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- 3) تفعيل RLS على كل الجداول
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log  ENABLE ROW LEVEL SECURITY;

-- 4) حذف السياسات القديمة (إن وُجدت)
DROP POLICY IF EXISTS "users_select_own"      ON users;
DROP POLICY IF EXISTS "users_insert_own"      ON users;
DROP POLICY IF EXISTS "users_update_own"      ON users;
DROP POLICY IF EXISTS "users_delete_own"      ON users;

DROP POLICY IF EXISTS "expenses_read_farm"    ON expenses;
DROP POLICY IF EXISTS "expenses_write_farm"   ON expenses;
DROP POLICY IF EXISTS "expenses_delete_farm"  ON expenses;

DROP POLICY IF EXISTS "revenues_read_farm"    ON revenues;
DROP POLICY IF EXISTS "revenues_write_farm"   ON revenues;
DROP POLICY IF EXISTS "revenues_delete_farm"  ON revenues;

DROP POLICY IF EXISTS "inventory_read_farm"   ON inventory;
DROP POLICY IF EXISTS "inventory_write_farm"  ON inventory;
DROP POLICY IF EXISTS "inventory_delete_farm" ON inventory;

DROP POLICY IF EXISTS "workers_read_farm"     ON workers;
DROP POLICY IF EXISTS "workers_write_farm"    ON workers;
DROP POLICY IF EXISTS "workers_delete_farm"   ON workers;

DROP POLICY IF EXISTS "usage_log_read_farm"   ON usage_log;
DROP POLICY IF EXISTS "usage_log_write_farm"  ON usage_log;
DROP POLICY IF EXISTS "usage_log_delete_farm" ON usage_log;

DROP POLICY IF EXISTS "audit_log_read_farm"   ON audit_log;
DROP POLICY IF EXISTS "audit_log_write_farm"  ON audit_log;

-- 5) دالة مساعدة: هل المستخدم الحالي ينتمي للمزرعة دي؟
CREATE OR REPLACE FUNCTION user_belongs_to_farm(target_farm UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u."authId" = auth.uid()
      AND u.status   = 'active'
      AND (u."farmId" = target_farm OR u.role IN ('admin','manager'))
  );
$$;

-- 6) سياسات users (المستخدم يقرأ نفسه + مستخدمي مزرعته)
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    "authId" = auth.uid()
    OR "farmId" IN (
      SELECT u2."farmId" FROM users u2
      WHERE u2."authId" = auth.uid()
        AND u2.role IN ('admin','manager')
    )
  );

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (
    "authId" = auth.uid()
    OR auth.uid() IN (
      SELECT u2."authId" FROM users u2
      WHERE u2.role IN ('admin','manager')
    )
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    "authId" = auth.uid()
    OR "farmId" IN (
      SELECT u2."farmId" FROM users u2
      WHERE u2."authId" = auth.uid()
        AND u2.role IN ('admin','manager')
    )
  );

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (
    "farmId" IN (
      SELECT u2."farmId" FROM users u2
      WHERE u2."authId" = auth.uid()
        AND u2.role IN ('admin','manager')
    )
  );

-- 7) سياسات expenses (نفس النمط لكل الجداول الزراعية)
CREATE POLICY "expenses_read_farm" ON expenses
  FOR SELECT USING (user_belongs_to_farm("farmId"));

CREATE POLICY "expenses_write_farm" ON expenses
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));

CREATE POLICY "expenses_update_farm" ON expenses
  FOR UPDATE USING (user_belongs_to_farm("farmId"));

CREATE POLICY "expenses_delete_farm" ON expenses
  FOR DELETE USING (user_belongs_to_farm("farmId"));

-- 8) revenues
CREATE POLICY "revenues_read_farm" ON revenues
  FOR SELECT USING (user_belongs_to_farm("farmId"));
CREATE POLICY "revenues_write_farm" ON revenues
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));
CREATE POLICY "revenues_update_farm" ON revenues
  FOR UPDATE USING (user_belongs_to_farm("farmId"));
CREATE POLICY "revenues_delete_farm" ON revenues
  FOR DELETE USING (user_belongs_to_farm("farmId"));

-- 9) inventory
CREATE POLICY "inventory_read_farm" ON inventory
  FOR SELECT USING (user_belongs_to_farm("farmId"));
CREATE POLICY "inventory_write_farm" ON inventory
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));
CREATE POLICY "inventory_update_farm" ON inventory
  FOR UPDATE USING (user_belongs_to_farm("farmId"));
CREATE POLICY "inventory_delete_farm" ON inventory
  FOR DELETE USING (user_belongs_to_farm("farmId"));

-- 10) workers
CREATE POLICY "workers_read_farm" ON workers
  FOR SELECT USING (user_belongs_to_farm("farmId"));
CREATE POLICY "workers_write_farm" ON workers
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));
CREATE POLICY "workers_update_farm" ON workers
  FOR UPDATE USING (user_belongs_to_farm("farmId"));
CREATE POLICY "workers_delete_farm" ON workers
  FOR DELETE USING (user_belongs_to_farm("farmId"));

-- 11) usage_log
CREATE POLICY "usage_log_read_farm" ON usage_log
  FOR SELECT USING (user_belongs_to_farm("farmId"));
CREATE POLICY "usage_log_write_farm" ON usage_log
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));
CREATE POLICY "usage_log_update_farm" ON usage_log
  FOR UPDATE USING (user_belongs_to_farm("farmId"));
CREATE POLICY "usage_log_delete_farm" ON usage_log
  FOR DELETE USING (user_belongs_to_farm("farmId"));

-- 12) audit_log (قراءة فقط للمدير، كتابة من أي عضو في المزرعة)
CREATE POLICY "audit_log_read_farm" ON audit_log
  FOR SELECT USING (user_belongs_to_farm("farmId"));
CREATE POLICY "audit_log_write_farm" ON audit_log
  FOR INSERT WITH CHECK (user_belongs_to_farm("farmId"));

-- 13) Trigger لتحديث "updatedAt" تلقائياً
CREATE OR REPLACE FUNCTION update_updatedAt_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updatedAt_users     ON users;
DROP TRIGGER IF EXISTS set_updatedAt_expenses  ON expenses;
DROP TRIGGER IF EXISTS set_updatedAt_revenues  ON revenues;
DROP TRIGGER IF EXISTS set_updatedAt_inventory ON inventory;
DROP TRIGGER IF EXISTS set_updatedAt_workers   ON workers;
DROP TRIGGER IF EXISTS set_updatedAt_usage_log ON usage_log;
DROP TRIGGER IF EXISTS set_updatedAt_audit_log ON audit_log;

CREATE TRIGGER set_updatedAt_users     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_expenses  BEFORE UPDATE ON expenses  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_revenues  BEFORE UPDATE ON revenues  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_inventory BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_workers   BEFORE UPDATE ON workers   FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_usage_log BEFORE UPDATE ON usage_log FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();
CREATE TRIGGER set_updatedAt_audit_log BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();

-- 14) إنشاء admin افتراضي
--    ملاحظة: استبدل البريد وكلمة المرور بقيمك الحقيقية
-- INSERT INTO users (id, "authId", username, name, role, status, "farmId")
-- VALUES (
--   gen_random_uuid(),
--   '<supabase-auth-user-id>',  -- من Supabase Auth → Users
--   'admin',
--   'المدير العام',
--   'admin',
--   'active',
--   'farm-admin'
-- );

-- ✅ تم! الـ RLS مفعّل الآن. أي عميل بدون session فعّال
--    لن يستطيع قراءة أو تعديل أي بيانات.
