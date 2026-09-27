-- 006 · search_path fijo en helpers (recomendación del linter de Supabase)
alter function private.distance_km(double precision, double precision, double precision, double precision) set search_path = '';
alter function private.is_open(jsonb, text, timestamptz) set search_path = '';
