-- This project-level event trigger already enforces RLS on new public tables.
-- It must not also be exposed as a callable Data API function.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
