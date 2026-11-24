# Khidmat (خدمت) — Documentation Index

Welcome to the Khidmat project documentation repository. This directory houses architectural specifications, execution reports, security models, and operational handoff artifacts.

---

## 1. Core Architecture & Product Specifications

| Document | Description |
| :--- | :--- |
| **[PRD_Khidmat_v2.md](file:///D:/dev-stuff/khidmat-hardening/docs/PRD_Khidmat_v2.md)** | Master Product Requirements Document: stabilization, UI overhaul, RLS audit, and quality gates. |
| **[ARCHITECTURE.md](file:///D:/dev-stuff/khidmat-hardening/docs/ARCHITECTURE.md)** | Technical stack, data flow, Supabase schema topology, and self-healing agent pipeline. |
| **[SECURITY.md](file:///D:/dev-stuff/khidmat-hardening/docs/SECURITY.md)** | Detailed Table × Role × Operation matrix, Row Level Security policies, and privilege escalation guards. |
| **[SETUP.md](file:///D:/dev-stuff/khidmat-hardening/docs/SETUP.md)** | Local environment configuration, environment variables, and emulator/device run instructions. |
| **[LAUNCH_CHECKLIST.md](file:///D:/dev-stuff/khidmat-hardening/docs/LAUNCH_CHECKLIST.md)** | Play Store readiness checklist, signing, release profiles, and production gates. |
| **[MANUAL_TESTS.md](file:///D:/dev-stuff/khidmat-hardening/docs/MANUAL_TESTS.md)** | Physical device testing matrix (Android/iOS, LTR/RTL Urdu layout checks). |
| **[OPEN_QUESTIONS.md](file:///D:/dev-stuff/khidmat-hardening/docs/OPEN_QUESTIONS.md)** | Tracked architectural ambiguities and owner decisions. |

---

## 2. Phase & Execution Reports (`docs/reports/`)

Historical and active phase verification reports are centralized in `docs/reports/`:

| Report | Description |
| :--- | :--- |
| **[MASTER_PROJECT_STATUS_REPORT.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/MASTER_PROJECT_STATUS_REPORT.md)** | **Master Joint Status Report** on behalf of Agent 1 & Agent 2: Phase progress, quality gates, and launch audit. |
| **[PHASE_REPORTS_HARDENING.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/PHASE_REPORTS_HARDENING.md)** | Agent 2 execution report for Phase 3 (Hardening), Part B (Integration), and Phase 4a (Cleanup). |
| **[PHASE_REPORTS.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/PHASE_REPORTS.md)** | Phase 0 Baseline and Phase 1-2 UI Modernization execution logs. |
| **[BASELINE.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/BASELINE.md)** | Baseline unit test coverage and static analysis report before Phase 1. |
| **[TEST_REPORT.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/TEST_REPORT.md)** | Functional testing matrix across Customer, Provider, and Admin roles. |
| **[QA_AGENT_REPORT.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/QA_AGENT_REPORT.md)** | Autonomous QA Agent browser-based regression run report. |
| **[PRODUCTION_REPORT.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/PRODUCTION_REPORT.md)** | Pre-launch audit report verifying RLS security, edge functions, and backend migrations. |
| **[bug_report.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/bug_report.md)** | Initial audit report detailing Bug-01, Bug-02, and security vulnerabilities. |
| **[app_analysis.md](file:///D:/dev-stuff/khidmat-hardening/docs/reports/app_analysis.md)** | Initial structural and dependency analysis of the mobile codebase. |

---

## 3. Agent Handoff Directory (`docs/handoff/`)

- **`agent2-to-agent1.md`**: Direct requests from Hardening Agent (Agent 2) to UI Agent (Agent 1), covering UI restyling for `ErrorBoundary.tsx` and root `package.json` scripts.
- **`agent1-to-agent2.md`**: Upstream handoff notes from UI Agent to Hardening Agent.

---

## 4. Test Artifacts (`docs/qa-artifacts/`)

- **`qa-results.json`**: Machine-readable test execution output from autonomous end-to-end verification runs.
