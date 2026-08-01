-- ┌─────────────────────────────────────────────────────────────────┐
-- │ ตาราง "ลุคที่บันทึก" ผูกกับผู้ใช้ (สำหรับล็อกอิน)                   │
-- │ เก็บถาวร + ข้ามเครื่อง — guest ยังใช้ localStorage เหมือนเดิม        │
-- │ รันใน Supabase → SQL Editor (รันซ้ำได้ ไม่พัง)                     │
-- └─────────────────────────────────────────────────────────────────┘
create table if not exists public.saved_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  items jsonb not null,                        -- { hat: id, top: id, pants: id }
  hidden jsonb not null default '{}'::jsonb,    -- { hat: bool, top: bool, pants: bool }
  created_at timestamptz not null default now()
);

alter table public.saved_looks enable row level security;

-- เห็น/เพิ่ม/ลบ ได้เฉพาะลุคของตัวเอง (auth.uid() = เจ้าของ)
drop policy if exists "own_select" on public.saved_looks;
create policy "own_select" on public.saved_looks for select using (auth.uid() = user_id);

drop policy if exists "own_insert" on public.saved_looks;
create policy "own_insert" on public.saved_looks for insert with check (auth.uid() = user_id);

drop policy if exists "own_delete" on public.saved_looks;
create policy "own_delete" on public.saved_looks for delete using (auth.uid() = user_id);

create index if not exists saved_looks_user_created_idx
  on public.saved_looks(user_id, created_at desc);
