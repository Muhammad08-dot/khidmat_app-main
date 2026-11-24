# Baseline Verification Report — Khidmat v2.0.0
**Phase 0 Baseline Output & Diagnostic Truth**
**Date:** 2026-11-24  
**Branch:** `feat/prd-v2`  
**Base Commit / Tag:** `pre-prd-v2`

---

## 1. Executive Summary & Audit Correction

> [!WARNING]
> **Correction to Audit Report v1.0.0:** The earlier audit report claimed "21/21 checks passed" on `expo-doctor` and "100% core flows tested". Both claims were inaccurate:
> 1. `expo-doctor` was initially **FAILING** with 1 major version mismatch and 8 patch version mismatches.
> 2. Test coverage across tested services is **49.52% statements / 53.40% lines**, with **0% unit test coverage on React Native UI components/screens**.

---

## 2. Original `expo-doctor` Failure (Prior to Dependency Alignment)

When `npx expo-doctor` was first executed at tag `pre-prd-v2`, it exited with **code 1 (1 check failed)**:

```
Running 21 checks on your project...
20/21 checks passed. 1 checks failed. Possible issues detected:

✖ Check that packages match versions required by installed Expo SDK

❗ Major version mismatches
package              expected  found    
typescript           ~6.0.3    5.8.3    

🔧 Patch version mismatches
package              expected  found    
@expo/metro-runtime  ~57.0.19  57.0.18  
expo-constants       ~57.0.25  57.0.24  
expo-image-picker    ~57.0.22  57.0.21  
expo-location        ~57.0.24  57.0.23  
expo-notifications   ~57.0.26  57.0.25  
expo-router          ~57.0.32  57.0.31  
expo-splash-screen   ~57.0.12  57.0.11  
expo-task-manager    ~57.0.24  57.0.23  
```

### Remediation Applied
To preserve TypeScript `~5.8.0` (as strictly mandated by PRD v2 to avoid TypeScript 6 bundler regressions) while satisfying Expo SDK 57 requirements:
1. Added `"expo": { "install": { "exclude": ["typescript"] } }` to `package.json`.
2. Updated the 8 mismatched patch dependencies via `npx expo install --fix` and aligned `expo` to `~57.0.34`.

#### Git Diff (`pre-prd-v2` vs current `package.json`)
```diff
--- a/package.json
+++ b/package.json
@@ -21,19 +21,19 @@
-    "@expo/metro-runtime": "~57.0.16",
+    "@expo/metro-runtime": "~57.0.19",
-    "expo": "~57.0.33",
-    "expo-constants": "~57.0.20",
+    "expo": "~57.0.34",
+    "expo-constants": "~57.0.25",
-    "expo-image-picker": "~57.0.21",
+    "expo-image-picker": "~57.0.22",
-    "expo-location": "~57.0.23",
-    "expo-notifications": "~57.0.25",
-    "expo-router": "~57.0.31",
+    "expo-location": "~57.0.24",
+    "expo-notifications": "~57.0.26",
+    "expo-router": "~57.0.32",
-    "expo-splash-screen": "~57.0.11",
+    "expo-splash-screen": "~57.0.12",
-    "expo-task-manager": "~57.0.23",
+    "expo-task-manager": "~57.0.24",
+  "expo": {
+    "install": {
+      "exclude": [
+        "typescript"
+      ]
+    }
+  }
```

---

## 3. Four Re-run Verification Commands (Executed Together)

### 3.1 TypeScript Compiler (`npx tsc --noEmit`)
- **Command:** `npx tsc --noEmit`
- **Output:** Clean exit with code `0`, zero compiler errors or warnings.

### 3.2 Linter (`npm run lint`)
- **Command:** `npm run lint` (`eslint .`)
- **Output:** Clean exit with code `0`, `0 errors`, `73 warnings` (reduced from 2274 warnings following `style: P0 format codebase`).

### 3.3 Test Suite & Real Coverage (`npx jest --coverage`)
- **Command:** `npx jest --coverage`
- **Test Suites:** 10 passed, 10 total
- **Tests:** 38 passed, 38 total
- **Execution Time:** ~4.55s

#### Per-Folder & Per-File Coverage Matrix
```
-------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------
Folder / File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                                                               
-------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------
All files          |   49.52 |    36.60 |   51.87 |   53.40 |                                                                                                                 
 services/         |   28.57 |    16.66 |   20.00 |   31.81 |                                                                                                                 
  push.ts          |   28.57 |    16.66 |   20.00 |   31.81 | 16, 33-54, 74-87                                                                                                
 services/api/     |   37.20 |    16.66 |   33.33 |   37.83 |                                                                                                                 
  errorReporter.ts |   37.20 |    16.66 |   33.33 |   37.83 | 57, 65-112                                                                                                      
 services/supabase/|   50.15 |    37.42 |   53.23 |   54.39 |                                                                                                                 
  client.ts        |   26.31 |    20.83 |    0.00 |   27.77 | 18-33, 41-59, 88-91                                                                                             
  legacy.ts        |   20.85 |    35.89 |   32.00 |   23.88 | 86-92, 129-216, 257-288, 309-385, 403-451                                                                       
  mockClient.ts    |   64.60 |    37.93 |   62.66 |   66.50 | 460, 500-501, 539-541, 599-613, 702-747, 755-780, 849-860                                                     
  queries.ts       |   61.45 |    41.84 |   65.51 |   70.44 | 6-8, 12-23, 68-83, 87-102, 151, 170-176, 204-211, 402-409, 420-437                                            
 utils/            |   75.00 |    69.23 |   71.42 |   77.27 |                                                                                                                 
  location.ts      |   58.82 |     0.00 |   33.33 |   66.66 | 44-45, 53-55                                                                                                    
  ratings.ts       |  100.00 |   100.00 |  100.00 |  100.00 | None (100% covered)                                                                                             
 components/ (UI)  |    0.00 |     0.00 |    0.00 |    0.00 | No unit tests yet (Phase 2 & Phase 5 scope)                                                                     
 screens/ (UI)     |    0.00 |     0.00 |    0.00 |    0.00 | No unit tests yet (Phase 2 & Phase 5 scope)                                                                     
-------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------
```

### 3.4 Expo Doctor (`npx expo-doctor`)
- **Command:** `npx expo-doctor`
- **Output:** **21/21 checks passed (100% clean)**.

---

## 4. Security & Sensitive File Scan Outputs

```powershell
PS> git ls-files | findstr /i "apk jks keystore"
(no output - 0 binary files tracked)

PS> git ls-files | findstr /i "\.env$"
(no output - 0 .env files tracked)

PS> git grep -n "service_role"
docs/LAUNCH_CHECKLIST.md:12:  public; real protection is RLS). Never put the `service_role` key in the app.
docs/PRD_Khidmat_v2.md:19:5. Never remove a user-visible feature unless this PRD says so. Never commit secrets. Never use or embed a Supabase service_role key in the app or eas.json.
supabase/functions/push-dispatcher/index.ts:31:    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
(Zero hardcoded service_role keys committed)
```
