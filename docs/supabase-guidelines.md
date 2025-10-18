# Supabase Integration Playbook for Generated Apps

Use this checklist whenever the user's request implies persistent data, authentication, real-time collaboration, file storage, or any other capability that benefits from Supabase. The backend already provisions a Supabase project for each new code-generation request; your job is to wire the generated app to that project, run any required migrations, and ensure the UI remains usable even before credentials are present. Always defer to the latest official documentation for specifics.

## 1. Decide Whether Supabase Is Needed
- Reach for Supabase when a prompt mentions accounts, saved data, dashboards, shared workspaces, uploads, or any feature that outgrows localStorage.
- Skip Supabase for static demos or prototypes that do not need a backend.
- Whichever path you take, note the reasoning in the generated README.

## 2. Always Reference Official Docs
- BEFORE writing Supabase-specific code, call `read_file docs/supabase-guidelines.md` (this file) and **use web search or Supabase docs** to confirm the latest APIs, CLI flags, and best practices.
- Encourage the user (via README) to consult https://supabase.com/docs for authoritative instructions.

## 3. What to Include When Supabase Is Used
Generated projects should:
1. Provide a `Supabase Setup` section in the README that:
   - Explains that the user must create a Supabase project themselves (via dashboard, CLI, or management API). Point them to the official docs rather than embedding exact commands that may drift.
   - Lists required environment variables (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` when server-side work is generated).
   - Mentions schema migration files (if created) and how to apply them using the Supabase CLI or SQL editor—again referencing official docs for current commands.
   - Highlights any auth/storage configuration steps and links to relevant doc sections.
2. Contain a dedicated Supabase client helper (e.g., `lib/supabaseClient.ts`) that reads values from environment variables. Never hardcode URL/key pairs.
3. Keep Supabase interaction modular so it can be swapped or expanded easily.
4. Use the generated `supabase/credentials.json` file for public client settings (URL + anon key) and the `get_supabase_credentials` tool when you need the service-role key for migrations or seeding.
5. Degrade gracefully when credentials are missing:
   - Show a small, non-blocking banner instead of a full-screen overlay.
   - Provide a local fallback (in-memory or `localStorage`) so previews remain interactive.
   - Clearly label the fallback mode and remind users to configure Supabase for persistence.
   - Run migrations or seed data programmatically via the `execute_supabase_sql` tool so the provisioned project is ready immediately.

## 4. Auth, Storage, and RLS
- Use Supabase Auth helpers (`supabase.auth.signUp`, etc.) when authentication is required, but always direct users to Supabase docs for provider setup.
- Mention Row-Level Security policies or storage buckets only when relevant, and link to the official guides instead of embedding policies verbatim.

## 5. Testing & Local Development
- Suggest the user run `supabase start` (Docker) or connect to a hosted project for end-to-end testing.
- If convenient, generate mock fallback data so the UI can showcase non-protected flows without a running Supabase instance.

## 6. Final Checklist
- [ ] README explains why Supabase is (or isn’t) used and links to official docs.
- [ ] Environment variables are documented; no secrets live in source control.
- [ ] Supabase code lives in its own module or hook.
- [ ] Any schema/auth/storage notes reference the latest Supabase docs instead of hardcoded commands.
- [ ] The app warns the user when Supabase env vars are missing.

Refer back to this file and the official Supabase documentation with web search whenever you scaffold Supabase-related features. Staying current is more important than memorizing static instructions.
