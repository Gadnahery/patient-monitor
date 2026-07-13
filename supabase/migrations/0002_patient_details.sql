-- Adds richer patient profile fields used by the redesigned Patients page:
-- phone number, sex, and a free-text diagnosis/condition note.

alter table public.patients
  add column phone text,
  add column sex text check (sex in ('male', 'female', 'other')),
  add column diagnosis text;
