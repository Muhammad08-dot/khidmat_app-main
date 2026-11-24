# Khidmat (خدمت) — PRD v2: Stabilization, Auth Fixes, UI Modernization & Test Hardening

| Field        | Value                                                                                                                                          |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repo**     | `Muhammad08-dot/khidmat_app-main`                                                                                                              |
| **Stack**    | Expo (managed) · React Native · TypeScript · Expo Router · NativeWind · TanStack Query · Supabase (Postgres + RLS + Realtime + Edge Functions) |
| **Context**  | University Software Engineering project (not a hackathon). Needs to be correct, well-tested, well-documented and presentable.                  |
| **Audience** | Antigravity IDE agent (executor) + project owner (reviewer)                                                                                    |
| **Inputs**   | Audit report v1.0.0 (2026-11-24), app screenshots (signup, login), repo file tree                                                              |

---

## 0. Agent Operating Rules (READ FIRST)

1. Work one phase at a time, in order. Do not start Phase N+1 until Phase N's Exit Gate is green.
2. Create branch `feat/prd-v2`. One commit per task, message format: `feat|fix|refactor|test|docs(<scope>): <task-id> <summary>`.
3. Before starting Phase 0 and after every phase run: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx expo-doctor`. All must pass.
4. Never edit an applied migration (`supabase/migrations/0001…0012`). Add new numbered migrations only.
5. Never remove a user-visible feature unless this PRD says so. Never commit secrets. Never use or embed a Supabase service_role key in the app or eas.json.
6. Do not claim a test passed without showing the command output. Do not write "100% coverage" anywhere unless `jest --coverage` actually reports it.
7. If a task is ambiguous or a decision (see §3) conflicts with the code, stop and write the question into `docs/OPEN_QUESTIONS.md` instead of guessing.
8. After each phase append a Phase Report to `docs/reports/PHASE_REPORTS.md` using the template in §9.

---

## 1. Goals

| #      | Goal                                        | Success measure                                                                                                              |
| :----- | :------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| **G1** | Fix auth redirect and layout-direction bugs | Google sign-in returns into the app on a physical Android APK; all auth screens render consistently in EN (LTR) and UR (RTL) |
| **G2** | Modernize UI                                | New design system applied to every screen; passes the UI acceptance checklist (§5.3)                                         |
| **G3** | Remove production risks found in the audit  | No demo login, no silent mock fallback, secrets/RLS/KYC reviewed (Phase 3)                                                   |
| **G4** | Prove quality with real tests               | Unit + integration against a real local Supabase + E2E flows + manual device matrix, with a traceability matrix              |
| **G5** | Clean, presentable repo and docs            | Structure refactor done, docs consolidated, release artifacts reproducible                                                   |

---

## 2. Audit Findings (input to this PRD)

### 2.1 From screenshots

| ID         | Finding                                                                                                                                                                                                                                                    | Severity |
| :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **BUG-01** | After "Continue with Google", the browser lands on localhost instead of returning to the app (OAuth redirect resolves to Supabase Site URL, not the app deep link).                                                                                        | 🔴 High  |
| **BUG-02** | Layout direction is inconsistent on auth screens: headings/labels/links are right-aligned, input text is left-aligned, icons are on the right, dropdown chevron is on the left, phone prefix renders as 92+ instead of +92. This is a mixed LTR/RTL state. | 🔴 High  |
| **UI-01**  | Status bar text (time/battery) is nearly invisible: light status-bar style on a cream background.                                                                                                                                                          | 🟠 Med   |
| **UI-02**  | Card nested inside a screen-wide card (double border, wasted width), heavy rounded corners, uppercase letter-spaced labels everywhere → looks dated and cramped.                                                                                           | 🟠 Med   |
| **UI-03**  | Login fields show a yellow Android autofill highlight that clashes with the theme.                                                                                                                                                                         | 🟡 Low   |
| **UI-04**  | Signup is one long form with two numbered sections; map block shows an amber "Map API offline" warning in the normal state, which looks like an error to users.                                                                                            | 🟠 Med   |
| **UI-05**  | Account-type labels Provide (Worker) / Hire (Client) are unclear.                                                                                                                                                                                          | 🟡 Low   |
| **UI-06**  | Google button uses a red "G" circle instead of the proper Google logo/brand style.                                                                                                                                                                         | 🟡 Low   |
| **UI-07**  | No show/hide password, no inline validation, no password-strength hint on signup.                                                                                                                                                                          | 🟠 Med   |

### 2.2 From the audit report

| ID         | Finding                                                                                                                                                                                       | Severity |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **REP-01** | "1-Tap Quick Demo Login" exists. Must be dev-only.                                                                                                                                            | 🔴 High  |
| **REP-02** | "Automatic in-memory mock fallback if network configuration is absent" can make users believe data was saved when it was not. Must be dev/test only; production must show a real error state. | 🔴 High  |
| **REP-03** | Test claim "100% core flows" is unverified; most tests use mockClient.ts, so RLS and the booking state machine are not tested against a real database.                                        | 🟠 Med   |
| **REP-04** | Report is self-certified by an agent. Release claims must be backed by command output.                                                                                                        | 🟠 Med   |
| **REP-05** | Report lists 8 tables; migrations add more (saved addresses, etc.). Schema docs out of date.                                                                                                  | 🟡 Low   |
| **REP-06** | APK is ~115 MB. Needs size optimization and an AAB for Play Store.                                                                                                                            | 🟡 Low   |
| **REP-07** | Credentials "baked into eas.json". Anon key is acceptable; anything else is not. Verify and move to EAS secrets.                                                                              | 🟠 Med   |
| **REP-08** | KYC (CNIC) handling not described: storage privacy, access, deletion.                                                                                                                         | 🔴 High  |
| **REP-09** | Payments scope unclear (payments.ts exists, report only says "tracking").                                                                                                                     | 🟡 Low   |
| **REP-10** | Phone OTP and Google OAuth listed as features but not in the verified checklist.                                                                                                              | 🟠 Med   |

### 2.3 From the repo structure review

`complete_setup.sql` duplicates migrations; no `supabase/config.toml`; `legacy.ts` + `0002_legacy_bridge.sql`; `mockClient.ts` in production folder; 28 PNGs in `docs/qa-artifacts`; five overlapping QA reports; `archive/`, `scratch/`, `docs/archive/`; legal pages loose in `app/`; `CustomerHome`/`ProviderHome` living in `components/features`; `agent-server` has no tests.

---

## 3. Product Decisions (defaults — change here if needed)

| ID       | Decision               | Default                                                                                                                                                                                                                       |
| :------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-01** | Backend                | Supabase stays. No Firebase migration.                                                                                                                                                                                        |
| **D-02** | Language/direction     | English = LTR, everything left-aligned. Urdu = full RTL mirror. Direction follows the selected language, never mixed.                                                                                                         |
| **D-03** | Demo login             | Visible only when `__DEV__` or `EXPO_PUBLIC_ENABLE_DEMO=true`. Off in production builds.                                                                                                                                      |
| **D-04** | Mock client            | Only when `EXPO_PUBLIC_USE_MOCK=true` (dev/test). In production, missing config = blocking error screen with retry.                                                                                                           |
| **D-05** | Maps                   | Replace the "offline locator" with a real map (`react-native-maps`; Google Maps key via EAS secret) or MapLibre + OSM tiles if no key. Offline fallback stays but is subtle (no warning banner unless a real failure occurs). |
| **D-06** | Client signup location | Optional at signup ("Use my current location" button via expo-location); mandatory only at first booking. Providers must set service city.                                                                                    |
| **D-07** | Account type labels    | "I need a service" (Client) / "I offer services" (Provider). Urdu strings added.                                                                                                                                              |
| **D-08** | Phone OTP              | Out of scope for v2 unless an SMS provider is already configured. Hide the option if not configured.                                                                                                                          |
| **D-09** | Payments               | v2 = cash-on-completion + earnings tracking only. No online payment gateway in scope.                                                                                                                                         |
| **D-10** | Theme                  | Light theme required. Dark theme = stretch goal (Phase 2, task UI-D).                                                                                                                                                         |

---

## 4. Phase Plan Overview

| Phase | Name                              | Output                                           | Exit Gate                                         |
| :---- | :-------------------------------- | :----------------------------------------------- | :------------------------------------------------ |
| **0** | Baseline & safety net             | Branch, baseline results, local Supabase running | Baseline report committed                         |
| **1** | Auth & direction bug fixes        | BUG-01, BUG-02, UI-01, UI-03, REP-01 fixed       | Phase 1 tests + device manual checks pass         |
| **2** | Design system & UI modernization  | New tokens, components, redesigned screens       | UI checklist §5.3 + visual QA pass                |
| **3** | Reliability & security hardening  | REP-02, 07, 08 + RLS audit + maps                | Security checklist §6 pass                        |
| **4** | Repo cleanup & structure refactor | Clean tree, consolidated docs                    | Build + tests still green                         |
| **5** | Test hardening                    | Integration vs real Supabase, E2E, device matrix | Test plan §7 executed, traceability matrix filled |
| **6** | Docs & release                    | Docs, APK + AAB, final report                    | Release checklist §8 pass                         |

---

## 9. Phase Report Template

```markdown
### Phase N — <name> — <date>

Tasks completed: <IDs>
Tasks skipped/blocked: <IDs + reason>
Commands run + results: tsc / lint / jest (X passed, Y failed, coverage %) / expo-doctor
New/changed tests: <list>
Screenshots/evidence: <paths>
Decisions made / deviations from PRD: <list>
Open questions (also in docs/OPEN_QUESTIONS.md): <list>
Owner-only actions needed (dashboard, keys, devices): <list>
Exit gate status: PASS | FAIL (reason)
```
