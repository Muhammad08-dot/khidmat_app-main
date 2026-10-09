---
name: Supabase Architecture Rules
description: Guidelines for fetching data, maintaining types, and writing Row Level Security (RLS) policies with Supabase.
---

# Supabase Architecture Rules

When working with Supabase in this project, ALWAYS adhere to the following rules:

1. **Client Isolation:**
   - Always import the Supabase client from `@/src/services/supabase/client`.
   - Never instantiate a new `createClient` inside individual components.

2. **React Query Integration:**
   - Data fetching and mutations must go through `@tanstack/react-query` hooks.
   - Centralize these hooks inside `src/hooks/useSupabase.ts` to maintain a single source of truth.
   - Do not perform bare `supabase.from().select()` calls inside React UI components unless absolutely necessary for a one-off task.

3. **Type Safety:**
   - Keep `src/types/database.types.ts` strictly synced with the remote PostgreSQL database.
   - Map Supabase row types to the domain models in `src/types/models.ts`.

4. **Security (RLS):**
   - Ensure all tables have Row Level Security enabled.
   - Never write code that bypasses RLS on the client.
   - For bypass operations (like admin tasks), delegate to the secure `agent-server` proxy environment.
