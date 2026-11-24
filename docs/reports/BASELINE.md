# Baseline Verification Report — Khidmat v2.0.0

**Phase 0 Baseline Output & Quality Metrics**
**Date:** 2026-11-24  
**Branch:** `feat/prd-v2`  
**Base Commit / Tag:** `pre-prd-v2`

---

## 1. Executive Summary

This report establishes the baseline diagnostic and test coverage benchmarks for Khidmat v2.0.0 prior to executing Phase 1 (Auth & Layout Direction Fixes). All numbers and tables below represent real command outputs executed on the codebase.

---

## 2. TypeScript Compiler Check (`npx tsc --noEmit`)

- **Command:** `npx tsc --noEmit`
- **TypeScript Version:** `5.8.3`
- **Result:** **PASS (Exit code 0)**
- **Errors:** `0`
- **Warnings:** `0`

```
> tsc --noEmit
(no output, exit code 0)
```

---

## 3. Linter Diagnostic (`npm run lint`)

- **Command:** `npm run lint` (`eslint .`)
- **Result:** **PASS (Exit code 0)**
- **Errors:** `0`
- **Warnings:** `2274` (Prettier code-style and formatting warnings, 0 fatal syntax or linting errors)

---

## 4. Test Suite Execution & Real Coverage Table (`npx jest --coverage`)

- **Command:** `npx jest --coverage`
- **Total Test Suites:** 10 passed, 10 total
- **Total Tests:** 38 passed, 38 total
- **Snapshots:** 0
- **Execution Time:** ~6.6 seconds

### Real Coverage Breakdown

```
-------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------
All files          |   49.52 |     36.6 |   51.87 |   53.03 |
 services          |   28.57 |    16.66 |      20 |   31.81 |
  push.ts          |   28.57 |    16.66 |      20 |   31.81 | 16,33-56,76-89
 services/api      |    37.2 |    16.66 |   33.33 |   36.84 |
  errorReporter.ts |    37.2 |    16.66 |   33.33 |   36.84 | 55,65-114
 services/supabase |   50.15 |    37.42 |   53.23 |    54.1 |
  client.ts        |   26.31 |    20.83 |       0 |   31.25 | 18-29,37-49,78-81
  legacy.ts        |   20.85 |    35.89 |      32 |    23.3 | 86-92,129-212,253-284,305-383,398-443
  mockClient.ts    |    64.6 |    37.93 |   62.66 |   66.13 | 248,250,261,270-271,313-327,345-347,391-392,398-399,405,412-440,448-470,479-481,502,523,531-542
  queries.ts       |   61.45 |    41.84 |   65.51 |   70.25 | 6-8,12-21,62-75,79-94,134,141,153-159,182-189,193-200,204-209,322-325,370-377,388-405,415-417
 utils             |      75 |    69.23 |   71.42 |   77.27 |
  location.ts      |   58.82 |        0 |   33.33 |   66.66 | 46-47,55-57
  ratings.ts       |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------
```

### Coverage Assessment & Findings

1. Overall statement coverage currently stands at **49.52%** across tested modules.
2. `ratings.ts` achieves **100% statement, branch, function, and line coverage**.
3. `queries.ts` achieves **70.25% line coverage**, but depends primarily on `mockClient.ts` in-memory mocks rather than live Postgres RLS integration tests.
4. Component UI layer (React Native screens and components) currently has 0 automated unit test suites — to be addressed in Phase 2 & Phase 5 per PRD.

---

## 5. Expo Doctor Diagnostics (`npx expo-doctor`)

- **Command:** `npx expo-doctor`
- **Result:** **21/21 checks passed (100% clean)**

```
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

---

## 6. Baseline Status

- **Exit Gate P0-2:** **PASSED**
