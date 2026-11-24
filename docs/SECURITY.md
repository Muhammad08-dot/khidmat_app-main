# Security & Row Level Security (RLS) Specification — Khidmat v2.0.0

**Task Reference:** PRD v2 Phase 3 (P3-4)  
**Document Status:** Complete Audit Matrix & Policy Verification  
**Enforcement:** PostgreSQL RLS + Security Definer Functions + Triggers

---

## 1. Security Philosophy & Principles

1. **Least Privilege Client Access:** The mobile client connects using the public Supabase `anon` key. No elevated service role keys are bundled or exposed.
2. **Postgres-Enforced Boundaries:** All tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Data access policies are evaluated inside the database kernel.
3. **No Direct PII Exposure:** Personal identification numbers (CNIC) and phone numbers are isolated from public browse tables. Phone numbers reside in `profile_contacts` (accessible only by self, admin, or booking counterparties). CNICs and ID documents reside in private storage and `provider_kyc`.
4. **Immutable Audit Trails:** Sensitive system mutations (moderation, account deletion, KYC review) append records to `admin_actions`, which is strictly append-only (triggers forbid UPDATE and DELETE).
5. **Anti-Self-Escalation:** Users cannot modify their own `role` column to `'admin'` or change role permissions (`0014_rls_hardening.sql`).

---

## 2. Table × Role × Operation Access Matrix

| Table | Anon | Customer | Provider | Platform Admin | Enforcing Policy / Trigger |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`profiles`** | SELECT (public fields) | SELECT, UPDATE (own row) | SELECT, UPDATE (own row) | ALL | `Profiles viewable by everyone`, `Users can update own profile`, `trg_prevent_role_escalation` |
| **`profile_contacts`** | ❌ None | SELECT (self + counterparty) | SELECT (self + counterparty) | ALL | `Contacts visible to owner, admin, or booking counterparties` (0008) |
| **`providers`** | SELECT (verified only) | SELECT (all verified) | SELECT, UPDATE (own row) | ALL | `Providers viewable by everyone`, `Admins can moderate providers` (0007) |
| **`bookings`** | ❌ None | SELECT, INSERT, UPDATE (own) | SELECT, UPDATE (assigned) | ALL | `Parties can view bookings`, `trg_booking_status_transition`, `trg_prevent_price_tampering` |
| **`messages`** | ❌ None | SELECT, INSERT (involved) | SELECT, INSERT (involved) | SELECT (involved) | `Involved parties can view messages`, `Involved parties can insert messages` |
| **`reviews`** | SELECT (unhidden) | SELECT, INSERT (own booking) | SELECT (unhidden) | ALL (hide, delete) | `Reviews viewable by everyone` (is_hidden = false OR is_admin), `Admins can moderate reviews` |
| **`payments`** | ❌ None | SELECT, INSERT (involved) | SELECT (involved) | ALL | `View involved payments`, `Insert involved payments` |
| **`notifications`** | ❌ None | SELECT, UPDATE (own row) | SELECT, UPDATE (own row) | ALL | `Users can view own notifications`, `Users can update own notifications` |
| **`push_tokens`** | ❌ None | ALL (own user_id) | ALL (own user_id) | ALL | `Users can manage own push tokens` |
| **`saved_addresses`** | ❌ None | ALL (own user_id) | ALL (own user_id) | ALL | `Users can manage own addresses` |
| **`user_reports`** | ❌ None | INSERT (reporter_id = auth.uid()) | INSERT (reporter_id = auth.uid()) | ALL (view, resolve) | `Users can submit reports`, `Admins can view and manage all reports` |
| **`admin_actions`** | ❌ None | ❌ None | ❌ None | INSERT, SELECT (Append-Only) | `Admins can insert audit logs`, `Admins can view audit logs`, `trg_admin_actions_immutable` |
| **`storage: avatars`** | SELECT | ALL (own folder) | ALL (own folder) | ALL | `Avatars publicly readable`, `Users can upload own avatar` |
| **`storage: job_media`** | ❌ None | SELECT, INSERT (involved) | SELECT, INSERT (involved) | ALL | `Job media involved party read/upload` |
| **`storage: kyc-documents`**| ❌ None | ❌ None | ALL (own folder) | SELECT, DELETE | `Owner can upload KYC documents`, `Owner and admin can read KYC documents` (0013) |

---

## 3. High-Risk Attack Surface Analysis & Hardened Countermeasures

### 3.1 Role Escalation Attack
- **Attack Vector:** An authenticated user submits `PATCH /rest/v1/profiles?id=eq.<user_id>` with payload `{"role": "admin"}`.
- **Countermeasure:** `trg_prevent_role_escalation` (Migration 0014) rejects any UPDATE modifying `role` unless `public.is_admin()` returns true.

### 3.2 Price Tampering Attack
- **Attack Vector:** A customer accepts a booking at PKR 1,500, and later updates `total_price` to PKR 100 before payment.
- **Countermeasure:** `trg_prevent_price_tampering` (Migration 0014) inspects `OLD.status`. If `OLD.status != 'pending'`, mutating `total_price` throws SQLSTATE `22023`.

### 3.3 State Machine Bypass & Acceptance Race
- **Attack Vector:** Two providers attempt to accept the same booking simultaneously, or a client marks an unaccepted booking as `completed`.
- **Countermeasure:** `public.transition_booking_status(...)` (Migration 0009) acquires a row-level lock (`SELECT ... FOR UPDATE`), strictly asserts expected current status, and enforces valid lifecycle transitions.

### 3.4 PII & Phone Number Scraping
- **Attack Vector:** An unauthenticated or unauthorized party scrapes phone numbers of clients and service providers.
- **Countermeasure:** Phone numbers are separated into `profile_contacts` (Migration 0008). A user can only read another user's contact information if they have an active or accepted booking together.

### 3.5 Identity Document (CNIC) Exposure
- **Attack Vector:** An attacker guesses file URLs in storage to access government-issued ID cards.
- **Countermeasure:** `kyc-documents` bucket is private (`public = false`). Direct access is blocked. Signed URLs with short expiration are required and restricted to document owner and platform administrators (Migration 0013).
