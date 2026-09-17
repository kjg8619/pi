# 작업 이력

Personal AI Runtime의 작업 내용과 검증 결과를 누적 기록한다. 설계 근거는 [DECISIONS](DECISIONS.md), 단계별 범위는 [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md)을 기준으로 한다. 이 문서는 릴리스 Changelog나 Runtime이 저장할 `.ai` 실행 로그가 아니다.

## 기록 규칙

- 개발·조사·문서 작업이 끝나거나 중단될 때마다 항목을 추가한다. 개별 도구 호출을 모두 기록하지는 않는다.
- 기록일과 시간대, 단계·상태, 목적, 변경 파일, 검증 명령·결과, 문제와 해결, 남은 제한, 다음 작업, 커밋 여부를 남긴다.
- 미실행 검증을 통과로 표시하지 않는다. 테스트 개수는 해당 작업 당시 결과이며 전체 저장소 테스트 수가 아니다.
- 기존 항목은 보존한다. 후속 변경이나 정정은 새 항목에서 이전 기록을 참조한다.
- 인증 정보, 비밀 값, 전체 대화·도구 출력은 복사하지 않는다.

## 현재 요약

| 단계 | 상태 | 확인된 결과 |
|---|---|---|
| Phase 0 | 완료 | Pi 구조 조사와 설계 문서 3종 |
| S0 | 완료 | 계약·설정·Extension 골격, 테스트 62개 통과 |
| S1 | 완료 | Host 독립 순차 Kernel, S0 포함 테스트 133개 통과 |
| S2 | 완료 | 파일 StateStore·lock·실행 전 Policy, S0/S1 포함 테스트 244개 통과 |
| S3 | 완료 | 독립 SDK 역할·Policy·참조·취소, faux 통합 47개 및 metadata 5개 추가 |
| S4 | 완료 | 실제 Git/check·STANDARD 통합·명령/lifecycle, 자동 367개 및 실제 Pi faux smoke 통과 |
| S5A | 완료 | QUICK Executor·공통 검증/정책/상태, 자동 446개 및 QUICK Pi faux smoke 통과 |
| S5B | 완료 | bound STANDARD/R2 파일 실행·독립 리뷰 강제, 자동 522개 및 R2 Pi faux smoke 통과 |
| S5C | 완료 | 단일 tracked 텍스트 파일 삭제의 1회 Human Approval, 자동 608개 및 실제 승인/거절/Esc/만료 smoke 통과 |
| S5D | 완료 | 읽기 전용 관찰·명시적 결정/check export·revision 설정 연결, 자동 655개 및 실제 명령 smoke 통과 |
| S6 | 완료 | cleanup/lease·race/crash/freshness 실패 경계 보강, targeted 740개 + 기존 Pi 59개 및 interactive 실패 smoke 통과 |
| RC-01 후속 수정 | 완료 / 실제 GPT 최종 PASS | R0 finding 보존·무변경 COMPLETE. 당시 targeted 829개 결과는 아래 이력에 보존 |
| RC-04 후속 수정 | 완료 / 실제 GPT 최종 PASS | R2 mandatory Reviewer·두 checks·COMPLETED. 실제 ref 오류 후 재제출의 개별 trace는 미수집; 당시 targeted 847개 |
| RC-04 timeout 후속 수정 | 완료 / 실제 설정·지연 미수집 | 공통 worker timeout 설정과 취소/lease 보호, 이후 GPT RC-04 정상 완료. 특정 예산의 충분성은 별도; 당시 targeted 876개 |
| RC-04 handoff 후속 수정 | 완료 / 실제 GPT 최종 PASS | unresolved 없음·독립 review·checks·COMPLETED, 기존 Kernel guard 유지; 당시 targeted 901개 |
| RC-05 R3 prompt 수정 | 완료 / 실제 GPT 최종 PASS | 승인 UI·Deny/Expire 무삭제·Approve once 단일 삭제 확인; 당시 targeted 909개 |
| GPT Real-Provider RC / V0.1 Closure | 완료 / 소스 RC 기준점 유지 | 실제 GPT RC-01~08 PASS. LOG-020 당시 HEAD `dc6d3df65`의 targeted 30개 파일·909개 및 root check PASS |
| Weavra Branding + Launcher UX | 완료 / 커밋·푸시 | `632ad3bcd`로 게시. 당시 31개 파일·931개 및 root check PASS; RC 태그 불변 |
| Weavra Status Projection | 완료 / 커밋·푸시 | `2205dec84`로 게시. 당시 공식 setStatus·stale/실패 격리, 33개 파일·975개 및 실제 TUI smoke PASS |
| Fork-local Weavra Launcher | 완료 / 기존 커밋 확인 | `14c3f6992`에 반영. global Pi 의존 제거, 같은 checkout의 built CLI 고정. LOG-025 자동 33개 파일·982개 PASS. 사용자 정상 실행 보고는 LOG-026 참조 |
| Weavra Worktree Launcher V1 | 완료 / 커밋·푸시 | `965240041`에 반영. create-only·frozen HEAD·외부 경로·충돌/dirty 거부·자동 정리 없음. LOG-028 당시 34개 파일·1,040개 PASS |
| Weavra Worktree Open/List | 완료 / 커밋·푸시 | `add45781d`에 반영. Git 등록 기반 open-only/list·dirty 허용·Pi argv 전달. LOG-030 당시 34개 파일·1,098개 PASS |
| V0.2A Read-only DAG Projection | 완료 / 커밋·푸시 | `b40c016d3`에 반영. 순수 DTO/ASCII·attempt·R3 detail·UNKNOWN. LOG-032 당시 36개 파일·1,168개 PASS |
| V0.2B Read-only TUI DAG Viewer | 완료 / 커밋·푸시 | `0834683bd`에 반영. 정적 overlay·navigation/close. LOG-034 당시 38개 파일·1,231개 및 실제 TUI smoke PASS |
| V0.2C Product Isolation / Setup / Doctor | 완료 / 사용자 실행 확인·게시 승인(LOG-038) | `~/.weavra/agent`·child env 격리·명시적 import·read-only doctor. LOG-037 자동 42개 파일·1,402개 및 임시 HOME의 실제 launcher/TUI smoke PASS |

S0~S6와 제한된 GPT RC-01~08 Closure 이후 Branding, Status Projection, fork-local launcher를 완료했다. 실제 GPT 판정은 [GPT_RC_VALIDATION_2026-09-16.md](GPT_RC_VALIDATION_2026-09-16.md)의 사용자 수동 evidence다. Branding은 `632ad3bcd`, Status Projection은 `2205dec84`, fork-local launcher는 commit `14c3f6992`에 반영되어 있다. 각각의 당시 검증은 LOG-021~027에 보존한다.

현재 작업은 **V0.2C — Product Isolation / Setup / Doctor**다. launcher가 기존 Pi와 Weavra의 기본 user-level config/auth/session 경로를 분리한다. setup은 파일별 명시적 동의와 no-overwrite import, doctor는 로컬 read-only 진단이다. `.ai` Runtime authority와 Kernel/Workflow/Policy/Approval/Verification/Graph/Viewer/Status 및 worktree create/open/list 의미는 유지한다. 이번 자동 targeted는 **42개 파일·1,402개 PASS**, root check/bash 구문/diff 검사는 PASS다(LOG-037). 임시 HOME에서 fake Pi 설정 → 실제 launcher setup/doctor → 기존 built fork-local Weavra TUI 시작 및 `/graph`/`/state`/`/quit`를 확인했다. 실제 사용자 HOME은 수정하지 않았고 build·유료 GPT RC는 재실행하지 않았다. 안정 태그 `weavra-v0.1-rc1`의 commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 불변이다. DeepSeek·다른 Provider/OS/Node 조합, 전체 suite/e2e·정식 배포물·취약점 해소는 여전히 NOT VERIFIED다. 정식 release 선언이 아니며 기존 한계는 [V0.1_READINESS](V0.1_READINESS.md), LOG-020 및 Status Projection의 LOG-023을 따른다.

---

## LOG-001 — Phase 0: Pi 조사와 초기 설계

- **기록일:** 2026-09-15 (KST), 이전 작업 결과 소급 기록. 정확한 작업 시작·종료 시각은 남기지 않았다.
- **상태:** 완료
- **목적:** MASTER_SPEC를 구현하기 전에 Pi 재사용 영역과 Extension/Core 경계를 확인한다.

### 작업 내용

- CLI/SDK/AgentSession, Extension lifecycle·명령·도구·interception, 모델·인증, 리소스 로딩, 세션 저장과 TUI를 조사했다.
- Extension + 별도 Runtime + 역할별 SDK 세션을 권고했다. Core 수정은 제안하지 않았다.
- 첫 Vertical Slice를 STANDARD → Developer → Reviewer → PASS/REVISE → 상태 저장·보고로 한정했다.
- 부모 도구 훅의 보호 범위, 승인과 sandbox의 차이, Pi 세션과 `.ai` 상태의 소유권을 구분했다.

### 변경 문서

- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DECISIONS.md`: ADR-001~010

`docs/MASTER_SPEC_PI_PERSONAL_AI_RUNTIME.md`는 기존 사용자 문서로 유지했다.

### 검증과 제한

- 상대 링크·코드 블록·공백 검사: 통과.
- 코드 구현, 빌드, 테스트, 실제 Provider 추론: 미실행.
- 소스 조사 기준: `devlop`, HEAD `f9bcd351dc3cedf989bc5fc0f8aa012db5737df2`, coding-agent `0.85.1`.
- **다음 작업:** S0 계약·로딩 골격.
- **커밋:** 하지 않음.

## LOG-002 — S0: 계약·설정·Extension 골격

- **기록일:** 2026-09-15 (KST), 이전 작업 결과 소급 기록.
- **상태:** 완료
- **목적:** 실제 Agent 실행 없이 데이터 계약과 Pi 진입점을 검증한다.

### 작업 내용과 파일

`packages/company-runtime/`에 다음을 추가했다.

- `package.json`, `vitest.config.ts`: private workspace 패키지와 테스트 구성.
- `src/contracts.ts`: Run, Task, Handoff, Review, CheckResult, PolicyDecision schema와 타입.
- `src/config.ts`: `.ai/config.yaml` schema, 보수적 기본값, 잘못된 설정·정책 완화 거부.
- `src/extension.ts`: `/team`, `/state`, `/workflow`, `/risk` 읽기 전용 명령 골격.
- `test/contracts.test.ts`, `test/config.test.ts`, `test/extension.test.ts`.
- `README.md`: 로딩 방법, 설정과 미구현 범위.

`package-lock.json`에는 새 workspace 등록을 반영했다. 기존 버전의 TypeBox/YAML/Vitest 등을 재사용했으며 Core·자동 로딩 설정·프로젝트 `.ai` 파일은 수정하거나 생성하지 않았다.

### 검증

패키지 디렉터리에서:

```sh
node ../../node_modules/vitest/dist/cli.js --run test/contracts.test.ts test/config.test.ts test/extension.test.ts
```

- 최종 결과: **3개 파일, 62개 테스트 통과**.
- 실제 Pi public loader로 파일 및 패키지 진입점 로딩 확인.
- 저장소 루트 `npm run check`: 통과.
- 빌드·전체 테스트 suite·실제 Provider 추론: 미실행.

### 문제와 해결

- 초기 `node_modules` 부재: `npm install --ignore-scripts`로 설치했다. lockfile은 `npm install --package-lock-only --ignore-scripts`로 갱신했다.
- Pi 생성 모델 JSON 부재로 로딩 테스트와 타입 검사가 실패했다. 기존 `npm run hydrate:model-data`로 공개 카탈로그 데이터를 준비한 뒤 재검증했다. 모델 생성 소스나 Provider 구현은 수정하지 않았다.
- 설치 시 기존 Vitest 계열에서 중간 위험도 취약점 3건을 확인했다. S0 범위를 벗어나는 일괄 의존성 업데이트는 하지 않았다.

### 남은 범위

- 명령은 상태 안내만 제공한다. run/cancel, Agent 실행, 정책 집행, 파일 상태 저장은 미구현이다.
- **다음 작업:** S1 순수 Kernel.
- **커밋:** 하지 않음.

## LOG-003 — S1: Host 독립 순차 Kernel과 RuntimeEvent

- **기록일:** 2026-09-15 (KST), 직전 작업 결과 소급 기록.
- **상태:** 완료
- **목적:** S0와 STANDARD 범위를 유지하면서 다른 Host와 향후 상태 화면을 위한 경계를 마련한다.

### 설계 보완

- ADR-001~010과 충돌이 없음을 확인하고 기존 결정은 유지했다.
- `docs/DECISIONS.md`: ADR-011 추가. Host 독립 경계와 관찰용 이벤트를 채택했다.
- `docs/ARCHITECTURE.md`: Host Adapter와 AgentExecutor/Pi Agent Adapter 경계, Step 식별과 이벤트 전달 규칙 추가.
- `docs/IMPLEMENTATION_PLAN.md`: S0~S6는 유지하고 S1 범위·완료 결과를 보완했다.

### 구현 파일과 동작

`packages/company-runtime/` 기준:

- `src/classification.ts`: 최소 intent/complexity/risk 규칙과 최소 역할 선택. 불명확한 요청은 확인 대상으로 표시한다.
- `src/kernel.ts`: STANDARD 순차 전이, PASS/REVISE/BLOCK, revision 한도, 완료 guard.
- `src/ports.ts`: AgentExecutor, Verifier, StateStore, ApprovalPort 등의 작은 계약.
- `src/events.ts`: 구조화 RuntimeEvent와 선택적 RuntimeEventSink.
- `src/contracts.ts`: Step 참조, 검증 결과 계약, Run의 `currentStep`·`eventSequence` 추가.
- `test/classification.test.ts`, `test/kernel.test.ts`, `test/host-boundary.test.ts`: 새 unit tests.
- `test/contracts.test.ts`: 추가된 Run 필드에 맞춘 fixture 보완.
- `README.md`: S1 API와 제한 설명 추가.

Step ID는 `implement`, `self-check`, `review`, `test`, `complete`로 고정했다. `(runId, stepId, attempt)`로 재작업의 동일 단계를 구분한다. 상태 저장 후 이벤트를 발행하며, sink 실패는 별도 진단으로 남긴다. 저장 실패는 실행을 중단하고 RunCompleted 발행을 막는다.

S0의 설정과 Extension 명령은 재작성하지 않았다. S1에서 새 dependency나 Core 수정은 추가하지 않았다.

### 검증

패키지 디렉터리에서:

```sh
node ../../node_modules/vitest/dist/cli.js --run test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts
```

- 최종 결과: **6개 파일, S0 포함 133개 테스트 통과**.
- 검증 항목: STANDARD 전이, PASS/REVISE/BLOCK, invalid transition, revision limit, completion guard, R2 Reviewer 강제, 이벤트 순서, Step ID/attempt 일관성.
- 추가 검증: sink throw/reject, 상태 저장 실패, 객체 사본 격리, 동시 advance 거부, 취소 후 늦은 결과, Host 의존 경계.
- 저장소 루트 `npm run check`: 통과, 최종 실행에서 자동 수정 없음.
- 문서 상대 링크·코드 블록 검사: 통과.
- 빌드·전체 테스트 suite·실제 Pi AgentSession/Provider 실행: 미실행.

### 문제와 해결

- 초기 check의 사용하지 않는 import 경고를 수정했다.
- 테스트의 `Promise.withResolvers`가 저장소 ES2022 타입 설정과 맞지 않아 동일한 동작의 Promise fixture로 변경했다. 이후 테스트·check를 다시 통과했다.

### 남은 범위와 다음 작업

- Port의 실제 파일 저장·정책 구현은 S2, Pi Agent Adapter는 S3, 명령 실행 연결은 S4다.
- ApprovalPort는 계약만 있으며 R3 실행은 계속 차단한다. R2 fake 테스트 통과는 실제 도구 실행 허가가 아니다.
- 이벤트는 관찰용이며 재생·전달 보장·Event Sourcing을 제공하지 않는다.
- DAG scheduler/renderer, 병렬 Agent, RPC 서버, Web UI, T3Code 연동은 추가하지 않았다.
- **다음 작업:** S2 진입 가능. 파일 StateStore·lock과 실행 전 Policy를 구현한다.
- **커밋:** 하지 않음.

## LOG-004 — 작업 이력 기록 규칙 도입

- **기록일:** 2026-09-15 (KST)
- **상태:** 완료
- **목적:** 앞으로 각 작업 결과가 대화에만 남지 않도록 문서로 유지한다.
- **변경:** `docs/WORK_LOG.md` 생성, Phase 0/S0/S1 소급 기록. `AGENTS.md`에 작업 종료·중단 시 이력 갱신 규칙 추가.
- **검증:** 문서 변경만 수행. 링크·형식·diff 확인. 코드 테스트와 `npm run check`는 재실행하지 않았으며 위 S0/S1 결과는 당시 실행 기록이다.
- **제한:** 소급 기록은 이전 대화와 검증 출력 기준이다. 별도 원본 실행 로그나 정확한 단계별 소요 시간은 보관하지 않았다.
- **다음 작업:** S2 진행 시 새 항목을 추가하고 현재 요약을 갱신한다.
- **커밋:** 하지 않음.

---

## LOG-005 — S2: 최소 파일 StateStore와 실행 직전 Policy

- **기록일:** 2026-09-15 14:48 (KST)
- **상태:** 완료
- **목적:** S0/S1과 Host 독립 경계를 유지하면서 실제 Agent 실행 전에 필요한 상태·소유권·정책 안전장치를 구현한다.

### 변경 내용과 파일

`packages/company-runtime/` 기준:

- `src/state-store.ts`: 기존 StateStore Port의 파일 구현, 프로젝트 revision 및 run별 revision 검사, 단일 활성 run, 배타 writer lock, 원자 파일 교체, projection 복구, 중단 판정, 최소 action intent/result 기록, scoped finally 정리.
- `src/policy.ts`: 순수 정책 판단, 등록된 read/search/write/edit와 역할·경로·risk 검사, 실행 전후 audit gate. R2/R3/UNKNOWN은 실행하지 않는다.
- `src/policy-paths.ts`: 순수 Policy와 분리한 파일 시스템 검사 Adapter. symlink·hardlink·workspace 탈출·특수 파일을 거부한다.
- `src/contracts.ts`: PolicyDecision의 예약 결과를 REVIEW_REQUIRED/APPROVAL_REQUIRED로 확정하고 action risk UNKNOWN을 추가했다. Run/분류의 risk와 Step 계약은 유지했다.
- `test/state-store.test.ts`, `test/policy.test.ts`: 실제 임시 파일 시스템, 별도 Node 프로세스 lock 경합, 저장 장애 주입, fake executor 검증.
- `test/host-boundary.test.ts`: 순수 Policy도 기존 Host/I/O import 경계 검사에 포함했다.
- `README.md`: API, 저장 포맷·오류·복구, 안전 한계와 S3 연결 조건을 문서화했다.

`docs/IMPLEMENTATION_PLAN.md`에 S2 결과와 S3 진입 상태를 반영했다. 별도 decisions.md/logs 출력은 S4/S5에 남기고, S2는 state 내부 decision/action ID·최소 상태만 기록하도록 범위를 명시했다. `docs/WORK_LOG.md`에 현재 기록을 추가했다.

기존 Kernel/Ports/Events/config/Extension 구현, MASTER_SPEC와 ADR-001~011은 변경하지 않았다. 새 dependency, Core 수정, 실제 프로젝트 `.ai` 생성, 명령 연결은 없다. 기존 AGENTS.md/package-lock.json 작업도 유지했다.

### 동작과 실패 처리

- 정규 프로젝트 경로의 `.ai/writer.lock`을 배타 생성한다. lock 획득 실패는 기존 상태를 변경하지 않는다. 다른 소유자나 불명확한 stale lock은 자동 삭제·탈취하지 않는다.
- `.ai/state.json`의 `{schemaVersion, revision, runs, actions}`가 원본이다. tasks는 같은 프로젝트 revision의 재생성 가능한 projection이다. action ID는 run에 묶고 중복 실행·동일 run의 config digest 변경을 거부한다.
- temp/write/file sync/rename으로 state를 먼저 저장한다. tasks 저장 실패는 `stateCommitted: true`인 오류이며 추가 변경을 차단한다. 다중 파일 transaction으로 취급하지 않는다.
- 재개된 소유자는 CREATED/RUNNING/WAITING_APPROVAL과 PREPARED action을 INTERRUPTED로 저장한다. 기존 RunInterrupted 이벤트를 저장 뒤 발행하며 sink 실패는 별도 진단에 남긴다. 자동 실행·resume·PASS/승인 재사용은 없다.
- Policy는 ALLOW만 실행하고 나머지 결과·검사 불가·저장 실패에서 executor를 호출하지 않는다. intent 저장 뒤 경로·lock·취소를 다시 검사한다. 실행 후 결과 저장 실패도 성공으로 반환하지 않고 다음 action을 막는다.

### 이번 작업에서 실행한 검증

패키지 디렉터리에서:

```sh
node ../../node_modules/vitest/dist/cli.js --run test/state-store.test.ts test/policy.test.ts test/host-boundary.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts
```

- 시작 시 기존 S0/S1 **6개 파일·133개 테스트** 통과를 재확인했다.
- 최종 S2 포함 **8개 파일·244개 테스트 통과**. 저장/revision/projection/복구/lock/손상 JSON/원자 저장 실패/fail-closed, 경로·symlink·역할·도구·위험 정책 및 차단된 executor 호출 0회를 검증했다.
- 저장소 루트 `npm run check`: 통과. TypeScript, 의존성·entry graph·shrinkwrap·install lock 및 browser smoke 검사 포함. Biome 자동 포맷 결과도 확인했다.
- `git diff --check`: 통과. 작업 문서의 상대 링크·코드 블록·이력 ID도 확인했다.
- 빌드·전체 테스트 suite·실제 AgentSession/Provider 추론·interactive smoke: 미실행. 이번 범위에 실제 Agent/명령 연결이 없다.

### 문제와 해결

- 첫 check가 타입 없는 지역 변수 2개를 지적했다. Node의 Stats/FileHandle 타입을 명시한 뒤 check를 통과했다.
- 결과 저장 실패를 executor 실패로 잡으면 두 번째 저장을 시도해 부분 저장 오류를 가릴 수 있었다. 성공 결과 저장을 executor try/catch 밖으로 분리하고 실패 후 추가 실행 차단 테스트를 추가했다.
- 순수 Policy에서 파일 시스템을 조회하지 않도록 policy-paths Adapter를 별도 파일로 분리했다. Kernel의 import graph는 유지했다.

### 남은 제한과 다음 작업

- 로컬 협력적 단일 writer 계약이며 OS sandbox·분산 lock·전원 장애 내구성은 아니다. 외부 프로세스의 검사/실행 사이 파일 교체 경합을 완전히 막지 못한다. 검증 환경은 현재 macOS/Node이며 다른 OS 검증은 하지 않았다.
- 모든 symlink(내부 포함), hardlink 파일, 디렉터리 단위 재귀 검색을 보수적으로 차단한다. 검색은 구체 파일 목록만 지원한다. 임의 이름의 비밀 내용을 자동 탐지하지 않는다.
- 실제 도구 입력·risk·정책/config digest 생성·고정과 추가 Runtime 보호 경로 지정은 신뢰한 S3 Adapter 책임이다. 임의 shell과 verifier 명령 실행은 아직 지원하지 않는다.
- close/scoped finally는 제공하지만 worker가 살아 있는 동안 lock을 풀지 않도록 Host가 종료를 기다려야 한다. crash가 남긴 불명확한 lock은 사용자 확인 후 수동 정리해야 한다.
- 대화/tool history 복제, 별도 decisions.md/logs 출력, 자동 resume/retry/checkpoint, 승인 UI, SDK worker, RPC/Web/DAG/병렬 실행은 추가하지 않았다. 파일 크기 16 MiB 제한과 자동 보관 미지원은 남아 있다.
- **다음 작업:** S3 진행 가능. 독립 Developer/Reviewer SDK Adapter에 고정된 도구·리소스와 S2 gate를 연결하고 faux provider로 검증한다. 명령→workflow 연결은 S4로 유지한다.
- **커밋:** 하지 않음.

---

## LOG-006 — S3: 독립 Pi SDK Agent Adapter

- **기록일:** 2026-09-15 15:33 (KST)
- **상태:** 완료
- **목적:** Kernel/Port/Adapter 경계를 유지하며 Developer와 Reviewer를 실제 SDK AgentSession에 연결한다. 전체 workflow·verifier·명령 연결은 제외한다.

### 변경 내용과 파일

`packages/company-runtime/` 기준:

- `src/agent-runner.ts`: PiAgentExecutor, 두 profile의 사전 model/auth 검사, 역할 호출별 새 SDK 세션, 명시적 ResourceLoader·메모리 Settings, timeout/abort/dispose, 동시 역할·실패 run 재호출 거부.
- `src/agent-tools.ts`: S2 gate를 직접 호출하는 read/search/write/exact edit, 등록 check 요청(미실행), 역할별 구조화 결과 제출. 기본 Pi 도구나 shell은 설치하지 않는다.
- `src/contracts.ts`: 기존 세션 참조 shape를 RoleSessionReferenceSchema로 분리하고 VerificationResult에 선택적 reviewContext를 추가했다. Pi Reviewer는 실제 자료가 없는 입력을 거부한다.
- `src/ports.ts`: session reference 저장을 기다리는 onSessionCreated 콜백 추가. Pi 구체 타입 없음.
- `src/kernel.ts`: 세션 참조 검증·저장, 저장 후 이벤트, 단일 등록·늦은 콜백 거부만 추가했다. STANDARD 전이·completion guard·revision limit는 유지했다.
- `src/events.ts`: AgentSessionCreated와 AgentCompleted/Failed의 선택적 sessionRef. 기존 이벤트 sequence·stateRevision 규칙 유지.
- `test/agent-metadata.test.ts`: 순수 Port의 참조 저장·잘못된 참조·저장 실패·늦은 콜백 검사.
- `README.md`: API와 역할 도구, 리소스/인증 범위, 참조·이벤트·취소 및 S4 연결 조건 기록.

추가 변경:

- `packages/coding-agent/test/suite/company-runtime-agent.test.ts`: 기존 suite harness와 faux provider로 실제 SDK Adapter 통합 테스트.
- `packages/coding-agent/vitest.config.ts`: public coding-agent import를 workspace source로 해석하는 alias 한 줄. 빌드 없는 소스 테스트용이며 Core 동작 변경이 아니다.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`: S3 결과·현재 요약과 다음 단계 갱신.

MASTER_SPEC/ARCHITECTURE/ADR-001~011, S2 StateStore·Policy 구현과 S0 config/Extension은 변경하지 않았다. Pi Core, dependency/lockfile, 실제 프로젝트 `.ai` 설정·명령 연결도 변경하지 않았다. 기존 AGENTS.md/package-lock.json 수정은 이전 작업 그대로다.

### 구현 결정과 확인된 동작

- Developer와 Reviewer는 세션·ID·도구·ResourceLoader·Settings·모델 profile이 독립적이다. Handoff/명시적 verification 자료 외 부모 대화나 Developer reasoning을 Reviewer에 전달하지 않는다.
- 기본 ResourceLoader가 noExtensions 외에도 context/SYSTEM/append prompt 등을 읽을 수 있음을 소스로 확인했다. Worker는 기본 로더를 생성하지 않고 빈 resource 목록과 명시적 role/projectInstructions만 제공한다. project/global 리소스 trap fixture가 로드되지 않음을 확인했다.
- 설정 사본·도구 등록·보호 경로를 고정해 config digest를 생성한다. coding/reasoning 모두 provider/model/checkAuth/getAuth를 확인하고, 실행 직전 해당 profile을 다시 검사한다. 원격 availability나 자동 fallback을 가정하지 않는다.
- 파일 도구는 부모 hook 없이 S2 gate를 통과한다. Reviewer에는 read/search/submit_review만 있다. 등록 check 요청은 Pi history에 남기되 UNAVAILABLE이며 어떤 명령도 실행하지 않는다.
- 제출 결과는 schema와 run/task/role/revision 및 review diffDigest를 검사한다. 제출과 mutation을 섞은 batch, 자연어-only 완료, malformed 결과와 도구 실패는 종료 오류다. Kernel의 기존 결과/완료 재검증은 유지한다.
- 새 세션 참조를 Kernel에 저장한 뒤 prompt를 실행한다. Pi JSONL은 workspace 밖 Pi agent directory가 소유한다. Runtime State/Event에는 참조·단계·상태만 기록하며 transcript/reasoning을 복제하지 않는다.
- 이벤트 발행자는 Kernel 하나다. AgentStarted(호출 시작) → AgentSessionCreated(참조 저장) → AgentCompleted/Failed를 관찰한다. 새로운 이벤트 버스나 replay는 없다.
- AbortSignal/timeout을 tool gate와 Provider stream 시작에 연결한다. finally에서 idle/abort 정리를 기다리고 dispose한다. 실패·취소 run은 해당 Adapter에서 다음 역할을 시작하지 않는다.

### 이번 작업에서 실행한 검증

패키지별 명령:

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
```

- Runtime: **9개 파일·249개 테스트 통과**. 기존 S0~S2 244개 회귀와 새 metadata 5개 포함.
- coding-agent: **2개 파일·63개 테스트 통과**. 새 faux SDK 통합 47개와 기존 prompt suite 16개 포함.
- 이번 최종 검증 합계 **11개 파일·312개 테스트 통과**. 이 숫자는 전체 저장소 suite 수가 아니다.
- 루트 `npm run check`: 통과. 최종 Biome는 자동 수정 없음. TypeScript·deps·entry graph·shrinkwrap·install lock·browser smoke 포함.
- `git diff --check`, 변경 문서 링크·코드 블록·이력 ID·공백 검사: 통과.
- 유료/실제 Provider API, 전체 테스트 suite, build, interactive smoke: 미실행. 실제 모델에 대한 품질·네트워크 검증으로 보고하지 않는다.

### 문제와 해결

- 첫 통합 실행은 public coding-agent 패키지의 미빌드 entry를 찾지 못했다. 기존 workspace source alias를 테스트 설정에 추가해 build 없이 실행했다.
- faux context에는 SDK tool 함수가 포함되어 structuredClone이 실패했다. 테스트에서 제공된 context를 관찰하고 검증하되 함수까지 복제하지 않도록 수정했다.
- Vitest spy 타입의 overload 지정이 TypeScript 검사에 맞지 않았다. 설치된 타입을 확인하고 MockInstance로 명시했다.
- SDK prompt preflight가 Agent abort controller 생성 전에 yield할 수 있다. Adapter에서 기존 SDK streamFunction을 감싸 취소를 재검사하고 signal을 결합했다. 이 구간 취소 시 Provider 호출 0도 테스트했다.
- cleanup 중 취소가 성공 반환으로 빠지지 않도록 cleanup 뒤 signal을 다시 검사한다. 늦은 tool callback은 disposed 상태에서 차단한다.

### 남은 제한과 후속 단계

- 전체 Developer→SELF_CHECK→Reviewer→TEST workflow는 실행하지 않았다. 독립 역할 호출과 단일 Kernel IMPLEMENT 연결만 검증했다. 실제 diff/check 자료 생성·freshness 연결·명령 및 Host shutdown은 S4다.
- 검색은 명시한 파일 최대 32개만 지원한다. 읽기/작성 내용은 256 KiB, exact edit·기존 부모 디렉터리만 지원한다. 자동 후보 탐색·삭제·이동·범용 shell은 없다.
- 같은 프로세스의 정책 gate이지 OS sandbox가 아니다. 외부 파일 교체 경합·악성 Extension 직접 I/O·비협조 Provider/auth/파일 I/O를 강제로 종료하지 못한다. timeout은 취소 요청 기한이며 정리 시간의 절대 상한이 아니다. 실환경 인증 해석은 OAuth 갱신 등 네트워크를 사용할 수 있다.
- Pi SessionManager는 첫 assistant까지 JSONL 생성을 지연한다. 사전 실패 sessionRef에 대응하는 파일이 없을 수 있다. `.ai`와 Pi transcript 간 transaction이나 resume는 없다.
- 공유 ModelRuntime의 동적 변경은 Host가 관리해야 한다. 부모 리소스를 로드해 인증·Provider를 자동 상속하지 않는다. usage는 Pi session에 남기고 Runtime 집계는 추가하지 않았다.
- S4 후속 제안: 신뢰한 실제 diff/check 자료를 reviewContext로 전달하고 같은 Policy로 제한 verifier를 구현한다. Provider/세션 오류·취소 후 부분 파일 변경을 최종 보고에서 명시한다. 승인 UI·DAG·Web/RPC·Lead/Planner·병렬화·checkpoint/fallback은 범위 밖으로 유지한다.
- **다음 작업:** S4 진입 가능.
- **커밋:** 하지 않음.

---

## LOG-007 — S4: Verification + STANDARD Vertical Slice

- **기록일:** 2026-09-15 16:31 (KST)
- **상태:** 완료 — 첫 STANDARD/R0~R1 Slice. 전체 V0.1 완료 아님.
- **목적:** 기존 S0~S3와 ADR-001~011을 유지하며 실제 검증 증거, 순차 SDK 역할, 명령과 취소 lifecycle을 연결한다.

### 1. 변경 파일

- 신규: `packages/company-runtime/src/process-runner.ts`, `src/workspace.ts`, `src/verification.ts`, `src/workflow.ts`.
- 수정: 같은 패키지 `src/contracts.ts`, `src/ports.ts`, `src/kernel.ts`, `src/policy.ts`, `src/state-store.ts`, `src/agent-runner.ts`, `src/extension.ts`.
- 테스트: 같은 패키지 `test/verification-boundary.test.ts` 신규, `test/extension.test.ts` S4 갱신; `packages/coding-agent/test/suite/company-runtime-workflow.test.ts` 신규.
- 문서: `packages/company-runtime/README.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`.
- MASTER_SPEC/ARCHITECTURE/DECISIONS, Pi Core, dependency/lockfile, 실제 저장소 `.ai`는 수정·생성하지 않았다. 기존 AGENTS/lockfile/Vitest alias·untracked S0~S3 작업은 보존했다. devlop이므로 별도 릴리스 Changelog는 작성하지 않았다.

### 2. 전체 실행 흐름

`/workflow run <goal>` → 신뢰/등록 실행 확인 → 분류 → 단일 writer → profile/auth → clean Git baseline → IMPLEMENT → SELF_CHECK → 독립 REVIEW → TEST → live digest 확인 → Kernel COMPLETE 저장 → 보고 → lock 해제다. REVISE는 IMPLEMENT부터 새 session/attempt로 최대 1회 반복한다. BLOCK/한도 초과/필수 check 실패는 최종 완료로 진행하지 않는다.

### 3. Host와 Kernel/Adapter 경계

Extension은 명령·UI·ModelRuntime 구성과 lifecycle만 담당한다. StandardWorkflow가 순차 호출과 취소/자원 수명을 소유하고 Kernel만 상태 전이/완료를 결정한다. 기존 Verifier Port에 선택적 live `inspect`만 추가했으며 S4 Adapter는 제공한다. Kernel/Ports/Policy에 Pi·UI·fs 구체 타입을 추가하지 않았다. 범용 plugin framework/event bus/DAG scheduler는 없다.

### 4. 실제 Verification Engine

등록 check ID/kind/required를 요청과 대조하고 frozen executable/argv/cwd/timeout/env를 실행한다. PASS/FAIL/SKIPPED/UNAVAILABLE, 실제 exit code, 시작/종료 Unix ms, stdout/stderr와 evidence reference를 반환한다. stdout/stderr 합계 16 KiB 초과·timeout·실패는 PASS가 아니다. 미실행 check를 PASS 처리하지 않는다. 등록 ID를 요청하는 worker tool은 이전처럼 UNAVAILABLE이며 실제 실행은 SELF_CHECK/TEST에서만 수행한다.

### 5. 실행 Policy와 제한

Verifier 전용 PolicyDecision을 S2 audit prepare/finish에 연결했다. exact registration 비교, shell/wrapper/inline eval 차단, cwd 경로 검사 및 intent 후 재검사, lock/취소 확인을 통과해야 `spawn(shell:false)`를 호출한다. PATH·locale·CI·색상 및 Git 설정 차단 값만 환경으로 전달하고 HOME/NODE_OPTIONS/키/token/proxy 등은 상속하지 않는다. 명시적 local check script/program을 Developer 보호 경로에 추가했다. 등록 프로그램 내부 코드·의존성·네트워크는 sandbox하지 않으므로 UI에 신뢰 전제를 표시한다.

### 6. Git baseline과 diff

기존 HEAD가 있는 프로젝트 루트에서 tracked/staged/untracked 사용자 변경이 있으면 worker prompt 전에 거부한다. HEAD/index/config와 정렬된 경로·mode·전체 bytes SHA-256으로 digest를 계산한다. runtime 운영 파일 세 개만 제외하고 추적 상태이면 시작을 거부한다. 설정 파일 변경은 숨기지 않는다. 허용 root의 ignored 파일도 수집한다. diff는 실제 before/after UTF-8·mode JSON이며 unified patch가 아니다. HEAD/index 변경, binary 변경, 보호 경로, symlink/hardlink/special file과 크기 한도는 보수적으로 거부한다. 사용자 Git 정리·rollback·commit은 수행하지 않는다.

### 7. Reviewer 입력과 독립성

매 호출 새 Developer/Reviewer SDK session과 기존 제한 도구를 사용한다. Reviewer에 task requirements, 구조화 handoff/위험/미해결 항목, 실제 changed files/diff/digest, SELF_CHECK 출력 evidence와 revision을 전달한다. Developer reasoning/transcript를 복사하지 않으며 read/search/submit_review 외 mutation/process 도구를 제공하지 않는다. REVISE도 새 session을 사용한다.

### 8. 완료 조건과 stale review

Kernel은 기존 run/task/revision·요구사항·미해결·독립 PASS·필수 checks guard를 유지한다. TEST 이후 또는 COMPLETE 직전 digest가 달라지면 BLOCKED로 종료하고 기존 PASS를 재사용하지 않는다. 후속 check가 앞 check의 workspace를 바꾸면 앞 증거도 stale로 처리한다. 자동 재검토 반복은 추가하지 않았다. COMPLETE state 저장 실패는 RunCompleted를 발행하지 않는다.

### 9. 상태와 RuntimeEvent

Run에 최소 workspace digest/changedFiles/evidence/safe와 구조화 Review, CheckResult에 timing/output을 추가했다. 실제 check 결과는 취소와 후속 diff 수집 실패에서도 가능한 먼저 저장한다. `.ai/state.json` 원본과 tasks projection, Pi JSONL의 transcript 소유권은 유지한다. 외부 authoritative state 변경은 덮어쓰지 않고 실패로 닫는다. 이벤트는 기존 Kernel authority·sequence·stateRevision·(runId, stepId, attempt)·저장 후 발행이며 별도 재생 로그/버스는 없다.

### 10. 취소와 partial mutation

오류/timeout/취소 후 실제 변경 경로를 재수집하여 partial changes, verification 상태/원인, 사용자 후속 조치를 보고한다. 수집 실패는 changesUnknown이며 완료로 위장하지 않는다. 활성 단계 status는 live diff가 아니라는 경고를 출력한다. worker abort/idle/dispose와 check process group TERM/KILL/close/소멸 확인 후 lock을 해제한다. 정리가 불확실하면 lock을 유지하고 수동 점검을 요구한다. 자동 rollback·resume는 없다.

### 11. 명령과 Host lifecycle

네 명령과 `/workflow status|run|cancel`을 연결했다. 장기 작업 Promise를 소유하지만 run 명령 handler는 즉시 반환한다. 중복 run·활성 부모 Agent와 경합을 거부하며 실행 중 부모 input/tool/user_bash를 차단한다. switch/fork/tree/reload/quit 및 명시적 cancel은 cleanup을 기다린다. preflight dialog에도 signal을 전달한다. 부모 Esc가 worker를 자동 취소한다고 가정하지 않는다.

### 12. 이번 작업의 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# root
npm run check
git diff --check
```

- 최종 targeted tests(16:26 KST): Runtime **10개 파일·261개**, coding-agent **3개 파일·106개**, 합계 **13개 파일·367개 통과**. 이전 LOG-006의 312개는 당시 결과이며 이번 전체 저장소 suite 수가 아니다.
- 신규 workflow 43개: PASS, REVISE→PASS/한도 초과, BLOCK, dirty tracked/staged/untracked/config, 미지원 분류, check FAIL/UNAVAILABLE/timeout/shell/eval, stale TEST/COMPLETE, TEST 자체 mutation, 모든 Step 경계 취소, live Developer/Reviewer/SELF_CHECK/TEST 취소, duplicate writer, Provider 실패, COMPLETE 저장 실패, state corruption, symlink, check script 보호 및 Host lifecycle 포함.
- 신규 process/registration 11개와 Extension trust/public loader/confirmation/명령 회귀 포함. S0~S3 회귀와 기존 AgentSession prompt 16개도 이번에 다시 실행했다.
- root check 최종(16:29 KST) 통과, Biome 자동 수정 없음. TypeScript·deps·entry graphs·shrinkwrap·install lock·browser smoke 포함. 초기 자동 포맷과 tracked/untracked 파일 목록도 확인했다.
- 최종 `git diff --check`, 변경 문서 상대 링크·코드 fence·공백 및 LOG-001~007 고유 ID 검사 통과. untracked Runtime TypeScript/README의 공백도 별도 검사했다. 임시 검사 script는 제거했다.

### 13. 실제 Pi interactive smoke

- `.pi/skills/interactive-testing.md`에 따라 80×24 tmux에서 저장소 `pi-test.sh`를 실행했다. 임시 Extension을 `-e`로 명시적으로 로드하고 같은 `registerCompanyRuntime`에 suite harness/faux ModelRuntime을 주입했다.
- 임시 Git fixture, 별도 HOME/agentDir, `env -i`, `--offline --approve --provider faux --model coding --no-session`을 사용했다. 실제 Provider key·원격 추론·유료 token 호출은 없다.
- `/workflow run` 확인 dialog → 실제 코드 변경 → check PASS → Reviewer PASS → TEST PASS → COMPLETED를 두 번 확인했다. `/workflow`, status, state, team, risk 출력도 확인했다.
- live Developer에서 `/workflow cancel` → CANCELLED·src/app.js 부분 변경 보고·lock 없음, reload 후 저장 상태 조회를 확인했다. 별도 fresh fixture에서 **실행 중 `/reload`**도 worker 종료 후 CANCELLED로 조회됐다.
- 마지막 fixture 상태: 성공 2건 COMPLETED/PASS/PASS, 취소·live reload 각 CANCELLED, 모두 writer.lock 없음. 테스트 후 tmux·임시 fixture/script를 제거했다. 실제 작업 저장소 `.ai`가 없음을 확인했다. Interactive switch/fork/tree는 별도 조작하지 않았으며 faux Host 통합 테스트로 검증했다.

### 14. 문제와 해결 / 미실행과 한계

- 초기 check에서 지역 Stats 타입 누락, RuntimeEvent union narrowing, Vitest overloaded mock 타입, 기존 S0 골격 테스트 expectation을 수정했다. 최종 check/test로 해결을 확인했다.
- macOS의 group 종료 직후 kill probe에 일시 EPERM이 관찰됐다. 즉시 cleanup 완료/실패로 단정하지 않고 bounded polling으로 ESRCH를 확인하도록 수정했고 실제 descendant 종료 테스트를 통과했다.
- check 뒤 symlink 때문에 evidence 수집이 실패하면 exit/output이 사라질 수 있었다. 실제 check result를 FAIL로 보존하고 이후 수집 실패는 incomplete로 보고하도록 분리했다.
- 초기 smoke launcher의 single-quote `$1` 경로 오류를 고쳤다. 이는 fixture 실행 전 실패였으며 성공 smoke로 계산하지 않았다.
- `npm run build`, 전체 npm test/Vitest suite, 실제 Provider 품질/네트워크/유료 inference는 실행하지 않았다. 요청된 범위의 targeted/interactive faux만 검증했다.
- macOS/Node/POSIX 구현이다. Windows, 탈출한 daemon/process group, 외부 TOCTOU·악성 같은-process I/O·비협조 Provider/auth I/O를 강제 격리하지 않는다. 등록 프로그램은 검토된 trusted code여야 한다.
- Git evidence는 file/byte/count 한도가 있고 허용 root 밖 ignored 파일 전부를 스캔하지 않는다. 알려지지 않은 파일 안의 비밀 값 자동 탐지·OS sandbox는 없다. 단일 requirement는 command goal 전체이며 계획 분해는 없다.
- 파일별 atomicity이며 state/tasks 다중 transaction, directory fsync 내구성, 자동 crash recovery 실행은 없다. separate decisions.md/logs UI, usage 집계, R3 approval, QUICK/COMPLEX/R2/R3 실행은 추가하지 않았다.

### 15. 다음 단계와 커밋

첫 Slice는 완료했고 **S5 진입 가능**하다. 사용자 승인 후 QUICK/R2/R3와 조회·결정 기록 등의 작은 범위를 순서대로 진행한다. S6의 추가 실패/플랫폼 회귀 hardening도 남아 있다. 기존 제한을 자동 해제하거나 DAG/병렬화/웹/RPC/별도 서비스/SQLite migration을 추가하지 않는다.

**커밋: 하지 않음.** 사용자 작업 저장소의 Git 정리/commit은 없으며 테스트용 Git baseline commit은 새 임시 fixture 안에서만 생성하고 제거했다.

---

## LOG-008 — S5A: 검증을 공유하는 QUICK Executor

- **기록일:** 2026-09-15 17:00 (KST)
- **상태:** 완료 — S5A만 구현. S5B/R2·S5C/R3·S5D polish 및 S6는 미착수.
- **목적:** STANDARD 회귀를 막으면서 Reviewer만 생략한 최소 조직을 추가한다. QUICK도 정책·검증·최신 digest·Kernel 완료 판정을 유지한다.
- **시작 상태:** devlop clean, HEAD/origin은 `e80d97272513aa89cfbea6585933ac44c301f15d`. 직전 사용자 승인으로 S0~S4·명세·lockfile 39개 파일을 커밋/푸시한 상태다. LOG-001~007의 커밋 미실행 표시는 각 당시 기록으로 보존한다.

### 1. QUICK 선택 기준

- 기존 classifier의 question/typo에 명시적 작은 변경·설정·한 파일 표현을 보완했다. `adaptive`는 classification을 사용하고 기존 `runtime.workflow: STANDARD`는 처음부터 독립 review 조직을 선택한다. 새 mode UI는 없다.
- QUICK/R0는 read-only, QUICK/R1은 goal에 정확히 한 개의 확장자 있는 literal 상대 파일 경로를 요구한다. `Fix typo in src/app.ts`, `작은 설정 수정 ui/settings.json`, `Explain src/app.ts`를 검증했다.
- unknown·아키텍처/다수 모듈/대규모·refactor QUICK·R2/R3는 실행하지 않는다. 단순 classifier는 권한 증명이 아니며 실제 action과 workspace 검사도 수행한다.

### 2. Executor 구조와 profile

- 기존 RoleSchema의 Executor를 실행 Port/Event에 연결했다. PiAgentExecutor가 새 SDK session·명시적 resources·제한 도구·timeout/dispose를 그대로 사용한다. 별도 범용 Agent 시스템은 없다.
- `Executor → coding`을 사용하며 모델 ID 하드코딩·fast 자동 선택·fallback·비용 routing은 없다. Host가 frozen quickScope를 전달하고 요청과 일치해야 한다.
- STANDARD는 기존 coding/reasoning auth 사전 검사를 유지한다. QUICK은 coding만 검사하고 Reviewer session/auth를 생성·조회하지 않는다. config schema의 reasoning mapping 필수 조건은 유지하며 QUICK에서 미사용 model이 없어도 실행되는 fixture를 검증했다.

### 3. STANDARD와 공유하는 코드·변경 파일

- `packages/company-runtime/src/{classification,contracts,ports,events,kernel}.ts`: QUICK Step/role/result/scope와 공유 완료 guard의 명시적 QUICK 분기.
- `src/{agent-runner,agent-tools,policy}.ts`: 기존 SDK/도구와 Policy에 fixed scope 적용. R0 write/edit 미노출에만 기대지 않고 Policy에서도 mutation을 거부한다.
- `src/{workspace,verification,workflow,extension}.ts`: 기존 baseline/digest/실제 checks/실행 소유권/네 명령·lifecycle 재사용. S4의 StandardWorkflow 이름과 순차 실행 소유자를 유지하며 분류에 따라 두 경로를 실행한다.
- `StateStore`, path inspector, process runner 구현은 수정하지 않았다. 보호 파일·dependency gate·단일 writer·실패/취소 정리·원자 파일 저장 방식도 그대로다.
- Pi Core·dependency/lockfile·MASTER_SPEC/ARCHITECTURE/DECISIONS·실제 프로젝트 `.ai`는 변경하지 않았다. 기존 ADR-008/011로 설명 가능하므로 새 ADR을 억지로 추가하지 않았다.

### 4. QUICK 전용 코드와 evidence

- 신규 `src/quick.ts`: 작은 goal scope 선택, 공통 prefix/suffix를 제외한 changed-line span 계산, workspace의 한 파일/100행 한도 검사. 독립 diff/digest 엔진은 아니다.
- 기존 `HandoffSchema` 필드를 재사용한 ExecutorHandoffSchema에 정확한 요구사항별 status/explanation을 요구한다. `submit_handoff`와 기존 도구 구현을 재사용한다.
- Run에는 `quickScope`, 구조화 `executorResult`, `executorDigest`를 추가하고 공통 workspace evidence에 선택적 changedLines를 보완한다. 전체 diff·reasoning·transcript를 `.ai`에 추가 복제하지 않는다.
- QUICK 전용 scope/guard unit test와 coding-agent suite 파일을 추가했다. 기존 Kernel test fixture는 새 역할 union을 명시적으로 거부하도록 좁히고, 옛 QUICK 미지원 테스트는 live inspection 없는 QUICK 거부로 유지했다. S4의 일반 설명 미지원 fixture는 위험 설명 요청으로 바꿨으며 STANDARD 동작 assertion은 제거하지 않았다.

### 5. Completion Guard

- 구조화 Executor 결과의 run/task/revision 일치, exact requirements·MET·비어 있지 않은 설명, 실제 changed_files 일치, unresolved/known_risks 없음이 필요하다.
- 필수 check가 적어도 하나 있어야 하고 SELF_CHECK/TEST 각각 실제 PASS/exit 0/evidence/동일 digest여야 한다. optional check라도 Policy 거부는 QUICK에서 FAIL로 완료를 막는다.
- Kernel이 구현 직후 snapshot digest를 결과에 결합한다. SELF_CHECK/TEST/COMPLETE까지 executorDigest가 유지되어야 한다. check autofix도 결과 제출 뒤 변경이므로 QUICK에서는 stale·BLOCKED다.
- live inspection·scope/changed-line evidence 없이 완료할 수 없다. 자연어 완료, 누락/미충족 요구사항, blocker, stale digest, state 저장 실패는 COMPLETE가 아니다. Kernel만 완료를 저장한다.

### 6. R2/R3와 범위 확대 처리

- 초기 classification이 R2/R3이면 Host preflight에서 run/Provider 실행 전에 거부한다. 기존 selector의 QUICK→STANDARD 승격은 조직 판정일 뿐 실제 R2/R3 실행 허용이 아니다.
- `Fix typo in package.json`처럼 초기 R1이더라도 action Policy는 dependency mutation을 R2/REVIEW_REQUIRED로 차단한다. S5B의 R2 실제 실행을 열지 않았다.
- 고정 targetPath 밖 worker mutation은 실행 전 DENY다. 실제 코드가 여러 파일/100행 이상으로 확장되거나 결과 뒤 변경되면 BLOCKED·부분 변경·STANDARD 재실행 필요를 보고한다. 자동 hot-switch/rollback은 없다.

### 7. RuntimeEvent와 명령 trace

```text
RunCreated → RunStarted
StepStarted(implement) → AgentStarted(Executor) → AgentSessionCreated
  → AgentCompleted → StepCompleted
StepStarted(self-check) → VerificationStarted → VerificationCompleted → StepCompleted
StepStarted(test) → VerificationStarted → VerificationCompleted → StepCompleted
StepStarted(complete) → StepCompleted → RunCompleted
```

sequence/stateRevision·저장 후 발행·(runId, stepId, attempt) 구조는 유지한다. QUICK attempt는 1이며 ReviewRequested/ReviewPassed나 Reviewer session은 없다. 네 명령에 Workflow QUICK, Executor, Reviewer not required, risk와 구조화 결과를 표시한다. 활성 단계의 부분 변경 가능성·명시적 cancel 안내도 유지한다.

### 8. 이번 작업의 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# root
npm run check
git diff --check
```

- 최종 targeted tests(16:59 KST): Runtime **11개 파일·302개**, coding-agent **4개 파일·144개**, 합계 **15개 파일·446개 통과**. LOG-007의 367개는 S4 당시 결과이며 전체 저장소 suite 수가 아니다.
- QUICK 신규 **unit 41개 + faux integration 38개 = 79개**. R0/R1, coding Executor·Reviewer 없음, Policy·필수 checks PASS/FAIL, structured requirements, Provider 실패·partial mutation, 모든 Step 취소·live check 취소, dirty tracked/staged/untracked, R2/R3, scope 확대, SELF_CHECK/TEST mutation·stale digest, event sequence, COMPLETE 저장 실패, active/stored 명령·Host shutdown을 검증했다.
- root check 최종(17:02 KST) 통과, Biome 자동 수정 없음. 초기 TypeScript에서 STANDARD test helper의 역할 union narrowing 누락 1건을 수정했다. Biome 자동 포맷 결과와 tracked/untracked 변경을 확인했다. 별도 build·전체 npm test/Vitest suite·유료 Provider 추론은 실행하지 않았다.
- `git diff --check`, 변경 문서 링크/fence/공백·LOG-001~008 고유 ID·S5A~S5D 소제목 검사 통과. 신규 untracked 소스/테스트 공백도 별도 검사했고 임시 checker는 제거했다.

### 9. Interactive smoke

- interactive-testing skill에 따라 80×24 tmux에서 `pi-test.sh`와 명시적 `-e` 임시 wrapper를 사용했다. 기존 suite harness/faux를 `registerCompanyRuntime`에 주입하고 별도 HOME/agentDir, `env -i`, `--offline --approve --provider faux --model coding --no-session`으로 실행했다.
- QUICK/R1 오타 수정: Executor 1개 → SELF_CHECK PASS → TEST PASS → COMPLETED, src/app.ts만 변경, Reviewer not required를 확인했다.
- QUICK/R0 설명: read-only Executor 1개와 두 checks PASS → COMPLETED, 원본 내용 불변을 확인했다. reload 후 `/state`에서 저장된 QUICK 상태·구조화 결과/요구사항 설명도 확인했다.
- `/workflow`, `/team`, `/state`, `/risk` 출력 및 live Executor status → `/workflow cancel` → CANCELLED·partial changes yes를 확인했다.
- 세 fixture의 실제 state/session role/check digest·writer.lock 부재를 검증했다. tmux·임시 fixture/script를 제거했고 실제 저장소 `.ai`는 생성하지 않았다. 실제 모델 품질·원격/유료 Provider를 검증한 결과로 주장하지 않는다.

### 10. STANDARD 회귀와 문서

- 기존 S0~S4 검증을 이번에 다시 실행했다. STANDARD의 독립 Developer/Reviewer, PASS·REVISE→PASS·BLOCK, 최종 TEST mutation, 취소/Host lifecycle, state 실패, Pi prompt 회귀가 통과했다.
- `docs/IMPLEMENTATION_PLAN.md`: S5A~S5D 내부 순서와 S5A 결과·S5B 다음 단계를 추가했다. S5 전체 방향·S4 첫 Slice 기록을 보존했다.
- `packages/company-runtime/README.md`: 현재 실행 범위, QuickScope/profile/result/digest/API·명령·한계와 테스트 명령을 갱신했다.
- `docs/WORK_LOG.md`: 현재 요약과 본 LOG-008을 추가했다. 과거 이력은 보존한다.

### 11. 알려진 제한

- goal parser/분류는 보수적 heuristic이다. 한 파일 경로가 명확하지 않으면 거부하며 공백 있는 경로·복잡한 문장 분해·의미적 영향 범위 증명은 없다. 기존 보호 규칙상 config 파일 이름 일부는 작은 수정이어도 막힌다.
- 100행은 보수적 changed span이지 완전한 semantic diff가 아니다. Executor의 요구사항 설명은 모델 진술이며 독립 Reviewer 판단이 아니다. 정확성은 실제 프로젝트 checks와 사용자 확인에 의존한다.
- 등록 check는 trusted code이고 R0에서도 subprocess 내부 I/O를 OS 수준으로 막지 않는다. 관찰된 mutation을 fail-closed 처리하지만 transient 변경/외부 TOCTOU/탈출 daemon/비협조 I/O를 완전히 통제하지 못한다. 기존 macOS/POSIX·byte/count 한도도 유지한다.
- `.ai` 다중 파일 transaction·자동 rollback/resume/checkpoint, R2/R3 실제 실행, Lead/Planner/COMPLEX, DAG/T3Code/RPC/Web/병렬 실행/비용 routing/OS sandbox는 추가하지 않았다.

### 12. 다음 단계와 커밋

**S5B 진입 가능**하다. 사용자 승인 후 R2의 허용 action·독립 Reviewer enforcement를 별도 작은 작업으로 구현한다. S4/QUICK 회귀가 계속 우선이다.

**이번 S5A 커밋·푸시: 하지 않음.** 직전 S4 checkpoint `e80d97272` 이후 변경으로 남겨둔다.

---

## LOG-009 — S5B: R2 Review Enforcement

- **기록일:** 2026-09-15 17:32 (KST)
- **상태:** 완료 — R2의 제한된 파일 실행과 독립 리뷰 강제. S5C/R3는 구현하지 않음.
- **목적:** S4/S5A 회귀를 막으며 R2 파일 작업이 Reviewer 없이 실행 완료되거나 QUICK/R1 권한으로 우회되지 않게 한다.
- **시작 상태:** devlop, HEAD `e80d97272`. S5A의 미커밋 tracked/untracked 변경을 보존한 상태에서 진행했다.

### 구현 범위와 실행 구조

- 초기 R2는 STANDARD Developer/Reviewer로 선택한다. `adaptive`에서는 Complexity QUICK/Risk R2도 실행 전 STANDARD를 고른다. 명시적 config QUICK, COMPLEX/R3는 계속 거부한다. 실행 중 R1/QUICK에서 R2 action을 발견하면 중단하고 새 STANDARD/R2 run을 안내한다. 자동 workflow 전환·risk promotion은 없다.
- 기존 write/edit 도구로 허용 경로의 파일을 변경한다. dependency manifest/lockfile도 같은 경로·보호·size 검사를 거친다. 설치·삭제·이동·mkdir·배포·shell 도구를 추가하지 않았다.
- Host가 run ID를 먼저 정하고 `createAgents(store, quickScope?, r2RunId?)`를 통해 PiAgentExecutor/Policy에 고정한다. 실제 request·evidence 수집·verifier의 run과 일치해야 한다. `r2RunId`는 configDigest에 포함하며 worker tool 인자가 아니다.
- bound R2 run의 Developer mutation은 최소 R2로 평가한다. ALLOW는 독립 리뷰 전제의 파일 실행 허가이지 이미 받은 PASS나 Human Approval이 아니다. binding 없는 R2는 REVIEW_REQUIRED이며 R3/UNKNOWN·다른 role/run·QUICK 혼합·보호 경로는 실행하지 않는다.
- StateStore는 R2 ALLOW intent 전에 저장된 STANDARD/R2·RUNNING·IMPLEMENT·attempt·active Developer와 마지막 Developer session 참조를 확인한다. R2 obligation의 risk/workflow를 낮춰 저장하지 못한다. binding만 위조해 durable R1 run의 R2 실행을 열 수 없다.

### 완료·Reviewer·상태·이벤트

- coding/reasoning profile/model/auth를 첫 mutation 전에 확인한다. Reviewer는 기존 새 read-only SDK 세션과 명시적 실제 diff/검증 자료를 사용하며 Developer reasoning을 받지 않는다.
- Kernel은 현재 회차의 서로 다른 Developer/Reviewer session ID·파일, 필수 checks/live inspection, 정확한 handoff/requirements·Review PASS·SELF_CHECK/TEST·최신 digest를 모두 요구한다. session callback 누락, 같은 ID/파일, 이전 회차 참조, 자연어 PASS, stale 결과와 저장 실패는 완료 불가다.
- REVISE는 기존 한도 1회를 유지하며 새 Developer/Reviewer 등록이 필요하다. BLOCK·한도 초과는 최종 TEST/COMPLETE로 넘어가지 않는다. 실패·취소 후 변경을 재수집하고 partial mutation과 검증 상태를 보고하며 rollback하지 않는다.
- 기존 Run/Review/PolicyDecision/Action 포맷과 STANDARD Step/attempt/RuntimeEvent를 재사용했다. R2 전용 상태 저장소·증거 엔진·event bus·승인 token은 없다. Runtime에 전달하는 SDK payload에는 R2/reviewRequired context만 추가했다.
- 네 명령에 R2 분류 근거와 `Review enforcement: REQUIRED (STANDARD/R2)`를 표시한다. 실행 중 R2 거부는 신뢰된 Policy의 risk/decision/reason을 최종 오류로 전달한다. Provider 원문/credential 로그는 전달하지 않는다.

### 이번 변경 파일

- `packages/company-runtime/src/{policy,agent-runner,agent-tools,workflow,extension,workspace,verification}.ts`: run binding, R2 file risk 하한, 기존 실제 실행·evidence 연결과 최소 상태/거부 사유 출력.
- `packages/company-runtime/src/kernel.ts`: R2 시작/완료 guard, 현재 회차의 독립 session 증거 관리. `CompletionEvidence` 타입만 보완하며 Host/SDK 타입은 import하지 않는다.
- `packages/company-runtime/src/state-store.ts`: durable R2 obligation/intent 검사. 기존 lock·atomic writes·recovery 방식은 유지했다.
- 신규 `packages/company-runtime/test/r2-review.test.ts`, `packages/coding-agent/test/suite/company-runtime-r2.test.ts`.
- 기존 `packages/company-runtime/test/kernel.test.ts`: S1 R2 fake에 live evidence·session registration을 제공해 강화된 조건으로 독립 Reviewer 규칙을 계속 검증한다.
- 기존 `packages/coding-agent/test/suite/company-runtime-workflow.test.ts`, `company-runtime-quick.test.ts`: 일반 R2의 옛 미지원 fixture는 COMPLEX/R2 거부로, QUICK R2 거부는 명시적 QUICK 설정으로 정정했다. STANDARD/QUICK의 기존 성공·실패 assertion은 유지했다.
- 문서: `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`.
- 이번 S5B에서 MASTER_SPEC/ARCHITECTURE/DECISIONS, Pi Core, dependency/lockfile, config schema, RuntimeEvent 정의, process runner/path inspector는 변경하지 않았다. 별도 ADR이 필요한 새 아키텍처를 도입하지 않았다.

### 이번 작업의 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# root
npm run check
git diff --check
```

- 최종 targeted tests(17:30 KST): Runtime **12개 파일·340개**, coding-agent **5개 파일·182개**, 합계 **17개 파일·522개 통과**. R2 신규 unit 38개 + faux integration 38개 = **76개**. LOG-008의 446개는 S5A 당시 결과이며 전체 저장소 suite 수가 아니다.
- R2 actual manifest/lockfile mutation·audit·독립 PASS, 초기 QUICK/R2의 STANDARD 선택, REVISE→PASS/한도 초과/BLOCK, model/auth 누락, 자연어·stale review·누락/재사용 참조·이전 회차 참조, SELF_CHECK/TEST 실패·digest 변경·저장 실패를 검증했다.
- 모든 Step 취소, live Reviewer/final-check 취소·lock 경합, dirty tracked/staged/untracked, 보호 경로/상위 경로, R3/COMPLEX 차단, binding mismatch·durable R1 거부·R2 obligation downgrade 거부와 네 명령 composition도 검증했다.
- S0~S5A와 기존 Pi AgentSession prompt suite를 이번에 다시 실행했다. R0/R1 STANDARD·QUICK의 검증/정책/lifecycle을 회귀시키지 않았음을 이 targeted 범위에서 확인했다.
- root check 최종(17:33 KST) 통과, Biome 자동 수정 없음. 앞선 자동 포맷 결과도 확인했다. build·전체 npm test/Vitest suite·실제 유료 Provider·실제 package install은 실행하지 않았다.
- 최종 `git diff --check`, 변경 문서 상대 링크/fence/공백·LOG-001~009 고유 ID·S5A~S5D 소제목 검사 통과. 새 untracked R2 테스트 공백도 별도 검사했으며 임시 checker는 제거했다.

### 실제 Pi interactive smoke

- interactive-testing skill의 80×24 tmux에서 `pi-test.sh`를 사용했다. 임시 Extension을 `-e`로 명시 로드하고 같은 registerCompanyRuntime에 기존 suite harness/faux ModelRuntime을 주입했다.
- 별도 HOME/agentDir·`env -i`·`--offline --approve --provider faux --model coding --no-session`과 네 개의 임시 Git fixture를 사용했다. 실제 인증 정보/원격 추론/유료 token은 사용하지 않았다.
- PASS: STANDARD/R2·서로 다른 역할 세션 2개·SELF_CHECK/TEST PASS·COMPLETED 확인.
- REVISE→PASS: 회차 1, 새 세션 포함 총 4개, checks PASS 3개·COMPLETED 확인.
- BLOCK: REVIEW/BLOCKED, SELF_CHECK만 PASS, manifest/lockfile partial changes yes 확인.
- live Reviewer cancel: REVIEW/CANCELLED, 부분 변경·mandatory review 표시 및 reload 후 `/risk` 저장 상태 조회 확인. `/workflow status`, `/team`, `/state`, `/risk`도 확인했다.
- 종료 후 각 fixture의 Run risk/workflow/session/action/check와 writer.lock 부재를 검사했다. 설치된 node_modules가 없음을 확인하고 tmux·임시 fixture/script를 제거했다. 실제 작업 저장소 `.ai`는 생성하지 않았다.

### 문제와 해결·남은 제한

- R2 Policy의 ALLOW만으로는 저장된 run이 R1인지 알 수 없으므로 StateStore의 실제 run 검사도 필요했다. 잘못된 durable owner에서 executor 호출 0을 검증했다.
- 단순한 Reviewer PASS 데이터는 현재 회차의 독립 세션 실행을 증명하지 못한다. Kernel이 callback으로 등록한 현재 Developer/Reviewer 참조를 보유하고, 새 IMPLEMENT 때 이전 Reviewer 참조를 비우도록 했다. REVISE 후 등록을 생략한 SDK fixture로 COMPLETE 차단을 확인했다.
- Policy 거부를 SDK의 일반 tool-error 문구로만 보고하면 R2 재실행 필요가 숨겨졌다. 신뢰된 Policy 문자열만 별도 전달하여 해결했다. 원격 Provider 오류 로그를 그대로 노출하는 변경은 아니다.
- R2의 모든 의미적 위험이나 dependency 설치 상태를 증명하는 기능은 아니다. manifest/lockfile 텍스트 변경과 명시적 사용자 check만 지원한다. 실제 lockfile 생성·패키지 설치/호환성 검증은 별도 사용자 구성·권한이 필요하다.
- 등록 check는 trusted code이며 변경 가능한 metadata/프로젝트 코드를 읽어 간접 실행할 수 있다. 해당 프로그램의 내부 script·네트워크·설치 동작을 sandbox하지 않는다. 검증 명령과 간접 실행 대상도 사용자가 검토해야 한다. 기존 macOS/POSIX·TOCTOU·비협조 I/O·탈출 daemon·파일 한도를 유지한다.
- action risk가 R2로 승격되어 거부돼도 실행 중 Run risk를 자동 변경하지 않는다. 초기 분류는 Run에, action의 더 높은 risk/거부는 audit와 오류에 남는다. 사용자가 변경을 확인하고 새 R2 run을 시작해야 한다.
- R3 Human Approval, COMPLEX/Lead/Planner, DAG/병렬 실행/T3Code/RPC/Web, 자동 checkpoint/resume/fallback, decisions/log UI polish는 추가하지 않았다.

### 다음 단계와 커밋

**S5C 진입 가능**하다. 사용자 승인 후 제한된 action의 Human Approval binding을 별도 단계로 구현한다. R2 run binding을 Human Approval로 재사용하지 않으며 S4/S5A/S5B 회귀를 계속 유지한다.

**이번 S5B 커밋·푸시: 하지 않음.** S5A 변경과 함께 작업 트리에 남겨둔다.

---

## LOG-010 — S5C: 한정 R3 Human Approval

- **기록일:** 2026-09-15 18:28 (KST)
- **상태:** 완료 — Git 추적 텍스트 파일 한 개 삭제에만 실제 인간 승인을 연결했다. 범용 R3 실행은 미지원이다.
- **목적:** R2 실행 binding이나 일반 run 확인을 인간 승인으로 오인하지 않고, 실행 직전 exact/expiring/one-use consent를 강제한다. S4/S5A/S5B 회귀가 우선이다.
- **시작 상태:** devlop, HEAD `e80d97272`. S5A/S5B의 기존 미커밋 tracked/untracked 변경을 보존했다.

### 지원 범위와 설계

- 지원 grammar: `Delete file <literal 상대 경로>`, `Remove file <literal 상대 경로>`, `파일 삭제 <literal 상대 경로>`.
- clean Git baseline에서 추적 중인 256 KiB 이하 일반 UTF-8 파일 한 개만 대상으로 한다. 기존 allowed/protected 경로 규칙, symlink/hardlink/특수 파일 거부를 유지한다. Runtime/.git/알려진 credential·dependency manifest, node_modules, 디렉터리·대량 삭제·임의 shell·배포는 승인으로 열리지 않는다.
- R3 Developer는 read/search, runtime_delete, check 요청, structured handoff만 사용한다. 일반 write/edit가 없다. R3 scope는 run ID/대상에 고정하고 R2/QUICK binding과 혼합하지 않는다. R3도 coding/reasoning 모델·인증과 독립 Reviewer가 필요하다.
- 실제 삭제를 포함하지만 개발 중 effect는 테스트가 새로 만든 temporary Git fixture에만 적용했다. 사용자 저장소 파일 삭제·실제 deploy/install·유료 inference는 수행하지 않았다.

### 승인 binding과 실행 경계

- ApprovalRequest/Decision/Record schema와 기존 ApprovalPort를 연결했다. run/action ID, role, operation, path, file fingerprint/byte 수, step/attempt, revision, action/config digest와 expiresAt을 고정한다. UI 응답은 같은 run/action/digests/expiry와 정확한 boolean 승인만 수락한다.
- Kernel은 PENDING 기록을 저장하고 WAITING_APPROVAL로 진입한 뒤 Host authority를 호출한다. 기본 TTL은 30초, Host의 approvalTimeoutMs는 1~60,000ms다. YAML 권한 완화 옵션은 추가하지 않았다. worker 총 timeout도 적용된다.
- 거절·UI 부재/오류·취소·만료·잘못된 binding·늦은 긍정 응답은 실행 허가가 아니다. timeout/cancel은 signal을 통해 UI를 닫고, 비협조 authority의 늦은 응답도 재사용하지 않는다.
- ALLOW 전후에 Policy와 StateStore가 정확한 승인/현재 R3 Developer/단계/expiry를 검사한다. 실제 unlink 직전 파일 dev/ino/mode/size/mtime/ctime/bytes hash, 정규화 config, signal과 만료를 다시 확인한다. 마지막 확인부터 unlink까지 JS yield는 없지만 외부 syscall 경합까지 원자적이라는 주장은 하지 않는다.
- 고유 action ID의 durable prepare/finish가 재사용을 막는다. action SUCCEEDED가 저장된 뒤에만 승인 CONSUMED 기록을 저장한다. ledger의 request metadata/과거 기록은 수정·삭제할 수 없고 허용된 상태 전이만 가능하다.
- 재시작 시 미완료 PENDING/APPROVED grant는 INTERRUPTED로 남고 자동 재승인·실행·resume하지 않는다. 취소/실패 뒤 approval과 실제 effect의 기록을 구분한다.

### 완료·관찰·UI

- 소비된 승인 없이 SELF_CHECK로 넘어가지 않는다. 실제 단일 삭제 diff, 구조화 handoff/요구사항, 현재 회차의 다른 Developer/Reviewer session ID·파일, 독립 PASS, 필수 SELF_CHECK/TEST와 최신 digest가 모두 있어야 Kernel만 COMPLETE를 저장한다.
- R3 revision 한도는 0이다. REVISE/BLOCK은 중단하며 인간 승인으로 재작업/복원 권한까지 주지 않는다. 승인 후 Provider/check/storage 실패는 이미 삭제된 파일을 partial changes로 보고하며 rollback하지 않는다.
- 기존 RuntimeEvent에 ApprovalRequested/Resolved/Consumed를 연결하고 (runId, stepId, attempt)·sequence·저장 후 발행을 유지했다. 전체 대화/승인 원문 UI 로그를 state에 복제하지 않고 구조화 metadata만 저장한다.
- Pi UI는 project/run/role/step/target/bytes/fingerprint/action/expiry와 No rollback 안내를 표시한다. 기본 선택은 Deny이고 Approve once를 명시적으로 골라야 한다. `--approve`의 project trust나 초기 check 확인으로 R3 승인을 대체하지 않는다.
- modal이 열려 있을 때 터미널 입력은 dialog 선택/Esc/ctrl+c가 우선이며 Esc는 이번 승인 거부다. Host의 status/cancel 및 lifecycle은 계속 동작하고 pending UI/worker를 signal로 정리한다. 다른 단계에서 부모 Esc가 worker를 자동 취소한다고 가정하지 않는다.

### 변경 파일

- 신규 `packages/company-runtime/src/approval.ts`: 제한된 scope 선택, exact decision 검사, 시간 제한/취소/늦은 응답 무효화. Pi/파일 시스템 구현을 import하지 않는다.
- `src/{contracts,ports,events,classification,kernel}.ts`: 승인 schema/Port/callback, 단일 삭제 분류, WAITING_APPROVAL/ledger/event와 소비 증거 완료 guard.
- `src/{policy,state-store,agent-runner,agent-tools}.ts`: bound deletion operation, SDK callback 분리, fingerprint/config 재검사, 실제 unlink, durable approval/intent/consumption/recovery 검사.
- `src/{workspace,verification,workflow,extension}.ts`: tracked 대상 preflight·삭제 diff, 기존 검증기/순차 owner 재사용, human UI·deadline·lifecycle·상태 표시.
- 신규 테스트 `packages/company-runtime/test/approval.test.ts`, `packages/coding-agent/test/suite/company-runtime-approval.test.ts`.
- 문서 `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`.
- MASTER_SPEC/ARCHITECTURE/DECISIONS, Pi Core, dependency/lockfile, config YAML schema, process runner/path inspector는 변경하지 않았다. ADR-004/006/008/011의 기존 승인·상태·증거·Host 경계를 구현했으며 별도 ADR/범용 승인 서버/Event Bus를 만들지 않았다.

### 이번 작업의 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# root
npm run check
git diff --check
```

- 최종 targeted tests(18:27 KST): Runtime **13개 파일·383개**, coding-agent **6개 파일·225개**, 합계 **19개 파일·608개 통과**. S5C 신규 unit 43개 + faux integration 43개 = **86개**. LOG-009의 522개는 S5B 당시 결과이며 전체 저장소 suite 수가 아니다.
- 승인/거절/부재/오류/expired/취소/다른 binding/late consent, target/config/symlink 재검사, 승인 뒤 저장 지연으로 만료, 중복 delete, 소비 callback 누락, handoff-only 우회, 보호·미추적 대상, R3 write/edit/bash 미노출, 독립 BLOCK/REVISE, 필수 checks/stale diff/Provider/intent·consumption·COMPLETE 저장 실패를 검증했다.
- durable replay·expiry·digest mismatch·ledger 변조·소비 증거 위조·재시작 미완료 grant 중단, live final-check 취소, pending approval의 status 조회·Host shutdown, 기본 Deny/명시적 승인 UI composition을 검증했다.
- S0~S5B와 기존 AgentSession prompt 회귀도 이번에 다시 통과했다. root check 최종(18:32 KST)은 TypeScript/deps/entry graph/shrinkwrap/install lock/browser smoke를 포함해 통과했고 Biome 자동 수정이 없었다. 앞선 자동 포맷 결과도 확인했다. build·전체 npm test/Vitest suite·유료 Provider·실제 install/deploy는 실행하지 않았다.
- 최종 `git diff --check`, 문서 상대 링크/fence/공백·LOG-001~010 고유 ID·S5A~S5D 제목 검사 통과. 신규 untracked approval 소스/테스트 공백도 별도 검사했으며 임시 checker는 제거했다.

### 실제 Pi interactive smoke

- interactive-testing skill의 80×24 tmux에서 `pi-test.sh`와 명시적 `-e` wrapper를 사용했다. 기존 suite harness/faux ModelRuntime만 주입하고 **human ApprovalPort는 실제 Extension UI 그대로** 사용했다.
- 별도 HOME/agentDir, `env -i`, `--offline --approve --provider faux --model coding --no-session`, 새 Git fixture 4개를 사용했다. `--approve`를 줬어도 별도 R3 선택 창이 열리고 승인 전 파일이 존재함을 확인했다.
- allow: 기본 Deny 화면의 대상/fingerprint/expiry를 확인한 뒤 Down → Approve once. 삭제 1회, CONSUMED, Developer/Reviewer 세션 2개, checks PASS 2개와 COMPLETED 확인.
- deny: 기본 선택에서 Enter. DENIED/BLOCKED, 원본 파일 유지, 실행 action/검증 없음. reload 후 `/state`에서도 DENIED를 확인했다.
- escape: 승인 modal에서 Esc. DENIED/BLOCKED와 원본 유지 확인.
- expire: 테스트 Host TTL 1,200ms를 사용해 선택하지 않고 대기. EXPIRED/BLOCKED와 원본 유지 확인.
- `/team`, `/risk`, `/state` 출력도 확인했다. 종료 뒤 네 fixture의 approval/run/action/check/session/file 상태와 writer.lock 부재를 검사한 후 tmux·임시 fixture/script를 제거했다. 실제 저장소 `.ai`는 생성하지 않았다.

### 문제와 해결·남은 한계

- 첫 integration에서 중복 delete의 audit 길이를 1로 기대해 실패했다. 구현은 승인된 삭제 SUCCEEDED 1개와 두 번째 요청 DENIED 1개를 남겼다. 실행이 한 번인지와 거부 기록을 구분하도록 기대값을 수정하고 전체 테스트를 다시 통과했다.
- 승인 시점과 effect 시점 사이에 저장이 yield할 수 있으므로 human answer만 검사해서는 부족했다. durable prepare와 최종 fingerprint/config/signal/expiry 확인을 함께 적용했다. 긍정 응답 후 저장 지연으로 만료되는 테스트도 포함했다.
- 승인 소비를 callback 주장만으로 저장하면 실행 없이 CONSUMED를 꾸밀 수 있었다. StateStore가 동일 action의 SUCCEEDED를 확인하도록 했고 위조 소비를 거부했다.
- ApprovalPort는 신뢰된 Host authority다. 악성 같은-process 코드가 authority/UI를 위조하는 것을 막는 OS 보안 경계나 다중 사용자 인증 서버는 아니다. 경로/파일 종류 식별은 기존 명시적 allow/protect 규칙이며 숨겨진 비밀이나 모든 dependency 형식을 의미적으로 판별하지 않는다.
- 단일 텍스트 파일 삭제만 지원한다. R3 재작업·자동 복원/rollback, 범용 shell·배포·대량 삭제·설치, checkpoint/resume/parallel/COMPLEX/DAG/RPC/Web은 추가하지 않았다.
- unlink와 state/tasks 저장은 다중 transaction이 아니다. 파일 삭제 후 I/O 실패가 남을 수 있으며 partial changes/audit를 사용자가 확인해야 한다. 외부 TOCTOU·탈출 daemon·비협조 I/O·전원 장애 내구성 등 기존 한계는 유지한다.
- 승인 gate는 Runtime의 delete tool을 보호한다. 등록된 verifier 프로그램은 여전히 trusted code이며 내부의 임의 I/O/네트워크를 sandbox하지 않는다. consumed deletion 기록 전에는 checks를 시작하지 않지만 프로그램 내부 부작용까지 가로채는 기능은 없다.
- 승인 대기 동안 worker 전체 실행 한도도 흐른다. UI timeout은 1회 consent의 기한이며 모든 비협조 외부 작업을 그 시간 안에 강제 종료한다는 보장은 아니다.

### 다음 단계와 커밋

**S5D 진입 가능**하다. 사용자 승인 후 Commands/State/Decision polish를 진행하며 STANDARD/QUICK/R2/한정 R3 회귀를 유지한다. 전체 V0.1 완료나 범용 R3 권한 해제를 주장하지 않는다.

**이번 S5C 커밋·푸시: 하지 않음.** 기존 S5A/S5B 변경과 함께 작업 트리에 보존했다.

---

## LOG-011 — S5D: Commands / State / Decision polish

- **기록일:** 2026-09-15 19:51 (KST)
- **상태:** 완료 — 읽기 전용 조회, 구조화 운영 결정/검증 projection과 기존 revision 설정 연결. S6는 미착수.
- **목적:** 상태를 보는 행위가 복구/승인/실행을 바꾸지 않게 하고, 현재·저장·실패 결과를 구분하여 조회한다. S4/S5A/S5B/S5C 회귀 방지가 우선이다.
- **시작 상태:** devlop, HEAD `e80d97272`; 기존 S5A~S5C의 미커밋 tracked/untracked 변경을 보존했다.

### 명령과 읽기 전용 경계

- `/workflow status [runId]`, `history [page]`, `config`; `/state [runId]`, `checks [runId] [page]`, `check <number> [runId]`, `review [runId]`, `decisions [runId] [page]`; `/team [runId]`, `/risk [runId]`, 각 help를 연결했다. 생략/latest는 최신 run이며 unknown ID/check/page는 오류다.
- FileStateStore.readSnapshot은 state source를 안전하게 읽을 뿐 lock 생성/탈취, mkdir, tasks repair, interruption/grant recovery를 수행하지 않는다. 다른 writer의 atomic 저장과 동시에 읽을 수 있다. state가 없거나 손상되면 projection이나 이전 성공 cache로 대체하지 않는다.
- UI에 source·recorded 시각·현재 filesystem/check 미재검증을 표시한다. writer.lock은 존재 여부일 뿐 생존 증명이 아니다. 외부 owner의 stored active 상태는 liveness unconfirmed이며 취소는 owner Pi에서 해야 한다.
- 현재 local 저장 실패가 durable snapshot과 다르면 local 실패를 우선 표시하고 durable 상태를 함께 알린다. 원본이 손상된 경우 이전 cached COMPLETE를 보여주지 않는다. tasks 불일치는 진단만 출력한다.
- 조회는 config/provider/auth 없이 동작한다. `/workflow config`만 현재 설정을 별도 검사하고 active run의 frozen config가 아님을 표시한다. 출력은 pagination/크기 제한, terminal/bidi escaping을 적용한다. Pi JSONL을 열거나 전체 대화/usage를 복제하지 않는다.

### 기록과 revision

- Run에 적용된 `maxRevisionCycles`, 구조화 Developer `handoff`, 수락된 회차별 `reviewHistory`를 저장한다. REVISE/BLOCK도 잃지 않는다. 새로운 actual CheckResult에는 step/attempt를 기록하며 Kernel이 envelope와 일치하는지 검사한다.
- 기존 config의 STANDARD 재작업 0~3을 Host 실행에 연결했다. 기본 1은 그대로다. QUICK/한정 R3는 effective 0이며 R3 승인으로 재작업을 열지 않는다. 3회 REVISE→PASS 및 한도 초과, QUICK/R3 0회 고정을 faux로 검증했다.
- 운영 결정은 classification, review, approval, policy action, outcome의 안정적 ID로 표현한다. 기술적 ADR을 LLM로 새로 추론하는 기능은 아니다. 체크의 stage/timing/limit가 이전 기록에 없으면 not recorded로 표시한다.
- 관찰 event delivery 실패는 local diagnostics로만 표시하며 execution result를 바꾸지 않는다. 순차 Step/attempt/RuntimeEvent와 기존 completion/Policy/Approval guard는 유지했다.

### 명시적 export와 파일 소유권

- `/state export`는 idle/terminal source에서 owned writer로 `.ai/decisions.md`와 `.ai/logs/checks.json`을 생성한다. 자동 export/자동 gitignore/자동 commit은 하지 않는다. export-only open은 active source를 거부하고 interruption recovery와 tasks repair도 건너뛴다.
- 원본은 계속 state.json이다. 파생본에는 source revision/hash, 생성 marker/body checksum이 있고 동일 source 재export는 무변경이다. 사용자 수동 파일 또는 수정되어 checksum이 깨진 파일, unsafe 경로는 덮어쓰지 않는다. 강제 overwrite 옵션은 없다.
- 파일별 temp/write/sync/rename과 parent/target/ownership 재검사를 사용한다. 한 파일만 갱신되고 다음 파일이 실패할 수 있으므로 전체 transaction으로 주장하지 않는다. export 실패가 완료된 Run을 실패로 재기록하거나 source를 바꾸지 않으며 재export할 수 있다.
- 실제 source state/approval/verification을 파생 파일에서 복원하지 않는다. Markdown은 데이터의 markup/control을 escape하며 logs JSON에는 기존 bounded check evidence만 담는다. transcript/전체 diff는 추가 복제하지 않는다.
- Git evidence는 정확한 두 generated 경로의 온전한 marker/checksum만 조건부 제외한다. tracked generated view는 거부하고, 수동 내용/깨진 checksum은 일반 evidence로 수집한다. Git ignored checks.json의 수동 변경도 감지한다. `.ai`/logs 디렉터리 전체를 무조건 제외하지 않는다.

### 변경 파일

- 신규 `packages/company-runtime/src/observations.ts`: 작은 observation DTO, safe/bounded command views, history/config/check/review/decision 렌더링.
- 신규 `src/observation-files.ts`: 고정 export 경로의 안전한 읽기, generated ownership/checksum, deterministic output과 원자 파일 교체.
- `src/{contracts,kernel,verification}.ts`: 최소 metadata 저장, review 회차 보존과 check step 일치 검사. 추가 저장 전이를 늘리기보다 기존 save payload에 포함했다.
- `src/{state-store,workspace,workflow,extension}.ts`: readonly snapshot/export-only ownership, 조건부 Git 제외, 실제 revision 설정, 명령/diagnostics·lifecycle 연결.
- 신규 `test/observations.test.ts`, `test/observation-files.test.ts`, `packages/coding-agent/test/suite/company-runtime-observations.test.ts`.
- 문서 `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`.
- 이번 S5D에서 MASTER_SPEC/ARCHITECTURE/DECISIONS, Pi Core, dependency/lockfile, config schema, Policy/Approval 집행 로직·worker 도구·RuntimeEvent 정의·process runner/path inspector는 변경하지 않았다. 별도 graph/event sourcing/서버/SQLite 아키텍처를 만들지 않았으므로 새 ADR은 추가하지 않았다.

### 이번 작업의 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# root
npm run check
git diff --check
```

- 최종 targeted tests(19:50 KST): Runtime **15개 파일·419개**, coding-agent **7개 파일·236개**, 합계 **22개 파일·655개 통과**. 신규 unit/filesystem 36개 + faux integration 11개 = **47개**. 앞서 보고한 654개에 export-only tasks 미수정 테스트 1개를 추가한 최종 수치다. LOG-010의 608개는 당시 결과이며 전체 저장소 suite 수가 아니다.
- 조회 무변경/atomic writer 병행 읽기/복구 금지/unsafe source·손상·orphan 거부, stage/timing/output/페이지/출처/제어문자, generated idempotence·수동/수정 파일·symlink·rename 직전 교체·부분 export 실패·source 불변을 검증했다.
- Git의 generated 조건부 제외·tracked 생성 파일 거부·수동/ignored 파일 변경 감지, configured revision3/한도 초과/QUICK·R3 0, review/handoff/check metadata, 다른 owner의 pending approval 조회, model 호출 없는 query/export, local 실패와 durable 차이·성공 cache 뒤 corruption도 검증했다.
- 기존 S0~S5C와 Pi AgentSession prompt 회귀를 이번에 다시 실행했다. root check 최종(19:53 KST) 통과, Biome 자동 수정 없음. 앞선 자동 포맷 결과도 확인했다. build·전체 npm test/Vitest suite·유료 Provider·실제 install/deploy는 실행하지 않았다.
- 최종 `git diff --check`, 문서 상대 링크/fence/공백·LOG-001~011 고유 ID·S5A~S5D 제목 검사 통과. 새 untracked observation 소스/테스트 공백도 검사했으며 임시 checker는 제거했다.

### 실제 Pi interactive smoke

- interactive-testing skill의 80×24 tmux, `pi-test.sh`, 명시적 `-e` wrapper와 기존 suite harness/faux ModelRuntime을 사용했다. 별도 HOME/agentDir·`env -i`·offline·temporary Git fixture만 사용했다.
- `/workflow config`는 source state를 생성하지 않았고 STANDARD 3 / QUICK·R3 0을 정확히 표시했다.
- 실제 run은 REVISE 3회 뒤 PASS/COMPLETED, code revision3, Developer/Reviewer session 총8개, actual checks5개를 기록했다.
- `/workflow status`, history, `/team`, `/risk`, `/state checks`, check5의 stdout/stderr/step/시간, review 이력, decisions page2를 확인했다.
- `/state export` 첫 호출 updated2, 같은 source 재호출 updated0을 확인했다. 조회/export 전후 state.json SHA-256이 동일했고 config/gitignore를 자동 수정하지 않았다.
- 생성된 decisions를 테스트용 USER_MANUAL_NOTES로 바꾼 뒤 재export가 거부되고 내용이 유지됨을 확인했다. reload 후 저장 review/history 조회와 잘못된 check 번호 오류도 확인했다.
- run의 faux inference는 9회였고 observations/export 때문에 추가되지 않았다. source bytes 불변·manual notes 보존·writer.lock 부재를 검사한 뒤 tmux와 임시 fixture/script를 제거했다. 실제 저장소 `.ai`는 생성하지 않았다.

### 문제와 해결·남은 한계

- 초기 check가 새 integration test의 미사용 import 2개를 지적했다. 저장 실패/corruption 검증을 완성하고 최종 check를 통과했다.
- 초기 integration은 Markdown의 UUID 하이픈 escape 때문에 raw stable ID를 찾지 못했다. newline/control/markup escaping을 유지하면서 안전한 하이픈·점은 그대로 출력하도록 수정했고 전체 테스트를 다시 통과했다.
- 단순 snapshot 조회에서 FileStateStore.open을 쓰면 lock/recovery/repair가 발생하므로 별도 readonly 경계를 만들었다. export-only open도 tasks를 고치지 않도록 명시적으로 분리했다.
- generated 출력 전체를 무조건 Git에서 제외하면 수동 변경을 숨길 수 있으므로 exact path + ownership/checksum을 사용했다. checksum은 accidental modification 구분이며 악성 동일 사용자에 대한 인증 서명/OS sandbox는 아니다.
- export는 운영 결정의 projection이지 기술 ADR 작성·전체 RuntimeEvent 로그·자동 archive가 아니다. 수동 decisions 파일은 보존되지만 CLI decisions는 state 기반 운영 기록을 보여준다. 필요 시 사용자가 수동 파일을 별도로 관리해야 한다.
- snapshots는 당시 저장 사실이며 live diff/check 또는 다른 프로세스 생존 증명이 아니다. local diagnostics는 reload 후 사라질 수 있고, state/tasks가 원자적 한 묶음이 아니므로 부분 저장/일시 불일치 경고를 확인해야 한다.
- output/source/export 크기 한도와 외부 TOCTOU·비협조 I/O·POSIX/단일 writer·R3 한정 범위는 유지한다. exporter는 민감한 check output을 자동 탐지하지 않으므로 파생 파일을 공개/commit하기 전에 검토해야 한다.
- S6 hardening, 범용 R3, COMPLEX/Lead/Planner, DAG/RPC/Web/parallel, 자동 resume/checkpoint/fallback은 구현하지 않았다.

### 다음 단계와 커밋

**S6 진입 가능**하다. 사용자 승인 후 실패·복구·플랫폼/lifecycle 경계와 전체 V0.1 DoD 추적을 hardening한다. S5D 완료를 전체 V0.1 완료나 전체 저장소 회귀 없음으로 확대 해석하지 않는다.

**이번 S5D 커밋·푸시: 하지 않음.** 기존 S5A~S5C 변경과 함께 작업 트리에 보존했다.

---

## LOG-012 — S6: V0.1 실패 경계 Hardening

- **기록일:** 2026-09-16 09:28 (KST)
- **상태:** 완료 — 신규 제품 기능/권한 확대 없이 기존 기능의 실패 경계를 보강했다. V0.1 release 선언 아님.
- **목적:** Provider/process/storage/approval/freshness/lifecycle 실패에서 완료를 위조하거나 자원 종료 전에 writer lease를 해제하지 않도록 검증한다.
- **시작 상태:** devlop clean, HEAD/origin `fa83746a170c26074f460eb42afa16b42197fe9c`. 앞선 S5A~S5D 변경은 사용자 요청으로 커밋/푸시된 상태다. 이전 LOG의 커밋 미실행 표시는 각 작업 당시 기록으로 유지한다.
- **환경:** Darwin arm64, Node v26.7.0, 로컬 Git/파일 시스템/POSIX process group. 다른 OS나 실제 Provider를 테스트한 결과로 확대하지 않는다.

### 발견 문제와 수정

1. **저장 실패의 조기 unlock:** Store.fail이 tool result 저장 실패에서도 즉시 lock을 지워 SDK cleanup 이전에 다른 writer가 들어올 수 있었다. 실패 시 mutation만 닫고, 실행 소유자가 자원 종료 후 close하도록 변경했다. open 실패처럼 worker가 아직 없는 경로는 기존 자체 정리를 유지한다. 동시 close도 같은 promise로 합쳐 두 번째 해제가 새 writer의 lock과 경합하지 않게 했다.
2. **정산과 종료 확인 혼동:** SDK abort/dispose 실패 또는 process runner 예외에서도 호출 promise가 끝났다는 이유로 unlock될 수 있었다. 작은 safeToRelease 상태와 ProcessCleanupError로 미확인을 owner까지 전달한다. 불확실하면 다음 역할/COMPLETE·추가 Git 수집을 막고 lock을 유지하며 changedFiles 수집 불완전을 표시한다.
3. **Git process 예외 누락:** preflight에서 GitWorkspace 객체 반환 전 cleanup 오류도 lease 보존 대상이 되게 했다. COMPLETE 뒤에는 별도 Git process를 다시 시작하지 않고 완료 직전 검증한 snapshot을 보고한다.
4. **check/cancel 및 partial persistence:** check settlement 전 취소는 PASS가 아니며, audit finish 실패를 두 번째 finish로 재시도해 원래 partial commit 오류를 덮지 않게 했다. pipe error도 종료 요청 사유로 처리한다.
5. **이전 attempt 참조:** session ID가 달라도 이전 sessionFile을 재사용하면 Kernel이 거부한다.
6. **FIFO/config 파일 경계:** no-follow descriptor에 POSIX nonblocking을 추가하고 regular-file 검사를 유지해 FIFO open 대기를 피한다. config directory/file identity·크기도 검사한다. Windows owner 실행은 lock 획득 전에 명시적으로 거부하며 Windows 구현을 추가하지 않았다.

정상 정리는 `cancel signal → SDK/process 종료 확인 → terminal state 저장 → lock release`다. cleanup 미확인 또는 state 저장 불가에서는 failure 진단/기존 PREPARED 기록과 lock이 남을 수 있으며, 이를 성공이나 미실행으로 추정하지 않는다. 확인 가능한 SDK 작업/원래 process group 밖의 daemon·악성 Node I/O를 격리하지는 않는다.

### 변경 파일

- `packages/company-runtime/src/{state-store,ports,agent-runner,verification,workflow,workspace,kernel,process-runner}.ts`: mutation 차단과 lease 수명 분리, cleanup 확인/전파, cancel/finish 경계, 참조 재사용 guard.
- `src/{agent-tools,observation-files,config}.ts`: no-follow/nonblocking descriptor와 config identity/size 검사. 도구 종류·R3 승인 scope·config schema는 넓히지 않았다.
- `test/state-store.test.ts`: 실패 시 lease가 owner close까지 유지되는 강화된 계약에 맞춰 assertions를 갱신했다. invalid/partial state 거부·복구 검증은 유지한다.
- 신규 `test/hardening.test.ts`, `test/kernel-hardening.test.ts`, `packages/coding-agent/test/suite/company-runtime-hardening.test.ts`.
- 문서 `docs/V0.1_READINESS.md` 신규, `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md` 갱신.
- MASTER_SPEC/ARCHITECTURE/DECISIONS, Pi Core, dependencies/lockfile, 제품명/패키지명, SDK/Host 경계와 순차 Workflow는 유지했다. 신규 DAG/RPC/Web/Lead/Planner/COMPLEX/parallel/generic R3/resume/fallback/SQLite/OS sandbox를 추가하지 않았다.

### 이번 작업의 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: Runtime + 기존 prompt
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# packages/coding-agent: 추가 기존 Pi 회귀 (Company Extension 미등록)
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- 최종 실행(09:36 KST): Runtime **17개 파일·453개**, 관련 coding-agent **8개 파일·287개**, 합계 **25개 파일·740개 통과**. S6 신규 unit/process/crash23개 + kernel11개 + SDK/lifecycle51개 = **85개**이며 기존655개를 이번에 다시 실행했다. 09:16의 최초 전체 통과 뒤 동시 close 검증 1개를 추가하고 모두 재실행한 수치다.
- 추가 기존 Pi runtime/model-extension/retry-events/queue **4개 파일·59개 통과**. 최종 targeted 합계 **29개 파일·799개 통과**, 전체 저장소 suite 수가 아니다.
- Provider 연결/자연어/malformed/stream-aborted 결과를 Developer/Reviewer/Executor에 적용하고 late mutation·SDK cleanup 중 cancel·Reviewer model/auth 실패를 확인했다. 기존 S3 timeout/pre-abort/turn limit/resource isolation 테스트도 다시 실행했다.
- 실제 Node check의 signal exit·stdout/stderr limit·공백 경로·TERM 무시→KILL·group 확인 실패, check settlement/cancel 및 finish 실패 race, 초기 Git cleanup 미확인을 검증했다. SDK abort/dispose 예외와 R1/R3 actual effect 후 실제 rename 실패 중 지연 cleanup에서 lock이 유지됐다.
- 실제 별도 Node 프로세스를 state 저장/tasks 교체 사이 또는 effect/결과 저장 사이에서 종료시켰다. stale lock의 새 writer 획득 거부, 테스트 child 종료 확인 뒤 수동 정리한 owned recovery의 INTERRUPTED, 효과를 SUCCEEDED로 추정하지 않음을 확인했다. 실제 제품에는 자동 stale-lock 삭제를 넣지 않았다.
- approval의 정확한 expiry 경계·same-turn approve/cancel, 기존 target/config/symlink/late/replay/restart/소비 evidence, 실제 chmod 기반 effect 실패와 부분 저장을 검증했다. 이번 권한 오류 테스트는 비특권 macOS 사용자에서 실행됐고 root 환경에서는 명시적 skip 대상이다.
- 이전 Review/check revision·sessionFile·diff, stale QUICK executorDigest, check attempt 위조, terminal commit 전/후 cancel 경계를 검증했다. commit 시작 뒤 늦은 cancel은 이미 수락한 terminal 저장을 rollback하지 않는 것으로 명시했다. observer 오류는 delivery diagnostic이며 rollback으로 위장하지 않는다.
- Developer/Reviewer/check/approval 각각에 cancel/switch/fork/tree/reload/quit를 적용한 **24개 Host-handler lifecycle matrix**에서 cancel→resource 종료→terminal state→unlock 순서를 확인했다.
- root check 최종(09:39 KST) 통과, Biome 자동 수정 없음. 초기 Biome noUnsafeFinally 지적은 cleanup 오류를 finally 밖에서 보고하는 방식으로 수정했으며 suppress/검사 우회는 하지 않았다. 기존 state-store 실패 assertions는 안전한 지연 unlock으로 강화했다.
- 최종 `git diff --check`, 문서 상대 링크/fence/공백·LOG-001~012 고유 ID·readiness의 네 판정 상태 검사 통과. 신규 untracked S6 테스트 공백도 검사했고 임시 checker는 제거했다.
- build·전체 npm test/Vitest suite·실제 GPT/DeepSeek/API·package install/deploy·다른 OS는 미실행이다. 실제 Provider 검증은 별도 RC 단계로 남긴다.

### 실제 Pi interactive faux smoke

- interactive-testing skill의 80×24 tmux, 저장소 `pi-test.sh`, 명시적 `-e` wrapper, 기존 suite harness/faux ModelRuntime을 사용했다. 별도 HOME/agentDir·빈 자격 환경·offline·새 temporary Git fixture 5개였다.
- 성공: STANDARD COMPLETED, SELF_CHECK/TEST PASS와 lock 없음.
- active Developer `/workflow cancel`: IMPLEMENT/CANCELLED, 기존 fixed 부분 변경 유지, Provider의 late write 미실행, lock 없음.
- active Reviewer `/reload`: REVIEW/CANCELLED 저장 후 reload, status에서 늦은 PASS 미사용·부분 변경 확인.
- active verification `/reload`: SELF_CHECK/CANCELLED, check FAIL·lock 없음. 기록한 child process group이 ESRCH이고 5초 지연 write가 없음을 확인했다.
- active R3 approval modal Esc: DENIED/BLOCKED, 삭제 대상 원본 유지. reload 후 `/risk`에서도 DENIED를 확인했다.
- 실제 TUI switch/fork/tree 조작은 이번 smoke에서 하지 않았으며 자동 Host matrix 및 기존 Pi runtime 전환 tests로 구분해 검증했다. approval modal에서는 slash command 입력보다 dialog 응답이 우선한다.
- 각 fixture의 state/file/check/group/lock을 확인한 뒤 tmux·임시 fixture/script를 제거했다. 실제 작업 저장소 `.ai`는 만들지 않았고 실제 Provider 자격/유료 token은 사용하지 않았다.

### DoD / readiness와 남은 제한

- `docs/V0.1_READINESS.md`에 MASTER_SPEC §34를 PASS/PARTIAL/UNSUPPORTED/NOT VERIFIED로 대조했다. 분류 가능과 COMPLEX 실행 미지원, R0~R3 heuristic과 한정 실행, 운영 decisions projection과 기술 ADR 작성, 선택한 Pi 회귀와 전체 suite를 분리했다.
- macOS/Darwin arm64·Node26.7·로컬 POSIX 검증이다. Linux/최소 Node/Bun/다른 파일 시스템·전원 장애는 미검증이며 Windows 실행은 미지원이다. negative PID group, mode/access, no-follow/nonblocking FD, O_EXCL/inode와 atomic rename 가정을 문서화했다.
- Provider/auth/event sink/파일 I/O가 비협조적이면 timeout/cancel 이후에도 정리를 오래 기다릴 수 있다. 종료를 추정해 lease를 해제하지 않는다. 예상 밖 생성/cleanup 예외는 실제 자원이 없어도 보수적으로 lock을 남길 수 있다.
- cleanup 확인은 관리하는 SDK 작업과 원래 POSIX group에 한정된다. 다른 group으로 탈출한 daemon, 같은-process 악성 Host/등록 프로그램 내부 I/O·외부 TOCTOU는 sandbox하지 않는다. lock 유지 오류에서는 실제 resource/owner 확인 전 추가 workspace 작업을 하지 않아야 한다.
- partial state/tasks/효과 저장, terminal commit이 시작된 뒤의 late cancel, snapshot/liveness 구분과 observer best-effort 전달을 명시했다. 자동 rollback/resume/replay나 whole-repo·실제 Provider 안전성은 주장하지 않는다.

### 다음 단계와 커밋

**제한된 V0.1 RC 검증 진입은 조건부 가능**하다. 별도 사용자 승인 후 disposable 프로젝트의 실제 GPT/DeepSeek smoke, 지원 OS/Node 범위, 실제 프로젝트 checks와 설치/취약점/배포 검증 범위를 결정한다. S6 완료만으로 V0.1 release를 선언하지 않는다.

**이번 S6 커밋·푸시: 하지 않음.**

---

## LOG-013 — RC-01: QUICK/R0 정보성 known risk의 완료 의미 수정

- **기록일:** 2026-09-16 12:00 (KST)
- **상태:** 수정 및 자동 회귀 검증 완료. 수정 후 실제 Provider RC 재실행은 대기.
- **목적:** 실제 GPT Provider integration에서 드러난 QUICK/R0 설명 작업의 잘못된 완료 차단만 수정한다. 기능·권한·workflow 범위는 확대하지 않는다.
- **시작 상태:** `devlop` clean, HEAD `5ce99df59`. 작업 요청 cwd는 별도 `weavra-rc-fixture`이고 실제 Kernel은 형제 저장소 `pi/packages/company-runtime`에 있다.
- **환경:** macOS/Darwin arm64, Node v26.7.0. 이번 자동 검증은 로컬 unit 및 기존 suite harness/faux SDK 통합이며 실제 GPT 호출이 아니다.

### 실제 RC 문제와 원인

사용자가 GPT RC-01에서 `QUICK/R0 Explain src/calculator.js`를 실행했다. Provider/Worker, 구조화 Executor 결과, SELF_CHECK, TEST는 정상이었고 파일 변경도 없었다. Executor가 현재 코드의 division-by-zero 미처리를 `known_risks`로 보고하자 Kernel이 `QUICK requirements incomplete or risks unresolved; STANDARD required`로 BLOCKED 처리했다. 이는 사용자 보고로 확인된 실제 Provider integration issue이며 모델 ID·비용/지연은 보고되지 않아 추정하지 않는다.

`assertCanComplete()`의 QUICK 분기가 R0/R1 모두에 `handoff.known_risks.length === 0`을 요구했다. 따라서 설명을 마쳤고 unresolved가 없어도 기존 코드의 정보성 finding 하나만으로 완료가 거부됐다. LOG-008의 당시 모든 QUICK에 대한 known_risks 없음 조건은 이 후속 수정으로 R1에만 적용된다. 이전 이력 자체는 보존한다.

### 변경 파일과 한정된 수정

- `packages/company-runtime/src/kernel.ts`: 기존 조건을 `(evidence.quickScope.risk === "R0" || handoff.known_risks.length === 0)`으로 한정 변경했다. 앞선 trusted scope/workspace 검사와 R0 실제 changedFiles 0 요구는 그대로다. finding을 삭제하거나 필터링하지 않고 executorResult/state에 유지한다.
- `packages/company-runtime/test/quick.test.ts`: R0 known risk 허용/R1 STANDARD 요구를 명시적으로 검증한다. 기존 실패 matrix를 R0/R1에 적용하며 R0에는 known risk를 함께 넣어 unresolved·UNMET/UNVERIFIED·누락/잘못된 requirement·파일 변경·SELF_CHECK/TEST 실패·stale evidence·scope/revision 위반이 계속 차단됨을 확인한다.
- `packages/coding-agent/test/suite/company-runtime-quick.test.ts`: 기존 SDK/harness/faux/Git/verifier로 R0 COMPLETE/COMPLETED와 R1 BLOCKED 회귀 2개를 추가했다. 두 checks PASS, finding 보존, R0 무변경, R1 partial change·STANDARD 안내, durable state·terminal event·writer cleanup을 확인한다.
- `packages/company-runtime/README.md`: QUICK 완료 조건에 R0 finding과 R1 잔여 위험의 차이를 반영했다.
- `docs/V0.1_READINESS.md`, `docs/WORK_LOG.md`: 실제 RC 발견, 원인/수정, 자동 회귀와 실제 재실행 미검증을 구분해 기록했다.

공통 unresolved 0·정확한 requirements/MET, SELF_CHECK/TEST/exit/evidence/digest/state guard는 완화하지 않았다. QUICK/R1은 known risk가 남으면 계속 STANDARD 실행이 필요하다. R2/R3/STANDARD completion guard, Policy/Approval/StateStore/Provider 구현, 분류·prompt·schema는 변경하지 않았다. `weavra-rc-fixture`의 prompt·코드·config·저장된 run을 수정하지 않았다.

### 이번에 실행한 검증

수정 전 새 테스트로 문제를 재현했다:

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/quick.test.ts
# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-quick.test.ts -t 'RC-01'
```

- 수정 전 unit: **68 PASS / 1 FAIL**. R0 known-risk 허용 사례가 기존 STANDARD required 오류로 실패했다.
- 수정 전 신규 통합: **1 PASS / 1 FAIL / 기존 38개 필터 제외**. R0의 예상 COMPLETED 대신 BLOCKED를 확인했고, R1 차단은 이미 통과했다.

Kernel 수정 후 LOG-012와 같은 S0~S6 targeted 및 추가 Pi 회귀를 다시 실행했다:

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# pi root
npm run check
git diff --check
```

- 최종 targeted 결과: Runtime **17개 파일·481개**, 관련 coding-agent **8개 파일·289개**, 추가 기존 Pi **4개 파일·59개**, 합계 **29개 파일·829개 PASS**. 이번에 모두 실행한 결과이며 전체 저장소 suite 수가 아니다. 기존 799개 대비 30개 순증이다.
- QUICK 단위 **69개**, QUICK SDK 통합 **40개**가 위 결과에 포함된다. 수정 전 실패한 R0 사례도 통과했고 R1 known risk는 계속 BLOCKED다.
- `npm run check`: **PASS**, Biome 자동 수정 없음. TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함.
- `git diff --check`: **PASS**. 변경 범위와 fixture working tree 무변경을 확인했다.
- build·전체 npm test/Vitest suite·interactive smoke·실제 GPT/DeepSeek/API 재실행·다른 OS 검증은 이번에 하지 않았다. 사용자 실제 RC 결과를 이번 faux 실행의 성과로 계산하지 않는다.

### 남은 제한·다음 작업·커밋

- 실제 GPT RC-01의 수정 후 성공은 아직 확인하지 않았다. 같은 `Explain src/calculator.js` prompt/config로 새 run을 실행하여 COMPLETE, 실제 changedFiles 0, known risk 보존을 확인해야 한다. 기존 BLOCKED 기록을 성공으로 재작성하지 않는다.
- known risk 허용은 R0 설명 완료의 의미만 바꾼다. 발견한 division-by-zero 결함을 수정했다거나 코드가 위험 없음을 보장하지 않는다. 기존 신뢰된 check·heuristic classification·로컬 filesystem 및 비협조 Provider 한계는 유지한다.
- **다음 작업:** 사용자 환경에서 실제 GPT RC-01 재실행 후 별도 결과 기록. DeepSeek 및 남은 RC 시나리오는 별도 검증한다.
- **커밋·푸시:** 하지 않음.

---

## LOG-014 — RC-04: Reviewer evidence 참조 안내·검증·동일 세션 재제출

- **기록일:** 2026-09-16 13:41 (KST)
- **상태:** 구현·자동 회귀 완료, 실제 GPT RC-04 재실행은 미검증
- **목적:** 실제 GPT STANDARD/R2에서 발견된 Reviewer 참조 오류를 Kernel guard 완화 없이 입력·제출 경계에서 교정 가능하게 한다.
- **시작 상태:** `devlop`, HEAD `5ce99df59`. RC-01의 미커밋 Kernel/QUICK test/README/문서 변경이 이미 있었으며 그대로 보존했다.

### 문제와 한정된 해결

사용자 보고에서 Developer mutation과 SELF_CHECK는 성공했지만 Reviewer의 잘못된 evidence ref 때문에 Kernel이 `Review references unknown or missing evidence`로 BLOCKED했다. 기존 `submit_review`는 identity/diffDigest만 검사한 뒤 구조화 결과를 수락하고 세션을 종료했다. 여기에 membership 검증만 추가해도 Adapter가 모든 Tool error를 치명적 오류로 취급하므로 Reviewer는 수정할 기회를 얻지 못한다.

- `packages/company-runtime/src/agent-tools.ts`: 현재 verifier의 `evidenceRefs` + 각 check의 `evidenceRefs` 합집합을 만드는 helper를 추가했다. `submit_review`에서 top-level/각 requirement membership과 필수 배열의 비어 있음 여부를 검사한다. 잘못된 필드·정확한 trusted 목록·재제출 안내를 Tool error로 반환하며 `submitted`나 `terminate`를 설정하지 않는다. Adapter 내부 call ID 집합으로 이 오류만 1회 식별하고, 모델의 문자열·오류 label로 retry 권한을 판단하지 않는다.
- `packages/company-runtime/src/agent-runner.ts`: Reviewer 입력에 `trustedEvidenceRefs`를 추가하고 prompt에서 정확한 문자열 복사, filename/diffDigest/description 사용 금지, 동일 세션 재제출을 안내했다. 위 도구가 확인한 evidence 검증 오류만 즉시 abort에서 제외한다. 새 session/revision/Provider 재시도 시스템은 만들지 않았다.
- `packages/coding-agent/test/suite/company-runtime-agent.test.ts`: 17개 SDK/faux 회귀를 추가했다. unknown/missing/nonexact/file/digest/description ref 거부와 동일 세션 retry, check-only ref 수락·정확한 합집합, REVISE/BLOCK 조건, 미제출/턴 한도/취소/stale identity/금지 도구/혼합 submit 종료를 검증한다.
- `packages/coding-agent/test/suite/company-runtime-r2.test.ts`: RC-04 유사 통합 1개를 추가했다. 실제 임시 Git/Policy mutation·SELF_CHECK 뒤 digest-as-ref 제출을 거부하고 REVIEW 상태/lock을 유지한다. 같은 Reviewer 세션에서 정상 제출한 후 TEST·COMPLETE, durable review 1개·독립 세션 2개·revision0·lock 해제를 확인했다.
- `docs/V0.1_READINESS.md`, `docs/WORK_LOG.md`: 사용자 실제 GPT 발견과 이번 자동 검증을 구분해 기록했다.

Kernel `assertReview()`와 freshness/integrity guard는 변경하지 않았다. 기존 의미대로 모든 verdict의 top-level evidenceRefs는 비어 있을 수 없고 PASS는 각 requirement에도 ref가 필요하다. REVISE/BLOCK의 requirement refs는 빈 배열이 가능하나 제공한 모든 ref는 trusted set에 속해야 한다. 잘못된 ref를 필터링·추정·자동 대체하지 않는다. Schema/identity/Policy/Provider 오류와 timeout/turn/cancel 경계, QUICK/R0/R1·STANDARD/R1·R2/R3 completion 및 RC-01 수정은 유지한다. 실제 RC fixture·prompt/config·기존 run은 수정하지 않았다.

### 이번에 실행한 검증

```sh
# packages/coding-agent: 최초 실행 및 formatter 이후 최종 재실행
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-agent.test.ts test/suite/company-runtime-r2.test.ts

# packages/company-runtime: S0~S6 + RC-01
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: Runtime/RC-01 통합 및 기존 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- 최초 수정 후 두 파일 실행: **101 PASS / 2 FAIL**. 신규 테스트가 SDK user content를 string으로만 가정했고 action audit에서 Verifier action까지 Developer mutation 수로 계산했다. 실제 SDK의 text block 입력 처리를 반영하고 Developer action만 검사하도록 테스트를 수정했다. 구현의 guard를 완화하지 않았다.
- S0~S6/RC-01 전체 targeted 재실행: Runtime **17개 파일·481개**, 관련 coding-agent **8개 파일·307개**, 추가 기존 Pi **4개 파일·59개**, 합계 **29개 파일·847개 PASS**. 이전 829개에 신규 18개를 더한 현재 실행 결과다. 전체 저장소 suite 수가 아니다.
- formatter 적용 뒤 수정한 두 테스트 파일 재실행: **2개 파일·103개 PASS**. 위 847개와 중복되므로 합산하지 않는다.
- `npm run check`: **PASS**. 최초 Biome이 이번 변경 파일 3개의 import/format을 정리했고, 최종 재실행은 자동 수정 없이 통과했다. TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함.
- `git diff --check`: **PASS**. `kernel.ts`의 diff는 시작 시 존재하던 RC-01 변경뿐이며 `assertReview()`는 그대로다.

### 제한·다음 작업·커밋

- 실제 GPT RC-04 수정 후 재실행·DeepSeek·interactive smoke·다른 플랫폼·전체 suite/build는 이번에 하지 않았다. 실제 API/유료 호출도 없다. faux 재제출 성공이 실제 모델의 준수/품질을 보장하지 않는다.
- 재제출은 기존 시간·턴 제한 안에서만 가능하다. 최종 유효 제출이 없으면 실패하며 arbitrary tool/schema/identity 오류 전반을 재시도 대상으로 확장하지 않았다.
- **다음 작업:** 사용자 환경의 같은 fixture/prompt/config에서 새 실제 GPT RC-04 run으로 ref 준수 또는 오류 후 수정 및 independent PASS·TEST·COMPLETE를 확인한다. 기존 BLOCKED run을 성공으로 재작성하지 않는다. RC-01의 실제 Provider 재실행도 별도 확인한다.
- **커밋·푸시:** 하지 않음. 시작 시 RC-01 미커밋 변경과 이번 RC-04 변경을 작업 트리에 유지한다.

---

## LOG-015 — RC-01/RC-04 통합 커밋·푸시 준비

- **기록일:** 2026-09-16 (KST)
- **상태·목적:** 사용자 최종 지시에 따라 RC-01과 RC-04를 모두 포함하는 커밋 범위를 확정하고 게시 전 검증을 완료했다. 중간의 RC-04만 포함하는 방안은 취소했으며 해당 방안으로 스테이징·커밋·파일 분리는 수행하지 않았다.
- **변경 파일:** LOG-013/014의 코드·테스트·README·readiness·작업 이력 총 10개 파일. 기존 RC-01 변경을 사용자 명시적 승인으로 포함한다. 그 외 기능·의존성·lockfile 변경은 없다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check` PASS, `git status --short --branch`와 변경 diff로 대상 10개 파일 및 `devlop`을 확인했다. 추가 테스트는 이번 커밋 준비에서 재실행하지 않았다. 직전 LOG-014의 29개 파일·847개 PASS는 구현 검증 당시 결과다.
- **문제·해결:** RC-01/RC-04가 같은 문서에 함께 존재했으나 사용자가 모두 게시하도록 최종 승인하여 부분 스테이징이 필요 없어졌다. 이전 로그의 당시 미커밋 상태 기록은 보존한다.
- **남은 제한·다음 작업:** 실제 GPT RC-01/RC-04 수정 후 재실행 및 DeepSeek 검증은 여전히 미검증이다. 명시적 10개 경로만 스테이징하여 일반 커밋 후 `origin/devlop`에 푸시하고 HEAD/원격 일치와 작업 트리를 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 예정 메시지는 `fix(coding-agent): correct runtime R0 completion and review evidence retries`이며 실제 커밋 ID·푸시 결과는 Git 이력과 최종 응답으로 보고한다.

---

## LOG-016 — RC-04 재검증: bounded worker timeout 설정과 선행 취소 보존

- **기록일:** 2026-09-16 13:58 (KST)
- **상태:** 구현·자동 회귀 완료, 실제 Provider 후속 재실행 미검증
- **목적:** 실제 GPT STANDARD/R2 IMPLEMENT가 60초 worker deadline으로 끝난 문제에 대해 명시적·bounded 실행 예산을 제공하되 취소/cleanup/lease 안전성을 보존한다.
- **시작 상태:** `devlop` clean, HEAD `d4d9ff4c0167293caf746827d7de8f1310c0d505`. LOG-015 뒤 사용자 승인대로 RC-01/RC-04 모두 이 커밋에 포함하여 `origin/devlop`에 푸시했고 당시 로컬/원격 HEAD 일치·clean을 확인했다. 이 항목의 새 변경은 아직 커밋하지 않았다.

### 실제 발견·설계 판단

사용자 실제 GPT RC-04 재검증에서 Developer가 IMPLEMENT 도중 `Worker timed out`으로 종료했다. 이 run에는 파일 변경·SELF_CHECK·Reviewer 실행이 없었다. 따라서 LOG-014의 Reviewer evidenceRefs 수정은 실제 Provider에서 여전히 검증되지 않았다. 모델/프롬프트를 바꾸거나 fixture를 축소하지 않는다. 정확한 reasoning/network 지연 원인은 이번 보고만으로 추정하지 않는다.

기존 Adapter의 기본 60초와 Extension에서 timeout을 별도 전달하지 않는 경로를 확인했다. 설정은 `agents.worker_timeout_ms` 한 개로 한정하고 기본 180000ms·허용 정수 10000..600000ms를 선택했다. 120초보다 대기 여유를 주되 사용자 설정을 10분 이내로 제한한다. 모델별 실측 최적값이라는 주장은 아니다. V0.1에서는 역할별 timeout·별도 scheduler·자동 연장/재시도/모델 fallback이 필요하지 않다.

예산은 각 Developer/Reviewer/Executor 호출의 audit/auth 재확인·SDK 생성·session 참조 저장·전체 Provider/tool turns와 승인 대기를 포함한다. token/turn마다 갱신되는 inactivity timeout도 전체 workflow timeout도 아니다. 생성 시 profile/auth preflight는 같은 값의 별도 signal budget을 사용한다. 기존 직접 Host/test `timeoutMs` override(1~3,600,000ms)는 의도된 API이므로 제거하지 않았고 YAML에 이를 노출하지 않는다. check timeout·R3 승인 TTL은 별도다.

### 변경 파일·실패 경계

- `packages/company-runtime/src/config.ts`: strict schema에 optional bounded 정수를 추가하고 생략 시 180000ms로 정규화한다. 0/음수/범위 초과/소수/문자열/null 등은 거부한다.
- `packages/company-runtime/src/extension.ts`: Host가 정규화된 config 값을 `PiAgentExecutor.create`에 명시적으로 전달한다. 기존 lifecycle hook은 변경하지 않았다.
- `packages/company-runtime/src/agent-runner.ts`: 직접 호출에도 frozen config의 값이 기본으로 적용된다. 원본 config 객체 변경은 이미 생성된 Adapter의 예산에 영향을 주지 않는다. timeout callback은 signal이 이미 취소됐으면 원인을 덮지 않는다. 이전에는 비협조 Provider의 취소 정산이 늦어 deadline에 도달하면 선행 사용자 취소가 `Worker timed out`으로 바뀔 수 있었다. 기존 abort/await/dispose·safeToRelease·다음 역할 거부는 그대로다.
- `packages/company-runtime/src/observations.ts`: `/workflow config`에 공통 timeout과 범위·cleanup 대기 의미를 표시한다. active run의 설정을 바꾸거나 상태 schema를 확장하지 않는다.
- `packages/company-runtime/test/config.test.ts`, `test/extension.test.ts`: 설정 유효/거부 matrix 14개, config 출력과 잘못된 설정이 confirmation/provider/writer 전에 거부되는 Host 사례 2개를 추가했다. check timeout이 독립이라는 기존 검증도 유지한다.
- `packages/coding-agent/test/suite/company-runtime-timeout.test.ts`: SDK/harness/faux/가상 timer 13개를 추가했다. Developer/Reviewer 90초 지연 성공, 기본값 179999ms 성공, 120000ms timeout, 총 여러-turn 예산, 선행 cancel 우선, late result/tool 거부, 무효 config+override 거부를 검증한다. 실제 Extension config 전달 및 timeout/cancel/switch/reload/quit 경로에서 Provider/SDK cleanup 대기 동안 lock·RUNNING/IMPLEMENT를 유지하고 두 번째 writer를 거부하며, 최종 FAILED/CANCELLED 후 unlock·무변경·check/review 미실행을 확인한다.
- `packages/company-runtime/README.md`, `docs/V0.1_READINESS.md`, `docs/WORK_LOG.md`: 설정 예시·정확한 시간 의미·역할 공통 결정·실제 GPT 실패와 자동 검증의 차이를 기록했다.

Kernel/Ports/Policy/Approval/StateStore와 completion guard는 변경하지 않았다. QUICK/R0/R1·STANDARD/R1/R2·R3 실행 의미는 그대로이며 timeout 증가가 권한이나 완료 요건을 낮추지 않는다. timeout은 실패이고 COMPLETE로 진행하지 않는다. 사용자/lifecycle signal은 즉시 전달하지만 비협조 Provider/SDK 종료를 확인할 때까지 반환·unlock을 보장하지 않는다. cleanup이 불확실하면 기존처럼 lease를 유지한다.

### 이번 검증 명령·실제 결과

```sh
# packages/company-runtime: 초기 targeted와 최종 S0~S6/RC 회귀
node ../../node_modules/vitest/dist/cli.js --run test/config.test.ts test/extension.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: 신규 suite 및 기존 회귀
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- 초기 config/Host **64개 PASS**. 신규 SDK suite 최초 **8 PASS / 4 FAIL**은 테스트가 Kernel의 저장된 cancel 원인을 Adapter의 `Worker aborted`로 예상한 오류였다. Kernel은 기존대로 `Run cancelled`를 저장하므로 기대값을 수정했다. 구현/Kernel guard는 이 테스트에 맞춰 바꾸지 않았다. 이후 여러-turn 예산 사례를 추가하여 신규 suite **13개 PASS**를 확인했다.
- 최종 **30개 파일·876개 PASS**: Runtime 17개 파일·497개 + 관련 coding-agent 9개 파일·320개 + 추가 Pi 4개 파일·59개. 신규 29개이며 LOG-014의 847개와 중복 합산하지 않는다. 기존 S6 cleanup/lifecycle matrix와 RC-01/RC-04 evidence 회귀도 이번에 모두 다시 실행했다.
- `npm run check` **PASS**: 최초 Biome이 이번 test 파일 3개 format을 정리했고 최종 재실행은 자동 수정 없이 통과했다. TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함. formatter 이후 전체 targeted를 실행했다.
- `git diff --check` **PASS**. 실제 API/유료 호출·interactive smoke·전체 저장소 suite/build·다른 OS는 이번에 실행하지 않았다. 90~180초 성공은 가상 경과 시간의 실제 SDK/faux 검증이지 실제 GPT 지연/성공 증거가 아니다.

### 제한·다음 작업·커밋

- 실제 GPT RC-04는 새 timeout 설정으로 다시 실행해야 한다. `/workflow config`에서 effective 값을 확인하고 같은 fixture/prompt/model로 새 run을 수행한다. Reviewer가 실제 시작하여 정확한 ref 또는 Tool error 후 수정·PASS·TEST·COMPLETE에 도달해야 evidence 수정 검증으로 기록할 수 있다. 기존 실패 run을 재작성하지 않는다.
- 180초 기본값이 quota/network/model 품질 문제를 해결하거나 Provider가 AbortSignal에 협조한다는 보장은 없다. shutdown 응답 시간·lease 정리는 여전히 협조적 cleanup에 의존한다. timeout은 강제 OS 종료 deadline이 아니다.
- **커밋·푸시:** 이번 수정은 하지 않음. 새 기능 단계나 release 선언이 아니다.

---

## LOG-017 — RC-04 재검증: Developer unresolved와 Runtime 후속 의무 구분

- **기록일:** 2026-09-16 14:29 (KST)
- **상태:** 구현·자동 회귀 완료, 수정 후 실제 Provider COMPLETE 미검증
- **목적:** Developer가 시스템 소유 후속 단계를 immutable handoff의 unresolved로 제출해 완료가 차단되는 문제를 prompt·제출 피드백으로 수정한다. Kernel의 unresolved 완료 가드는 유지한다.
- **시작 상태:** `devlop`, HEAD `d4d9ff4c0`. LOG-016의 worker timeout 코드·테스트·문서가 미커밋 상태였으며 모두 보존했다. 이번 변경과 함께 검증하되 이전 작업과 이번 변경을 구분한다.

### 실제 문제·짧은 trace

사용자 실제 GPT STANDARD/R2 재검증에서 Developer → SELF_CHECK → Reviewer PASS → final TEST까지 성공했지만 COMPLETE가 `Handoff has the wrong task or unresolved work`로 BLOCKED됐다. Developer가 unresolved에 `Independent Reviewer PASS is required and remains pending.`를 넣었고, 실제 리뷰가 PASS해도 이미 수락한 immutable handoff는 바뀌지 않아 `unresolved.length === 0` 가드에 걸렸다.

LOG-016 당시 timeout run과 달리 최신 보고에서는 Reviewer PASS와 final TEST까지 확인됐다. 이는 사용자 실제 Provider 실행의 보고이며 이번 faux 결과가 아니다. actual ref 오류 후 재제출 여부, 모델/지연/timeout 설정값은 미보고라 추정하지 않는다. 전체 run이 성공한 것으로 기록하거나 기존 BLOCKED state를 재작성하지 않는다.

### 변경 파일과 한정된 설계

- `packages/company-runtime/src/agent-runner.ts`: Developer prompt에서 unresolved를 구현·요구사항의 실제 미해결 문제/blocker로 정의한다. Reviewer 실행/PASS·SELF_CHECK·TEST·Human Approval 필요/대기는 Kernel/Workflow 소유이며, Developer가 생략·완료를 결정하지 않도록 명시한다. 미구현 변경은 구체적 blocker로 남겨야 하며 R3 승인 도구를 우회하지 않는다. 새 안내는 QUICK Executor prompt에는 적용하지 않았다.
- `packages/company-runtime/src/agent-tools.ts`: Developer `submit_handoff` 설명과 검증을 추가했다. 알려진 영어 whole-entry 패턴(Reviewer/PASS/execution·SELF_CHECK·TEST·Human Approval + required/needed/pending)만 검출하고 해당 unresolved index를 Tool error로 반환한다. 대소문자·공백·마지막 마침표/느낌표 변형을 인식하지만 원본 handoff는 수정하지 않는다. 실제 미완료를 뜻한다면 구체적 누락 변경을 기술하고 실제 blocker를 반드시 보존하도록 안내한다. 수락/terminate 전에 거부하므로 같은 세션에서 다시 제출할 수 있다.
- 기존 Reviewer evidence retry의 내부 call ID 분류를 tool 이름까지 결합한 submission 오류 Map으로 공유했다. 해당 Adapter가 표시한 handoff 의미 오류와 Reviewer ref 오류만 재제출 가능하다. 모델이 오류 문자열을 흉내 내거나 일반 Tool/Policy 오류를 일으켜도 재시도 권한이 생기지 않는다.
- `packages/coding-agent/test/suite/company-runtime-agent.test.ts`: 13개 추가. 알려진 표현 변형 4개가 같은 Developer session에서 수정 가능함, 미재제출/턴 제한/취소/timeout/stale identity/Policy 거부/혼합 제출은 계속 종료됨, QUICK R0/R1 Executor unresolved는 이번 Developer 규칙으로 변경하지 않음을 검증했다.
- `packages/coding-agent/test/suite/company-runtime-r2.test.ts`: 12개 추가. 알려진 obligation 5개 제출 거부 후 같은 Developer session에서 빈 unresolved로 수정 → 독립 Reviewer PASS·두 check PASS·COMPLETE; 실제/애매한 문제 5개는 그대로 보존되어 Reviewer PASS에도 BLOCKED; mixed 배열 교정 후 실제 blocker 유지; custom Adapter가 제출 검증을 우회해 원래 obligation을 반환해도 Kernel이 BLOCKED함을 확인했다.
- `packages/company-runtime/README.md`, `docs/V0.1_READINESS.md`, `docs/WORK_LOG.md`: 의미·예시·한계와 실제 Provider 단계 성공/전체 완료 실패, 이번 자동 검증 결과를 구분해 기록했다.

**변경하지 않은 경계:** `kernel.ts`와 `unresolved.length === 0`, R2 independent review 의무, R3 Approval, QUICK/R0/R1 및 STANDARD/R1 completion semantics, Policy/StateStore/계약 schema. 실제 미해결 문제는 빈 배열로 강제 변환하지 않는다. 구현 문제와 섞인 문장·알려지지 않은 표현은 제출 피드백을 놓칠 수 있지만 그대로 남아 최종 guard가 차단한다. Reviewer PASS 뒤 handoff를 필터링하거나 수정하는 단계는 없다. 기존 시간·턴·취소·cleanup/lease와 RC-04 evidence retry는 유지한다.

### 이번 검증 명령·실제 결과

```sh
# packages/coding-agent: 수정한 두 파일 targeted
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-agent.test.ts test/suite/company-runtime-r2.test.ts

# packages/company-runtime: S0~S6/RC 회귀
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: timeout/evidence/RC-01 포함 통합 및 기존 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- 수정한 두 파일 최초 targeted: **2개 파일·128개 PASS**. 신규 25개가 포함되며 이번 작업의 테스트 실패는 없었다.
- 전체 targeted: Runtime **17개 파일·497개**, 관련 coding-agent **9개 파일·345개**, 추가 기존 Pi **4개 파일·59개**, 합계 **30개 파일·901개 PASS**. LOG-016의 876개는 과거 결과이며 합산하지 않는다. 기존 S6 lifecycle/lease와 R3·QUICK·STANDARD 회귀도 이번에 다시 실행했다.
- root `npm run check`: **PASS**. 최초 Biome이 이번 변경 파일 3개 format을 정리했고 최종 재실행은 자동 수정 없이 통과했다. TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke도 통과했다. formatter 이후 전체 targeted를 실행했다.
- `git diff --check`: **PASS**. Kernel diff가 없음을 확인했다. 실제 API/유료 호출·interactive smoke·전체 suite/build·다른 OS는 이번에 실행하지 않았다.

### 제한·다음 작업·커밋

- 검출은 보수적인 알려진 영어 문구 피드백이며 범용 자연어 의미 판별기가 아니다. 놓친 다른 표현은 기존 완료 가드에서 계속 BLOCKED될 수 있다. 반대로 stage 이름만으로 표현한 실제 미구현 문제라면 구체적 문제로 수정 제출해야 하며 자동 삭제하지 않는다.
- 실제 구현 완료/요구사항 충족은 모델 진술만으로 증명되지 않으며 독립 review·필수 check·fresh evidence가 여전히 필요하다. 이번 수정 후 actual GPT COMPLETE는 미검증이다.
- **다음 작업:** 같은 실제 RC fixture/prompt/model의 새 run에서 올바른 handoff 또는 Tool error 후 수정, Reviewer PASS·TEST·COMPLETE를 확인한다. 기존 실패 run/state는 변경하지 않는다.
- **커밋·푸시:** 하지 않음. LOG-016 timeout 변경과 이번 handoff 변경을 작업 트리에 유지한다.

---

## LOG-018 — RC-05: R3 승인 요청과 승인 권한의 prompt/tool 의미 분리

- **기록일:** 2026-09-16 (KST)
- **상태:** 구현·자동 회귀 완료, 수정 후 실제 GPT RC-05 재실행 미검증
- **목적:** 실제 GPT R3 run에서 Human Approval UI가 나타나지 않은 문제에 대해 모순된 역할 안내를 수정한다. 새로운 승인 권한이나 실행 경로는 추가하지 않는다.
- **시작 상태:** `devlop`, HEAD `d4d9ff4c0`; LOG-016 timeout과 LOG-017 unresolved 코드·테스트·문서가 미커밋 상태였다. 모두 보존하고 함께 회귀를 실행했다.

### 실제 발견·원인과 해결

사용자는 실제 GPT RC-05에서 `Delete file obsolete.txt`를 실행했지만 Human Approval UI가 나타나지 않고 BLOCKED됐다고 보고했다. 공통 Developer system prompt는 `approval ... is available`을 부정하는 반면 R3 문구는 `runtime_delete ... after explicit human approval`이라고 안내했다. 이는 승인을 요청할 방법이 없거나 별도 승인이 먼저 있어야 tool을 호출할 수 있다는 혼동을 만든다.

기존 코드와 테스트를 확인하면 Developer가 별도 approval tool을 가질 필요가 없다. `runtime_delete`가 현재 scope/경로/config를 검사한 뒤 `onApprovalRequested`를 호출하고 Runtime이 WAITING_APPROVAL/PENDING을 저장하여 ApprovalPort/Host UI에 전달한다. 사용자 결정에 따른 exact grant를 검사한 뒤에만 실제 삭제·consumption을 진행한다. 따라서 guard나 승인 UI 구현을 완화하지 않고 **호출이 승인 요청을 시작한다는 사실**을 prompt/tool 설명에 일치시켰다. 사용자 보고 외 실제 모델 전체 로그나 비용·지연은 확인하지 않았으며 추정하지 않는다.

### 변경 파일

- `packages/company-runtime/src/agent-runner.ts`: 공통 문구를 shell/자동 context 부재와 직접 승인·우회·workflow 제어 권한 부재로 분리했다. R3 Developer에만 `runtime_delete` 호출 → Runtime 승인 요청, 별도 approval tool/prior grant 불필요, WAITING_APPROVAL에서 Deny/Approve once, tool 확인 전 승인 획득 주장 금지, 거절/만료 후 우회·재시도 금지를 안내한다. 일반 코드 mutation 안내 대신 한정 deletion을 지시한다. R3 Reviewer는 읽기 전용 handoff/diff/evidence 리뷰만, R0/R1/R2는 승인 요청·destructive 도구 미제공을 명시한다. 공통 unresolved 설명의 모호한 'permitted tool로 먼저 승인 획득' 문장은 R3의 구체적 흐름으로 대체하되 실제 미완료 blocker 보존 의미는 유지한다.
- `packages/company-runtime/src/agent-tools.ts`: `runtime_delete` description만 같은 요청/대기/삭제 순서로 명확히 했다. 실행 함수·입력 schema·tool 등록 조건·Policy gate·callback·fingerprint/expiry 재검사·unlink·consumption은 이번 작업에서 변경하지 않았다.
- `packages/coding-agent/test/suite/company-runtime-approval.test.ts`: RC-05 신규 8개. approve/deny/timeout 3개가 실제 SDK/faux의 prompt·tool 설명·도구 목록을 검증하고 ApprovalPort 진입 전 미승인·파일 존재, 진입 시 WAITING_APPROVAL/PENDING, 반환 뒤 결과를 확인한다. 위조 승인 인자 1개와 QUICK R0/R1·STANDARD R1/R2의 destructive 도구 미노출 및 실제 호출 거부 4개를 추가했다. 기존 Host Deny/Approve once 테스트는 selection 시 WAITING_APPROVAL/PENDING·파일 존재·Deny 기본값을 명시적으로 확인하도록 강화했다.
- `packages/company-runtime/README.md`, `docs/V0.1_READINESS.md`, `docs/WORK_LOG.md`: 요청 권한과 승인 권한의 차이, 실제 GPT 문제와 자동 검증 범위·후속 RC gate를 기록했다.

**유지한 경계:** Developer에게 승인 권한/approval tool을 주지 않는다. R3 preselected scope/actionDigest/configDigest/fingerprint/TTL/one-shot/state와 Kernel completion guard는 그대로다. Deny/timeout은 삭제 없이 BLOCKED, 유효한 Approve once만 한 파일 삭제, 독립 review/check 뒤에만 완료 가능하다. R0/R1/R2에 R3 기능을 노출하지 않고 R3 Reviewer도 delete tool을 갖지 않는다. 사용자 fixture·prompt/model·RC 요청·기존 run/state는 변경하지 않았다.

### 이번 검증 명령·실제 결과

```sh
# packages/coding-agent: 수정 전 새 prompt 계약 테스트, 수정 후 전체 approval suite
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-approval.test.ts -t 'RC-05'
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-approval.test.ts

# packages/company-runtime: S0~S6/RC 및 승인 guard 회귀
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: 전체 Runtime/RC 및 관련 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- 수정 전 신규 RC-05 테스트: **7 FAIL / 1 PASS / 기존 43개 필터 제외**. 기존 prompt가 새 권한/요청 설명 계약을 만족하지 않아 assertion이 실패했다. 승인 인자 위조 거부는 기존에도 통과했다. 이 결과는 실제 LLM의 자연어 판단을 재현한 증거가 아니라 prompt/tool 계약 회귀다.
- 수정 후 approval suite: **51개 PASS**. 이후 Host selection 검사 강화와 formatter를 적용하고 전체 targeted를 다시 실행했다.
- 최종 **30개 파일·909개 PASS**: Runtime 17개 파일·497개, 관련 coding-agent 9개 파일·353개, 추가 Pi 4개 파일·59개. 신규 8개이며 LOG-017의 901개와 중복 합산하지 않는다. 기존 승인 생략·다른 경로·재사용·변조 binding·만료·늦은 응답·승인 중 lifecycle/cleanup 회귀도 이번에 다시 통과했다.
- root `npm run check`: **PASS**, 최초 Biome이 이번 approval test 파일 1개 format을 정리했고 최종 재실행은 자동 수정 없이 통과했다. TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함.
- `git diff --check`: **PASS**. 실제 API/유료 호출·interactive smoke·전체 suite/build·다른 OS 검증은 이번에 하지 않았다.

### 한계·다음 작업·커밋

- prompt 명확화가 모든 실제 모델의 도구 선택을 보장하지 않는다. 실제 GPT RC-05 재실행은 아직 미검증이며 이번 faux/Host selection 통합은 실제 TUI 표시 확인과 구분한다.
- **다음 작업:** 같은 실제 `Delete file obsolete.txt` 요청으로 새 run에서 runtime_delete 호출과 Human Approval UI 표시를 확인한다. Deny/timeout 파일 유지 및 Approve once exact 삭제·consumption·후속 review/check를 별도 검증한다. 이전 BLOCKED run을 재작성하지 않는다.
- **커밋·푸시:** 하지 않음. 앞선 timeout/handoff 수정과 이번 prompt 변경을 작업 트리에 유지한다.

---

## LOG-019 — RC-04/RC-05 누적 수정 커밋·푸시 준비

- **기록일:** 2026-09-16 15:25 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-016~018의 worker timeout·Developer unresolved·R3 승인 요청 prompt 수정과 테스트·문서를 함께 게시하기 위한 검증을 완료했다.
- **변경 파일:** 앞선 세 작업에서 변경한 Runtime 소스 5개, Runtime 테스트 2개, coding-agent suite 4개(신규 timeout suite 포함), README/readiness/작업 이력 3개로 총 14개 파일. 다른 변경이나 lockfile은 포함하지 않는다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check` PASS, `git status --short --branch`·변경 목록·기존 staged 변경 없음 확인. 테스트는 이번 커밋 준비에서 다시 실행하지 않았으며 LOG-018의 30개 파일·909개 PASS는 직전 구현 검증 결과다.
- **문제·해결:** 추가 문제 없음. Kernel/Policy/Approval/StateStore의 완료·승인 guard를 바꾸지 않은 누적 수정 범위를 유지한다. 과거 로그의 당시 미커밋 상태는 그대로 보존한다.
- **남은 제한·다음 작업:** 실제 GPT RC-04 수정 후 COMPLETE와 RC-05 승인 UI 재검증은 여전히 미완료다. 명시적 14개 경로를 스테이징해 커밋한 뒤 `origin/devlop`에 푸시하고 로컬/원격 HEAD 일치 및 작업 트리를 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 예정 메시지는 `fix(coding-agent): clarify runtime worker limits and approval semantics`이며 실제 커밋 ID·푸시 결과는 Git 이력과 최종 응답으로 보고한다.

---

## LOG-020 — Weavra V0.1 RC Closure: GPT Real-Provider RC-01~08 완료

- **기록일:** 2026-09-16 (KST), 이번 자동 targeted 재실행 시작 15:36 KST
- **상태:** 완료 — 한정된 GPT 시나리오 및 소스 RC Closure. 정식 release/패키지 발행 아님.
- **목적:** 실제 GPT 최종 evidence를 readiness와 일치시키고 S0~S6/RC 회귀를 현재 HEAD에서 다시 확인하여 `weavra-v0.1-rc1` 태그 준비 여부를 판정한다. 기능 추가나 Policy 의미 변경은 하지 않는다.
- **시작/최종 검증 HEAD SHA:** **`dc6d3df65ad4d9217f2f82e81cd56f07511163b6`**, `devlop`, 시작 시 clean 및 `origin/devlop`과 일치. 이번 작업에서 커밋하지 않아 최종 HEAD도 동일하다. 최종 작업 트리 차이는 아래 문서 두 개뿐이다.
- **연결 이력:** LOG-019 뒤 누적 수정 14개 파일은 사용자 승인으로 `970d238852366d044e6613ce4f24851020f69dc7`에 커밋·푸시했다. 이후 원격 evidence 문서 커밋 `dc6d3df65`를 fast-forward로 가져왔다. 앞선 로그의 당시 미커밋/미검증 상태는 수정하지 않고 이 항목에서 최종 결과를 연결한다.

### 실제 GPT evidence와 최종 판정

근거는 **[docs/GPT_RC_VALIDATION_2026-09-16.md](GPT_RC_VALIDATION_2026-09-16.md)** 전체(특히 §1~10·12)다. 사용자 주도 interactive 수동 검증이며 이번 작업에서 실제 모델을 새로 호출한 결과가 아니다.

- Provider: **`codex-lb`**, 모델: **`gpt-6-astra`**, reasoning 표시: **`high`**.
- 수동 환경: macOS/POSIX, Pi 표시 버전 `v0.85.1`, 별도 `kjg8619/weavra-rc-fixture`, `pi -e ../pi/packages/company-runtime/src/extension.ts`, fixture Node built-in tests.

| RC | 최종 판정 | 확인된 실제 결과 |
|---|---|---|
| RC-01 QUICK/R0 | PASS | known-risk finding 보존·파일 무변경·두 checks PASS·COMPLETED |
| RC-02 QUICK/R1 | PASS | Executor-only·한 파일 typo 수정·두 checks PASS·COMPLETED |
| RC-03 STANDARD/R1 | PASS | Developer/Reviewer 별도 session ID/JSONL·독립 PASS·두 checks PASS·COMPLETED |
| RC-04 STANDARD/R2 | PASS | `package.json`만 수정, install 없음, mandatory Reviewer·두 checks PASS·unresolved 없음·COMPLETED |
| RC-05 scoped R3 | PASS | Human Approval UI·기본 Deny·Deny/EXPIRED 파일 유지·Approve once 단일 삭제 |
| RC-06 mixed unsafe | PASS (expected block) | downgrade 없이 preflight 차단, worker mutation 이전 무변경 종료 |
| RC-07 IMPLEMENT cancel | PASS (expected cancel) | CANCELLED, Reviewer/verification 미실행, COMPLETE 금지·기록된 변경 없음 |
| RC-08 stale evidence | PASS (expected block) | Reviewer 뒤 외부 변경, 두 checks PASS여도 stale diff로 BLOCKED·부분 변경 보고 |

`BLOCKED`/`CANCELLED` 안전 시나리오의 PASS는 그 run을 COMPLETED로 바꿨다는 뜻이 아니다. 초기 실제 실패와 immutable 과거 run은 보존한다.

### Evidence 한계와 NOT VERIFIED 유지

- 수동 RC는 run별 SHA를 모두 고정하지 않았고 수정/재실행을 포함한다. 실제 GPT run 모두를 위 최종 HEAD에서 다시 실행했다고 주장하지 않는다. 이번 자동 회귀만 최종 HEAD에 정확히 연결한다.
- RC-05 문서의 직접 증거는 승인 UI 및 유지/삭제다. 승인 뒤 모든 review/check/COMPLETE 상세가 기록됐다고 확대하지 않는다. 해당 guard는 자동 suite에서 별도 검증했다.
- RC-07에는 취소 후 writer.lock 부재의 별도 수동 캡처가 없다. lease/lifecycle 자동 회귀와 과거 S6 interactive faux 증거를 별도로 해석한다.
- token/cost/duration·특정 timeout 예산의 충분성·실제 ref 오류 후 재제출 trace·장시간 network/rate-limit/quota/OAuth 경계는 미수집/미검증이다.
- **DeepSeek 및 다른 Provider/모델, 다른 OS와 macOS/Node 조합: NOT VERIFIED.** Windows 실행은 UNSUPPORTED / NOT VERIFIED다. 지원되지 않는 COMPLEX·범용 R3·shell/install/deploy·DAG/T3Code·model routing을 추가하지 않았다.
- 전체 upstream suite/e2e/build, Node/Bun 배포물의 저장소 밖 설치/실행 smoke, dependency vulnerability 재평가를 이번에 하지 않았다. 과거 audit를 현재 보안 PASS로 취급하지 않는다.

### 변경 파일과 문제 정리

- `docs/V0.1_READINESS.md`: 최종 HEAD와 이번 회귀 수치, RC-01~08 표, 근거 출처/한계, GPT PASS와 타 Provider/OS NOT VERIFIED를 구분했다. RC-01/04/05의 오래된 재실행 대기·미완료 상태를 최종 수동 결과로 갱신하되 당시 문제와 자동 결과는 보존했다. RC 진입 안내를 Closure/태그 준비 판정으로 정리했다.
- `docs/WORK_LOG.md`: 현재 요약을 갱신하고 본 완료 항목을 추가했다. LOG-001~019의 이력 본문은 보존한다.
- evidence 원문, Runtime 소스·테스트·Policy/Approval/StateStore/Kernel, README/설계 문서, dependency/lockfile, branding/package/version은 변경하지 않았다.
- 문제는 readiness의 오래된 미검증 상태와 최종 GPT 결과가 불일치한 것이었다. 실제 evidence를 출처로 연결하여 해소했으며 문서에 없는 성공 trace를 추가하지 않았다. 이번 테스트 실패나 코드 수정은 없다.

### 이번에 실제 실행한 검증

자동 환경: **Darwin arm64, Node v26.7.0**, 로컬 filesystem/Git/POSIX. 다음 명령을 각각 해당 package root에서 실행했다.

```sh
# packages/company-runtime — 전체 Runtime S0~S6 및 RC fixes targeted
node ../../node_modules/vitest/dist/cli.js --run test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent — Runtime/RC suite와 기존 prompt
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts

# packages/coding-agent — 추가 기존 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# repo root
npm run check
git diff --check
git status --short --branch
git rev-parse HEAD
git tag --list 'weavra-v0.1-rc1'
git ls-remote --tags origin 'refs/tags/weavra-v0.1-rc1' 'refs/tags/weavra-v0.1-rc1^{}'
```

| 이번 실행 | 파일 수 | 테스트 수 | 실제 결과 |
|---|---:|---:|---|
| Runtime S0~S6/RC | 17 | 497 | PASS |
| coding-agent Runtime + prompt | 9 | 353 | PASS |
| 추가 Pi runtime/model-extension/retry-events/queue | 4 | 59 | PASS |
| **합계** | **30** | **909** | **PASS, 실패/skip 0** |
| root `npm run check` | — | — | PASS, Biome 자동 수정 없음; TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함 |
| `git diff --check` | — | — | PASS |
| 로컬/원격 exact RC tag 조회 | — | — | 기존 `weavra-v0.1-rc1` 없음 |

숫자가 LOG-018의 909개와 같지만 **이번 Closure에서 다시 실행한 결과**다. 이전 결과나 수동 RC 8개를 합산하지 않는다. 실제 GPT·DeepSeek API/유료 호출·TUI interactive smoke는 이번에 새로 실행하지 않았다.

문서 갱신 뒤 root `npm run check`도 다시 실행해 자동 수정 없이 PASS했다. 임시 `python3 /tmp/weavra-rc-closure-doc-check.py` 검사로 HEAD/문서 전용 변경 범위, RC-01~08 판정·30/909 합계, 상대 링크·코드 fence, LOG-001~019 본문 보존, GPT evidence 원문 무변경을 확인했다(PASS). 검사 script는 실행 후 제거했으며 프로젝트 파일로 추가하지 않았다.

### 최종 Closure·태그 준비와 다음 작업

**`weavra-v0.1-rc1` 소스 RC 태그 후보로 적합하다.** 사용자 지정 GPT RC 범위와 현재 코드의 targeted/check 검증이 모두 통과했다. 이는 다른 Provider/OS, 패키징/전체 suite/보안 검증까지 완료됐다는 뜻이 아니다. Pi 정식 lockstep release/배포 절차와 별개이며 패키지 발행·새 버전/기능은 추가하지 않는다.

- **최종 HEAD:** `dc6d3df65ad4d9217f2f82e81cd56f07511163b6`.
- **다음 작업:** 사용자 승인 후 이번 Closure 문서 두 개를 커밋하고 최종 커밋 SHA·문서 전용 diff·작업 트리를 확인한 뒤 RC 태그를 생성/푸시할 수 있다. 그 사이 코드가 바뀌면 관련 검증을 다시 수행한다. 태그 설명에도 위 evidence 한계와 NOT VERIFIED 범위를 공개한다.
- **커밋·푸시·태그:** 이번 작업에서는 모두 하지 않음. 기능/Policy 불변이며 문서 두 개만 미커밋으로 남긴다.

---

## LOG-021 — Weavra Branding + Launcher UX

- **기록일:** 2026-09-16 16:03 (KST)
- **상태:** 완료 / 미커밋
- **목적:** RC-01~08의 실행 의미를 바꾸지 않고 검증된 Runtime을 Weavra launcher·UI·문서로 제공한다.
- **시작 상태:** `devlop` clean, HEAD `183f85de1897d8b9f4fadb368a54e2b1390e5a84`. 기존 annotated tag `weavra-v0.1-rc1` object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c`, peeled commit은 HEAD와 동일했다. LOG-020 이후 커밋/태그 상태는 현재 조회 결과이며 이번 생성 작업이 아니다.

### 구조와 변경 파일

- `packages/company-runtime/bin/weavra` 신규: 기존 package/bin 방식의 실행 가능한 Bash wrapper. npm link의 상대/연쇄 symlink를 따라 자신의 위치를 구하고 Extension 절대경로를 계산한다. PATH의 `pi`를 `exec "$PI" -e "$EXTENSION" "$@"`로 실행한다. cwd·환경·argv 경계·exit code/시그널을 유지하고 추가 proxy 프로세스나 shell 재해석을 만들지 않는다. Pi 부재/비실행 경로·불완전 checkout에 Weavra 오류를 표시한다.
- `packages/company-runtime/package.json`: private 내부 패키지 이름/버전은 유지하고 `bin.weavra` 및 제품 설명만 추가/갱신했다. `package-lock.json`은 요구된 `npm install --package-lock-only --ignore-scripts`로 갱신했으며 bin metadata 3줄뿐이다. 새 dependency·버전 교체·shrinkwrap 변경은 없다.
- `packages/company-runtime/src/extension.ts`: 기존 Company runtime/workflow·operation UI 문자열을 Weavra로 바꾸고 TUI에만 짧은 `session_start` 알림을 등록한다. 기존 Pi 헤더·footer·trust/lifecycle/승인 흐름을 교체하지 않는다. `/workflow help`에 QUICK/STANDARD, R0/R1/R2/scoped R3, 독립 Reviewer, Human Approval, 필수 checks/freshness와 자동 commit/rollback/resume 부재를 명시했다. 나머지 세 help도 Weavra·조회 문법을 안내한다.
- `src/observations.ts`: state 없음 메시지 이름 한 곳만 변경. `src/workflow.ts`: Windows 미지원 오류 이름 한 곳만 변경. 조건·전이·자료 구조는 그대로다.
- `packages/company-runtime/test/launcher.test.ts` 신규: cwd/환경·정확한 argv·공백/빈 인수/shell 문자·help/version·symlink·오류·exit code/시그널·public loader의 네 명령 등록 13개.
- `test/extension.test.ts`: TUI-only startup 4개, help 4개 추가 및 handler 수 갱신. 모델 호출/config/state 생성이 없음을 검증한다. `test/config.test.ts`: root/package README YAML과 새 예제 파일을 실제 parser로 정규화하여 동일한지 비교하는 1개 추가.
- `README.md`: Weavra 사용자 문서를 상단에 추가하고 upstream Pi 문서는 별도 영역으로 보존했다. 요청된 10개 섹션, 설치/Quick Start/명령/안전 경계/현실적 한계/읽기 전용 DAG Projection 후보를 설명한다. Pi `--help`/`--version` passthrough와 worker profile/부모 모델 구분을 명시한다.
- `packages/company-runtime/README.md`: 제품명·launcher·도움말·현재 GPT validation 링크와 과거 단계 설명의 오래된 미검증 표현을 정리했다. 상세 API/schema 설명은 보존한다.
- `packages/company-runtime/examples/config.yaml` 신규: 실제 schema 1의 최소 실행 예제. provider/model은 명시적 placeholder이며 check script도 사용자가 작성·검토해야 한다. schema에 없는 필드는 추가하지 않았다.
- `docs/WORK_LOG.md`: 현재 요약과 본 항목. 과거 LOG-001~020 본문은 보존한다.

### 유지한 경계

`CompanyKernel`, `CompanyExtensionOptions`, `registerCompanyRuntime`, private package 이름·0.85.1 workspace 버전, `packages/company-runtime` 및 Pi session 경로를 유지했다. worker의 `Company Runtime` prompt는 모델 행동 불변을 위해 의도적으로 보존했고 사용자 문서에 구분했다. Kernel/Policy/Approval/StateStore/classifier/schema/Agent 도구·prompt, Pi Core/bin/version/config는 변경하지 않았다. COMPLEX/Planner/Lead/병렬 실행/DAG scheduler/T3Code는 구현하지 않았다. Weavra 표시는 `v0.1 RC1 (development)`이며 Pi `0.85.1`과 별개다.

### 이번 검증 명령과 실제 결과

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/launcher.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
git rev-parse HEAD weavra-v0.1-rc1 'weavra-v0.1-rc1^{}'
```

- 최종 targeted(16:02 KST): Runtime **18개 파일·519개 PASS**, 관련 coding-agent **13개 파일·412개 PASS**, 합계 **31개 파일·931개 PASS**, 실패/skip 0. 기존 909개를 이번에 다시 실행했고 branding/launcher/config 22개를 추가했다. GPT 수동 RC 8개나 과거 자동 결과를 합산하지 않는다.
- `npm run check`: PASS. Biome format 후 TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 모두 통과했다. 최종 포맷 이후 전체 targeted를 실행했다.
- `git diff --check`: PASS. HEAD/tag object/peeled SHA가 시작과 같음을 확인했다.
- 문서 갱신 후 최종 `npm run check`도 자동 수정 없이 PASS했다. `bash -n packages/company-runtime/bin/weavra` PASS. 임시 Python 검사로 다른 Runtime core/prompt/schema의 byte 불변, workflow/observation의 문자열 치환만 존재, lock의 bin metadata 외 불변, 과거 LOG 본문 보존, 문서 상대 링크/fence와 RC 태그를 확인했다(PASS). 임시 checker는 삭제했다.
- 초기 launcher argv test 5개와 첫 check의 TypeScript는 Vitest `it.each` 배열이 callback 인수로 펼쳐지는 테스트 작성 오류로 실패했다. 행을 `{args: [...]}`로 수정하고 launcher/extension/config **86개 PASS** 및 전체 931개를 확인했다. launcher를 오류에 맞춰 약화하지 않았다.
- lock 갱신 시 npm이 **moderate 3건**을 보고했다. 이번 작업은 dependency를 바꾸지 않았으며 일괄 `audit fix`를 하지 않았다. 해소/보안 PASS로 기록하지 않는다.

### 실제 설치·TUI smoke

- 임시 prefix에서 `npm_config_prefix=<tmp>/prefix npm link --workspace packages/company-runtime --ignore-scripts`를 실행했다. package 1개 link 성공, 생성된 `bin/weavra` symlink로 기존 설치된 Pi `0.85.1`을 호출했다. 사용자 global prefix·설정·인증은 변경하지 않았다.
- linked `weavra --version`은 `0.85.1`. 저장소 밖 임시 프로젝트에서 `pi --help`와 `weavra --help` 출력을 `cmp`하여 동일함을 확인했다.
- interactive-testing skill의 tmux 80×24, 별도 HOME/agentDir·`env -i`·offline·credential 없는 환경에서 실제 linked `weavra`를 실행했다. Pi 헤더와 별도로 Weavra 시작 3줄, 프로젝트 cwd 유지, 자동 Extension 로딩(`--no-extensions`와 병행), `/workflow help`, `/workflow`, `/state`, `/team`, `/risk` 출력을 확인했다. `/reload`와 `/quit`도 정상 종료했다.
- 초기 fixture에 모델/인증 및 fd가 없으므로 Pi의 no-model/offline-fd 경고는 예상된 결과다. 모델 prompt·workflow run을 보내지 않았고 유료 API를 호출하지 않았다. startup/명령 smoke이지 새 real-provider RC나 release smoke 통과가 아니다. 프로젝트에는 `.ai`/파일이 생성되지 않았다. 확인 후 tmux·임시 prefix/link·HOME/agentDir·fixture/script/help 비교 파일을 모두 제거했다.

### 한계·다음 작업·커밋

- source checkout과 별도 설치된 Pi/PATH에 의존하는 개인 설치다. 정식 publish/standalone 배포물·Windows·Linux·최소 Node 버전은 검증하지 않았다. 사용자의 실제 global prefix에 설치하지 않고 격리 prefix에서 같은 link 구조를 검증했다.
- Runtime semantics가 바뀌지 않아 GPT RC-01~08을 다시 실행하지 않았다. DeepSeek는 NOT VERIFIED다. 전체 upstream suite/e2e/build 및 새 vulnerability audit는 실행하지 않았다.
- **다음 단계:** 기존 state/event를 읽는 **DAG Projection 설계·구현에 진입 가능**하다. 읽기 전용 관찰과 실행 authority를 분리하는 조건이며 DAG scheduler/병렬화/COMPLEX 진입을 의미하지 않는다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. 안정 태그 `weavra-v0.1-rc1`을 그대로 유지한다.

---

## LOG-022 — Weavra Branding + Launcher 커밋·푸시 준비

- **기록일:** 2026-09-16 16:13 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-021의 변경을 커밋하고 `origin/devlop`에 게시하기 위한 검증 완료.
- **변경 파일:** LOG-021의 launcher·UI·테스트·README/config·작업 이력 및 `package-lock.json` 총 13개 파일. lockfile은 `bin.weavra` metadata 3줄뿐이며 dependency 변경은 없다. 이번 준비에서는 작업 이력만 추가했다.
- **이번 검증:** `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check` PASS. `git status --short --branch`와 staged diff로 다른 변경/기존 staged 파일이 없음을 확인했다. HEAD와 RC tag object/peeled commit이 LOG-021 시작과 같음을 확인했다.
- **과거 검증과 구분:** 31개 파일·931개 PASS 및 실제 npm-link/TUI smoke는 LOG-021의 구현 검증 결과다. 이번 커밋 준비에서는 테스트·실제 Provider를 다시 실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 사용자 승인된 launcher 등록에 필요한 lockfile만 `PI_ALLOW_LOCKFILE_CHANGE=1`로 명시적으로 포함하며 일반 pre-commit 검사는 유지한다.
- **남은 제한·다음 작업:** 기존 플랫폼/DeepSeek/배포물 미검증과 Runtime semantics 불변을 유지한다. 명시적 13개 경로만 stage·commit 후 일반 push하고 원격 HEAD 일치·clean·안정 태그 불변을 확인한다. 다음 제품 단계는 읽기 전용 DAG Projection이다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): add Weavra branding and launcher UX`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. RC 태그는 수정·이동·재생성하지 않는다.

---

## LOG-023 — Weavra Status Projection

- **기록일:** 2026-09-16 17:06 (KST)
- **상태:** 완료 / 미커밋
- **목적:** 기존 Runtime 상태를 Pi TUI에서 지속적으로 확인하는 관찰 UX를 추가한다. 새 실행 기능·상태 authority·DAG model은 만들지 않는다.
- **시작 상태:** `devlop` clean, HEAD/origin `9cef7aa93ef2d39cb874856045a21c09177135bf`. LOG-022의 branding/launcher는 `632ad3bcdb2dc5dc4263348654542fb26823fe1c`로 커밋·푸시됐으며, 이후 추가된 `docs/WEAVRA_EXTENSION_ADOPTION_PLAN.md`를 읽고 보존했다. 안정 RC tag object는 계속 `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c`다.

### 설계와 변경 파일

- `packages/company-runtime/src/status.ts` 신규: 기존 `Run` snapshot을 짧은 문자열로 만드는 순수 함수. QUICK/STANDARD·R0~R3·현재 phase/activeAgents를 읽고 WAITING_APPROVAL만 표시상 APPROVAL로 투영한다. terminal은 과거 active role/phase 없이 실제 종료 상태만 표시한다. Run/schema는 변경하지 않는다.
- `packages/company-runtime/src/extension.ts`: 공식 `ctx.ui.setStatus("weavra.runtime", text)`를 TUI에만 연결했다. 상태 소스는 이 Host가 소유한 `StandardWorkflow.snapshot`이며 `RuntimeEvent`는 갱신 신호일 뿐 replay/state machine이 아니다. event.runId와 현재 snapshot이 일치할 때만 읽고 같은 문자열은 재발행하지 않는다. 기존 주입 observer와 Kernel의 delivery diagnostics는 유지한다.
- Kernel 생성 중 Host에 snapshot이 아직 연결되지 않은 RunCreated 및 이전 run recovery event는 건너뛴다. 이후 RunStarted/step/agent/approval/terminal event의 최신 snapshot을 읽으므로 완료 event의 과거 step 이름으로 phase를 되돌리지 않는다. token/tool마다 polling하거나 timer를 두지 않는다.
- 실행 Promise가 끝나면 final snapshot/report를 한 번 재확인한다. 이벤트 없는 persistence 실패도 반영하고 별도 cleanup/report 오류가 있으면 `Weavra · ATTENTION · /state`로 표시한다. 소유 실행이 끝났는데 active snapshot이 남으면 `Weavra · UNCONFIRMED · /state`다.
- 저장된 run/writer만으로 live를 추정하지 않는다. 시작/reload에서는 파일을 읽지 않고 표시를 비우며 `/state` 등 과거 조회는 footer를 덮어쓰지 않는다. 완료 후 footer는 이 Pi에서 실행한 마지막 결과이지 현재 Git 검증 보장이 아니다.
- 새 run preflight에서 이전 결과를 비운다. 명시적 cancel은 기존 cleanup 후 실제 terminal 결과로 바꾸고, switch/fork/tree/reload/shutdown은 cleanup을 기다리기 **전에** UI를 분리·clear하여 늦은 event/finally의 stale 재표시를 막는다. 다른 status 키·footer는 교체하지 않는다.
- snapshot/format/setStatus/clear 예외는 UI 계층에서 격리하며 실행 결과·취소·정리를 바꾸지 않는다. 외부 footer가 Pi의 공식 extension status map을 렌더링하면 공존할 수 있고 `pi-footer` 의존성은 없다. UI 자체가 고장 난 경우 화면 문자 제거는 best-effort다.
- 테스트: `packages/company-runtime/test/status.test.ts` 신규 19개, 기존 `test/extension.test.ts`의 TUI-only startup/clear assertions 보강. `packages/coding-agent/test/suite/company-runtime-status.test.ts` 신규 25개는 기존 harness/faux·실제 SDK/Git/check를 사용한다.
- 문서: `README.md`, `packages/company-runtime/README.md`에 source/update timing·표시·lifecycle/stale·error·공존 계약을 추가했다. `docs/WORK_LOG.md`의 현재 요약과 본 기록을 추가하며 이전 LOG 본문을 보존했다. 변경은 총 8개 파일이다.

### 표시 예와 유지한 의미

```text
Weavra · QUICK · R1 · IMPLEMENT · Executor
Weavra · STANDARD · R2 · REVIEW · Reviewer
Weavra · STANDARD · R3 · APPROVAL · Developer
Weavra · COMPLETED
Weavra · BLOCKED
Weavra · CANCELLED
```

Kernel/Workflow owner/Policy/Approval/StateStore/분류/schema/worker prompt·도구·권한·리소스 격리는 그대로다. `.ai`에 status를 저장하지 않고 UI 문자열 한 개와 UI 연결만 메모리에 보관한다. Launcher·package/bin·lockfile·Pi Core·RC 태그도 변경하지 않았다. DAG Scheduler/Graph model/Planner/Lead/COMPLEX/병렬 실행은 추가하지 않았다.

### 이번 자동 검증

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run test/status.test.ts test/launcher.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
```

- Runtime **19개 파일·538개 PASS**. coding-agent **14개 파일·437개 PASS**. 최종 합계 **33개 파일·975개 PASS**, 실패/skip 0. 신규 44개와 기존 S0~S6/RC·branding/launcher 및 관련 Pi 회귀를 모두 이번에 실행했다. 과거 931개 및 수동 GPT RC 결과를 중복 합산하지 않는다.
- QUICK R0/R1, STANDARD R1/R2의 실제 implement/self-check/review/test/complete 순서와 중복 UI 호출 생략, R3 승인 UI 진입 시 WAITING_APPROVAL·대상 파일 존재·Approve/Deny 결과, 독립 BLOCK, 세 역할 cancel, 네 lifecycle hook의 늦은 event 차단/새 실행 연결을 검증했다.
- 저장된 RUNNING을 writer 유무와 무관하게 live로 투영하지 않음, 조회 시 source bytes 불변·Provider 호출 0, 다른 status 키 보존, RPC 미출력, UI/formatter/observer throw·reject와 clear 실패에서 정상 COMPLETE 또는 cancel/lock 정리 유지, event 없는 저장 실패와 terminal 뒤 cleanup 실패의 final 투영을 검증했다.
- `npm run check`: PASS(TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함). Biome의 테스트 포맷 후 전체 targeted를 실행했고 문서 갱신 후 최종 check도 자동 수정 없이 PASS했다. `git diff --check`: PASS. 임시 문서 검사로 상대 링크/fence, LOG-001~022 본문 보존, launcher/package/lock/adoption plan 불변을 확인했다(PASS). 검사 script는 제거했다.
- 최초 신규 통합 23개 중 2개 실패는 faux가 QUICK의 risk를 `scope.risk` 대신 STANDARD payload의 risk 필드에서 읽어 R0에 write를 요청한 fixture 오류였다. 올바른 payload 분기로 고쳐 23개 PASS 후 RPC/clear-failure 2개를 추가했다. Runtime guard는 바꾸지 않았다.
- 최초 전체 병렬 실행은 기존 QUICK `cancels an active TEST process`의 기본 waitFor(1초) 안에 marker가 나타나지 않아 **436 PASS / 1 FAIL**이었다. 해당 테스트와 Runtime을 변경하지 않고 동시 worker를 2로 제한해 관련 전체 14개 파일을 다시 실행하여 **437 PASS**를 확인했다. 병렬 부하에서의 시간 민감성 가능성이 있으며 지연 원인 분포를 별도로 측정한 것은 아니다.

### 실제 Pi TUI smoke

- interactive-testing skill의 tmux **80×24**, 저장소 `pi-test.sh`, 임시 Extension wrapper와 기존 suite harness/faux를 사용했다. 별도 HOME/agentDir·credential 없는 `env -i`·offline·외부 임시 Git fixture만 사용했고 실제 Provider/유료 토큰은 호출하지 않았다.
- 기본 Pi footer에서 `Other status`와 Weavra가 동시에 표시됐다. QUICK/R0 IMPLEMENT→COMPLETED, STANDARD/R1 IMPLEMENT·SELF_CHECK·REVIEW/Reviewer, R3 APPROVAL/Developer와 실제 Deny modal→BLOCKED, 명시적 QUICK cancel→CANCELLED를 확인했다.
- 완료 후 reload 및 live Developer 중 reload에서 Weavra만 제거되고 Other status는 남았다. reload 후 `/state`의 저장 CANCELLED 조회도 footer에 과거 phase를 복원하지 않았다.
- 종료 후 임시 state의 실제 결과 **COMPLETED, COMPLETED, BLOCKED, CANCELLED, CANCELLED**, R3 DENIED·원본 파일 유지, writer.lock 부재, UI key 미저장을 검사했다(PASS). 초기 fd/model 미설정 경고는 offline fixture의 예상 결과다. 실제 TUI의 TEST 프레임은 별도 캡처하지 않았고 자동 순서 검증으로 확인했다.
- 임시 Python 검사에서 변경 대상 외 Runtime core/prompt/schema의 byte 불변과 RC tag 불변도 PASS했다. tmux·임시 fixture/wrapper/검사 script를 정리했다. 실제 프로젝트 `.ai`는 생성하지 않았다.

### 한계·다음 작업·커밋

- 기본 Pi footer 및 별도 status 키와의 공존을 검증했으며 외부 pi-footer 자체를 설치/실행하지 않았다. 공식 status map을 무시하는 custom footer의 표시를 강제로 바꾸지 않는다. 저장된 다른 owner의 실시간 실행을 추적하거나 재시작 후 terminal을 복원하지 않는다.
- snapshot/보고 오류로 표시한 ATTENTION/UNCONFIRMED는 관찰 진단이며 저장된 Run status를 재작성하지 않는다. UI API가 clear 자체를 거부하면 실제 화면 제거를 보장하지 않지만 Runtime 결과는 바꾸지 않는다.
- Runtime semantics 불변이므로 GPT RC-01~08은 재실행하지 않았다. DeepSeek·다른 OS/Node 조합은 계속 NOT VERIFIED. 전체 upstream suite/e2e/build는 미실행이다.
- **다음 작업:** 사용자 확인 후 다음 관찰/Host 개선 범위를 정한다. DAG Projection 또는 worktree는 별도 승인 범위이며 이번에 구현하지 않았다.
- **커밋·푸시:** 하지 않음. 안정 태그 `weavra-v0.1-rc1`은 수정·이동하지 않았다.

---

## LOG-024 — Weavra Status Projection 커밋·푸시 준비

- **기록일:** 2026-09-16 17:18 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-023의 Status Projection 변경을 커밋하고 `origin/devlop`에 게시하기 위한 검증 완료.
- **변경 파일:** LOG-023의 status formatter·Extension 연결·테스트·README·작업 이력 총 8개 파일. 이번 준비에서는 작업 이력만 추가했다. dependency/lockfile/launcher/Runtime core 변경은 없다.
- **이번 검증:** `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check` PASS. `git status --short --branch`와 staged diff로 대상 외 변경·기존 staged 파일이 없음을 확인했다. RC tag object/peeled SHA가 기존 기준점과 같음을 확인했다.
- **과거 검증과 구분:** 33개 파일·975개 PASS 및 실제 TUI smoke는 LOG-023의 구현 검증 결과다. 이번 커밋 준비에서는 테스트·실제 Provider를 재실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 명시적 8개 경로만 stage하며 일반 commit/push와 검사 절차를 유지한다.
- **남은 제한·다음 작업:** 기존 플랫폼/DeepSeek/외부 footer 미검증과 Runtime semantics 불변을 유지한다. 게시 후 로컬·원격 HEAD 일치, clean, RC 태그 불변을 확인한다. 이후 제품 범위는 별도 사용자 승인에 따른다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): project Weavra runtime status in the Pi footer`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. `weavra-v0.1-rc1`은 수정·이동·재생성하지 않는다.

---

## LOG-025 — Fork-local Weavra Launcher

- **기록일:** 2026-09-16 17:31 (KST)
- **상태:** 구현·자동 회귀 완료 / 미커밋. 실제 full build 및 built CLI 성공 startup 미검증.
- **목적:** 기존 global `pi` 설치를 보존하면서 `weavra`는 같은 kjg8619/pi checkout의 coding-agent build와 Runtime을 실행하도록 한다.
- **시작 상태:** `devlop` clean, HEAD/origin `2205dec84fa4d397ec70032459dfc4934c052b12`. LOG-024 뒤 사용자 승인으로 Status Projection을 해당 커밋에 게시한 상태다. RC tag object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c` 및 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 유지한다.

### 조사·구현·변경 파일

- `packages/coding-agent/package.json`의 공식 bin은 `dist/bundle/cli.js`다. 기존 root build가 workspace 의존성을 순서대로 빌드하고 `scripts/build-coding-agent-bundle.mjs`가 이 executable과 SDK/chunks를 생성함을 확인했다. 새 fork-specific Pi Core나 별도 build pipeline은 필요 없다.
- `packages/company-runtime/bin/weavra`: `command -v pi`를 제거하고 실제 launcher 위치에서 checkout root를 계산해 `packages/coding-agent/dist/bundle/cli.js`를 고정한다. local CLI가 일반 파일·readable·executable이 아니면 명시적 경로와 `cd <checkout> && npm install --ignore-scripts && npm run build` 안내 후 exit 1이다. help/version도 예외가 아니며 local CLI 오류 후에도 global fallback은 없다.
- Extension과 CLI를 checkout 기준 절대경로로 넘기고 기존 `exec "$PI" -e "$EXTENSION" "$@"` 방식을 유지한다. npm-link/상대·연쇄 symlink·checkout alias·공백 경로를 지원한다. 경로 계산의 subshell `cd`에만 `CDPATH=`를 적용해 사용자 CDPATH에 의한 다른 경로 선택/추가 출력을 막으며 caller cwd/env는 바꾸지 않는다.
- `packages/company-runtime/test/launcher.test.ts`: local CLI process fixture를 임시 checkout에 만들고 실제 Extension 소스를 복사해 public loader 검사도 유지한다. 기본 PATH에는 node만 준비하고 pi는 두지 않는다. 다른 버전 global Pi trap, 실행/누락/실패 시 미호출, symlink·cwd·argv/env·stdio·exit/signal 및 실제 격리 npm link의 기존 pi 보존을 검증한다. built Pi 자체의 통합 실행으로 오인하지 않도록 fixture 목적을 주석에 명시했다.
- `README.md`, `packages/company-runtime/README.md`: global Pi 설치 요구를 제거하고 root install→build→Weavra workspace만 link하는 흐름을 문서화했다. `pi`와 `weavra` 공존, local help/version, no fallback, pull/source/dependency 변경 뒤 rebuild, offline build, 설정/session 미분리를 설명한다.
- `docs/WORK_LOG.md`: 현재 요약과 본 기록. 변경은 총 **5개 파일**이며 package metadata/lockfile/build scripts/Pi Core/Runtime 및 Status Projection 소스는 그대로다.

### 실행·버전·설정 경계

```text
pi      → 기존 사용자 설치 (executable/symlink 불변)
weavra  → exec <checkout>/packages/coding-agent/dist/bundle/cli.js
               -e <checkout>/packages/company-runtime/src/extension.ts <args>
```

Global Pi 버전과 실행 경로가 Weavra의 CLI 선택에 영향을 주지 않는다. 같은 checkout의 CLI와 Extension을 사용하지만 **오래된 local build를 자동 검출하거나 재빌드하지는 않는다.** checkout 갱신 시 사용자가 다시 build해야 한다. Weavra 제품 버전과 Pi 버전은 여전히 별개다. `~/.pi`·auth/models/settings/sessions 및 `PI_CODING_AGENT_DIR` 등 환경변수는 그대로이며 별도 Weavra 디렉터리 분리는 후속 설계로 남긴다. Policy/Approval/Risk/Workflow/RC 의미는 변경하지 않는다.

### 이번 검증 명령과 실제 결과

```sh
# packages/company-runtime
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
bash -n packages/company-runtime/bin/weavra
git diff --check
```

- 초기 launcher/config/Extension/status targeted **4개 파일·112개 PASS**. 최종 전체 targeted **Runtime 19개 파일·545개 + coding-agent 14개 파일·437개 = 33개 파일·982개 PASS**, 실패/skip 0. Launcher는 기존 13개를 local 실행 계약으로 갱신하고 순증 7개인 **20개**다. LOG-023의 975개는 과거 결과이며 이번에 모두 다시 실행했다.
- global Pi 없는 PATH에서도 local fixture 실행, global `0.1.0`/`999.0.0` 존재 시 미호출 및 직접 `pi --version` 결과 보존, local build 누락/디렉터리/비실행 파일 시 명확한 fail-fast, local exit 42 뒤에도 fallback 없음, npm-link/checkout alias·공백·빈 인수·shell 문자·cwd·HOME/agentDir·stdio·exit 23·SIGTERM을 검증했다.
- 테스트에서 실제 `npm link --workspace packages/company-runtime --ignore-scripts --offline`을 **임시 npm prefix**에 수행했다. `weavra`가 저장소 launcher를 가리키고 미리 만든 `pi` symlink와 대상 bytes/실행 결과가 그대로임을 확인했다. 사용자 global prefix는 변경하지 않았다.
- `npm run check`: PASS(TypeScript/deps/entry graph/shrinkwrap/install-lock/browser smoke 포함). 최초 Biome은 launcher test 한 파일만 포맷했고 그 이후 전체 targeted를 실행했다. npm link가 bin에 weavra만 추가함을 확인하는 assertion 보강 뒤 launcher **20개 PASS**를 재확인했고 최종 root check도 자동 수정 없이 PASS했다. `bash -n`과 `git diff --check`: PASS. 이번 테스트 실패는 없다.
- 임시 Python 검사로 모든 Runtime/Status 소스·Pi Core·package/lock·RC 태그·기존 global pi symlink 불변, 문서 상대 링크/fence 및 LOG-001~024 본문 보존을 확인했다(PASS). 검사 script는 실행 후 삭제했다.
- 실제 checkout에는 `packages/coding-agent/dist/bundle/cli.js`가 없었다. `/tmp`에서 실제 launcher `--version` 실행 시 checkout build 안내·`No global Pi fallback`과 **exit 1**을 확인했다. 설치된 `/Users/kangjingoo/.local/bin/pi`는 시작과 동일한 symlink로 남았다. 이는 성공 startup 검증이 아니라 의도된 build-missing 경계 검증이다.

### 문제·해결·남은 제한·다음 작업

- 문제는 global Pi 업데이트/경로 선택이 Weavra와 별개로 달라지는 것이었다. 기존 공식 built bin 경로만 사용하여 실행 파일 결합을 checkout으로 옮겼으며 global Pi를 제거/수정하거나 runtime 권한을 바꾸지 않았다.
- 저장소 지침상 명시 요청 없이 build를 실행하지 않는다. 이번에는 `npm run build`/`build:offline`을 실행하지 않았고 build 산출물을 실제 checkout에 임의로 만들지도 않았다. 자동 테스트의 local CLI는 process fixture이며 실제 bundled Pi 성공 실행·TUI smoke를 대신하지 않는다.
- GPT RC-01~08/DeepSeek/유료 Provider/전체 upstream suite/e2e/다른 OS는 미실행. 현재 macOS/Node 환경의 자동 회귀와 실행 연결 경계만 검증했다.
- **다음 작업:** 사용자 승인 후 root build와 실제 fork-local `weavra --version`/TUI 네 명령·Status Projection smoke를 수행한다. 설정/session directory 분리는 별도 설계 범위다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1` 안정 기준점을 그대로 유지한다.

---

## LOG-026 — Fork-local Launcher 사용자 실행 확인

- **기록일:** 2026-09-16 17:37 (KST)
- **상태·목적:** 사용자가 직접 명령을 실행해 정상 동작했다고 보고한 후속 수동 확인을 기록한다.
- **변경 파일:** `docs/WORK_LOG.md`의 현재 요약 및 본 항목만 갱신했다. 코드·설정·태그는 변경하지 않았다.
- **검증·출처:** 사용자 실행 성공 보고를 수신했다. 구체적인 명령·출력·build 방식·CLI 버전·네 명령/Status Projection 화면은 전달되지 않았다. 에이전트가 실제 built CLI를 실행한 결과나 전체 TUI/RC PASS로 확대하지 않는다. LOG-025의 자동 982개 PASS는 직전 구현 검증 결과이며 이번에 재실행하지 않았다.
- **문제·해결:** 이전 기록의 에이전트 미실행 사실은 보존하고 사용자 확인을 별도 후속 evidence로 연결했다.
- **남은 제한·다음 작업:** 추가 build를 자동 실행하지 않는다. 필요 시 구체적인 version/TUI 결과를 후속 기록한다. 설정/session directory 분리는 별도 설계로 유지한다.
- **커밋·푸시:** 하지 않음. launcher 변경은 계속 미커밋이다.

---

## LOG-027 — Fork-local Launcher 커밋·푸시 준비

- **기록일:** 2026-09-16 17:41 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-025~026의 fork-local launcher 변경과 사용자 확인 기록을 커밋하고 `origin/devlop`에 게시하기 위한 검증 완료.
- **변경 파일:** `README.md`, `packages/company-runtime/README.md`, `packages/company-runtime/bin/weavra`, `packages/company-runtime/test/launcher.test.ts`, `docs/WORK_LOG.md` 총 5개. 이번 준비에서는 작업 이력만 갱신했다.
- **이번 검증:** `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check` PASS. `git status --short --branch`와 staged diff로 대상 외 변경·기존 staged 파일이 없음을 확인했다. RC tag object/peeled SHA 불변을 확인했다.
- **과거 검증과 구분:** 자동 33개 파일·982개 PASS와 launcher 20개 재검증은 LOG-025 결과다. 사용자 정상 실행 보고는 LOG-026의 수동 evidence이며 상세 명령/출력은 미수집이다. 이번 준비에서는 테스트/build/실제 Provider를 재실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 명시적 5개 경로만 stage하고 일반 commit/push를 사용한다. global Pi 설치/명령과 Runtime/Status/Policy 의미는 그대로다.
- **남은 제한·다음 작업:** 기존 build freshness·설정/session 공유·플랫폼 미검증 제한을 유지한다. 게시 후 로컬·원격 HEAD 일치, clean, RC 태그 불변을 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `fix(coding-agent): launch Weavra with the fork-local Pi build`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. 안정 태그는 수정·이동하지 않는다.

---

## LOG-028 — Weavra Worktree Launcher V1

- **기록일:** 2026-09-16 18:02 (KST)
- **상태:** 구현·자동 회귀 완료 / 미커밋
- **목적:** 원본 checkout의 파일·HEAD·branch를 유지하면서 명시적으로 생성한 Git worktree에서 기존 Weavra를 실행한다.
- **시작 상태:** `devlop` clean, HEAD `14c3f699202e937ddae8bdc9f487cf57c7afe8aa`. LOG-027 이후 fork-local launcher가 이 커밋에 반영된 상태였다. RC tag object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c`와 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 시작·최종 조회에서 동일했다.

### 구현·변경 파일

- `packages/company-runtime/bin/weavra`: 기존 fork-local CLI/Extension 경로·local build 사전 검사를 유지한다. `--worktree <name>`만 배열 기반으로 소비하고 `--` 이후는 그대로 전달한다. 기본 `weavra`는 기존 cwd/argv/env/stdio/exit/signal 계약을 유지한다.
- Git root를 canonical 경로로 확인하고 HEAD commit·branch를 고정한다. clean tracked/staged/untracked·submodule 상태와 검사 성공을 요구한다. 이름은 ASCII 제한 및 `git check-ref-format --branch`로 검증하고 기존 branch/target은 거부한다. source 상태는 생성 직전·직후·Pi 실행 전 재검증한다.
- `<repo-parent>/.weavra-worktrees/<repo-name>/<name>`에 부모 디렉터리를 준비하고 target을 `mkdir`로 배타 예약한다. Git이 기존 빈 target을 허용하는 동작에 의존해 사용자 빈 디렉터리를 재사용하지 않도록 하기 위함이다. `git worktree add -b weavra/<name> <target> <frozen-head>`를 quoted argv로 실행하며 eval/명령 문자열 재해석은 없다.
- 생성 후 target HEAD·branch·clean 상태를 확인하고 stderr에 Branch/Path/Base를 표시한다. target 루트로 cwd를 바꾼 후 기존 `exec <checkout>/packages/coding-agent/dist/bundle/cli.js -e <checkout>/packages/company-runtime/src/extension.ts <args>`로 교체한다. 별도 Pi proxy·signal handler·global fallback·종료 후 cleanup은 없다.
- source index의 불필요한 쓰기와 checkout/fsmonitor hook 부작용을 막도록 launcher Git 명령에만 optional locks 비활성·hooks/fsmonitor override를 적용한다. repository를 바꾸는 Git 환경변수, worktree 부모 symlink, source 내부 target, 줄바꿈 root 경로는 보수적으로 거부한다. Pi 환경 자체를 정리하거나 trust를 허용하지 않는다.
- `packages/company-runtime/test/worktree.test.ts` 신규 **55개**: 실제 임시 Git, fork-local CLI process fixture, global Pi trap, Git argv audit/실패 주입으로 생성·보호·충돌·실패·종료 보존을 검증한다.
- `packages/coding-agent/test/suite/company-runtime-workflow.test.ts` **3개 추가**: 기존 suite harness/faux SDK를 사용한다. 실제 launcher가 만든 worktree cwd에서 실제 Worker/Policy/Git checks/StateStore를 실행하여 COMPLETED/BLOCKED/CANCELLED, 작업 파일·`.ai`·branch/worktree 보존 및 source 무변경을 확인한다. CLI 프로세스만 cwd 출력 fixture이며 실제 bundled CLI 전체 실행은 아니다.
- `README.md`, `packages/company-runtime/README.md`: 두 실행 방식, 생성 위치/branch, clean source/config 사전 commit, ignored 파일 미복사, no automatic merge/commit/stash/reset/remove, 수동 검토와 OS sandbox 아님을 설명한다.
- `docs/WORK_LOG.md`: 현재 요약 및 이 항목. 총 **6개 파일** 변경이다. 기존 launcher test는 수정 없이 재실행했다.

### 안전 경계와 유지한 의미

원본 Git checkout으로 돌아가는 checkout/reset/stash/clean이나 자동 commit/merge/rollback/branch 삭제/worktree 삭제/PR/충돌 해결은 구현하지 않았다. 실패·BLOCKED·CANCELLED·SIGTERM/SIGINT 종료에도 생성 결과를 남긴다. Git add 실패 또는 사후 검사 실패에서도 성공 안내/Pi 실행을 차단하고 부분 생성 branch/worktree·예약 디렉터리를 자동 정리하지 않는다. 외부 프로세스가 source HEAD/branch를 바꾼 경우에도 감지·중단할 뿐 원상복구하지 않는다.

Kernel/Workflow/QUICK·STANDARD/R0~R3/Policy/Approval/Reviewer/Verification/StateStore/RuntimeEvent/Status Projection·worker 도구/prompt의 구현은 변경하지 않았다. `.ai`는 기존 cwd 계약에 따라 worktree에 저장된다. Pi Core/공식 bin/build scripts/package metadata/dependencies/lockfile도 불변이다.

### 이번 검증 명령·실제 결과

```sh
# packages/company-runtime: launcher/worktree, Status Projection, S0~S6 + RC
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/worktree.test.ts test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent: faux Runtime/RC/Status 및 관련 기존 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
bash -n packages/company-runtime/bin/weavra
git diff --check
git rev-parse HEAD weavra-v0.1-rc1 'weavra-v0.1-rc1^{}'
```

- 자동 환경: Darwin arm64, Node `v26.7.0`, 로컬 Git/POSIX. Runtime **20개 파일·600개**, coding-agent **14개 파일·440개**, 합계 **34개 파일·1,040개 PASS**, 실패/skip 0. LOG-025의 982개는 과거 결과이며 이번에 모두 다시 실행했다. 신규 55+3개를 포함한다.
- 초기 launcher/worktree **2개 파일·71개 PASS** 후 추가 경로 보호 4개를 보완했고 최종에는 worktree 55개·기존 launcher 20개가 포함됐다. 공백/빈/shell 문자 argv, canonical subdirectory/npm link, detached/linked-worktree source, 정확한 add argv, 원본 bytes/index/HEAD/branch 불변, 세 종류 dirty, 기존 branch/빈·비어있지 않은 디렉터리/file/dangling symlink를 검증했다.
- non-Git/unborn HEAD, Git root/HEAD/branch/status/ref/add/사후 검사 실패, 부분 add, dirty target, 전후 source 교체, source 내부 target·줄바꿈 경로·symlink/비디렉터리 부모·Git 환경 override·hook 차단·build 누락을 검증했다. 모든 launcher Git 호출은 읽기 검사 및 `worktree add -b` allowlist로 감사했고 global Pi trap은 한 번도 호출되지 않았다.
- 종료 코드 0/23, SIGTERM/SIGINT, CLI outcome별 `.ai`/branch/worktree 보존을 process fixture로 검증했다. 별도로 실제 SDK/faux 통합에서 worktree의 파일만 수정되고 `.ai/state.json`에 실제 terminal이 저장되며 lock이 정상 해제되는지 검증했다.
- 통합 초기 **43 PASS / 3 FAIL**은 macOS `/var`와 canonical `/private/var`의 테스트 기대 경로 불일치였다. `realpathSync`로 기대 경로를 정규화하고 stderr를 capture하도록 고쳐 해당 suite **46개 PASS**, 최종 전체 440개 PASS를 확인했다. launcher/Runtime guard를 완화하지 않았다.
- `npm run check`: **PASS**, TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함. Biome은 이번 두 테스트 파일만 포맷했다. 이후 전체 targeted를 실행했다. `bash -n`, `git diff --check`: **PASS**. 최종 문서 기록 후 root check를 다시 실행해 자동 수정 없이 PASS했고 `bash -n`·`git diff --check`도 PASS했다. 임시 Python 검사로 정확한 6개 변경 파일, staged 변경 없음, LOG-001~027 본문 보존, Markdown fence/공백, HEAD/RC tag 불변, 실제 프로젝트 `.ai` 부재를 확인했다(PASS). 검사 script는 제거했다.

### 한계·다음 작업·커밋

- source/worktree는 Git object/ref 저장소를 공유한다. 외부 프로세스의 검사/생성 사이 교체, trusted Git filter·등록 check·Pi 내부 부작용은 OS 수준으로 격리하지 않는다. 생성 실패 후 남은 디렉터리/branch는 사용자가 직접 검토한다.
- uncommitted/ignored 파일·node_modules·기존 `.ai` 실행 상태는 복사하지 않는다. worktree에 필요한 config/check는 먼저 commit하고 의존성 등은 사용자가 준비해야 한다. 자동 build/freshness 검사·독립 auth/session 디렉터리는 추가하지 않았다.
- Runtime semantics 불변이므로 실제 GPT RC-01~08을 재실행하지 않았다. 유료 Provider·실제 bundled Pi/TUI startup·build·전체 upstream suite/e2e·다른 OS/Node 조합은 이번에 미실행이다. 실제 워크플로 검증은 기존 harness/faux이며 CLI fixture와 구분한다.
- **다음 작업:** 사용자가 clean 프로젝트에서 `weavra --worktree <name>`을 실행하고 남은 worktree의 diff/state/check 결과를 직접 검토한다. 후속 확장은 별도 승인 범위다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1`은 이동·수정하지 않았다.

---

## LOG-029 — Weavra Worktree Launcher V1 커밋·푸시 준비

- **기록일:** 2026-09-16 18:11 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-028의 worktree launcher V1을 커밋하고 `origin/devlop`에 게시하기 위한 검증을 완료했다.
- **변경 파일:** `README.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`, `packages/company-runtime/bin/weavra`, `packages/company-runtime/test/worktree.test.ts`, `packages/coding-agent/test/suite/company-runtime-workflow.test.ts` 총 6개. 이번 준비에서는 현재 요약과 이 항목만 갱신했다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `bash -n packages/company-runtime/bin/weavra` 및 `git diff --check` PASS. `git status --short --branch`, diff 목록, 기존 staged 변경 없음, HEAD 및 RC tag object/peeled commit 불변을 확인했다.
- **과거 검증과 구분:** 34개 파일·1,040개 PASS는 LOG-028 구현 검증 결과다. 이번 커밋 준비에서는 테스트/build/실제 Provider를 다시 실행하지 않았다. `--model provider/model`은 부모 Pi 모델의 선택 옵션이며 workflow worker 모델은 기존 `.ai/config.yaml`을 따른다는 후속 설명도 전달했다. 코드 변경은 없다.
- **문제·해결:** 추가 문제 없음. Runtime/Status/Policy 의미 및 global Pi 설치를 그대로 유지하고 명시적 6개 경로만 stage한다. dependency/lockfile 변경은 없다.
- **남은 제한·다음 작업:** 기존 플랫폼/실제 bundled CLI·TUI 미검증 및 worktree의 비-sandbox 한계를 유지한다. 일반 commit/push 후 원격 HEAD 일치, clean working tree와 RC 태그 불변을 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): launch Weavra in isolated Git worktrees`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. 안정 태그 `weavra-v0.1-rc1`은 이동·수정하지 않는다.

---

## LOG-030 — Weavra Worktree Open/List: 기존 등록 재접속과 읽기 전용 조회

- **기록일:** 2026-09-16 19:36 (KST)
- **상태:** 구현·자동 회귀 완료 / 미커밋
- **목적:** create-only V1을 유지하면서 종료 후 기존 worktree를 다시 열고 Pi의 기존 session 옵션을 전달한다. 별도 registry 없이 Git 등록만 조회한다.
- **시작 상태:** `devlop` clean, HEAD `965240041e697028fa4e60c7192be70ff494d2aa`. LOG-029 뒤 worktree V1은 해당 커밋으로 게시됐다. RC tag object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c`와 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 시작·최종 조회에서 동일했다.

### 문제·구체적 동작·해결

기존 `weavra --worktree test-1`은 생성하고 종료하면 worktree/branch를 남기지만, 다시 같은 명령을 실행하면 create-only 충돌로 실패한다. 사용자가 경로를 직접 찾아 `cd`해야 했던 재접속을 `--worktree-open test-1`로 분리했다. `--worktree-list`로 현재 common repository의 `weavra/*` 등록을 찾는다. 기존 생성 명령을 재사용 모드로 바꾸지 않는다.

### 변경 파일과 설계

- `packages/company-runtime/bin/weavra`: `--worktree`/`--worktree-open`/`--worktree-list`를 상호 배타적으로 파싱한다. `--` 이후와 나머지 Pi argv는 재해석 없이 보존한다. create의 실제 Git 생성·clean source·충돌/전후 검증 본문은 그대로다.
- open은 기존 local CLI/Extension 사전 검사 후 launcher helper에서 검증한 canonical cwd로 이동하여 같은 fork-local Pi를 `exec`한다. 별도 Pi proxy/signal handler/global fallback은 없다. `--continue`/`-c`, `--resume`/`-r`, `--session <path|id>`는 launcher가 해석하지 않는다.
- list는 Pi/Extension을 실행하지 않는 조회이므로 build/Extension 검사 전에 분기한다. 추가 Pi 인수는 거부하며 Node/Git/helper만 필요하다. 이 예외는 create/open의 local build 요구를 바꾸지 않는다.
- 신규 `packages/company-runtime/src/launcher-worktrees.ts`: Node native TypeScript로 실행하는 launcher 전용 CLI. Runtime/Extension에서는 import하지 않는다. `spawnSync`의 argv로 `git worktree list --porcelain -z`를 읽고 NUL 구분을 파싱한다. 별도 registry/state/cache 파일과 `.ai`·Pi session 읽기/복제는 없다.
- open은 생성과 같은 보수적 이름 및 Git branch validity, 정확한 `refs/heads/weavra/<name>` 등록 1개, 실제 root·같은 canonical common repository·일치하는 branch/HEAD, linked metadata의 gitdir 역참조와 index를 검증한다. 등록 목록과 metadata를 다시 확인하여 검사 중 변경을 거부한다. 사용자가 정상 이동한 worktree는 현재 등록 경로를 사용하며 기본 생성 경로를 추정하지 않는다.
- branch만 있는 경우, 중복/위장 등록, wrong branch/repository, missing/broken/prunable, 최종 경로 symlink/줄바꿈은 open 실패다. 자동 생성/prune/repair/recreate/move/delete/branch 삭제는 없다. 정상 locked 등록은 open 가능하다.
- open에서는 source/target dirty 여부를 검사하지 않는다. staged/unstaged/untracked와 `.ai` 변경은 그대로 보존한다. Git 조회는 optional locks와 hooks/fsmonitor를 끄고 repository override 환경변수를 거부한다. index 검사에는 읽기 전용 `ls-files --stage -z`를 사용한다.
- list는 `refs/heads/weavra/*`만 NAME/BRANCH/PATH/STATUS로 표시한다. 상태는 `OK`, `LOCKED`, `PRUNABLE`, `MISSING/BROKEN`, `BROKEN`, `AMBIGUOUS`이며 파일 수정이나 clean/Runtime 성공 판정이 아니다. 경로 제어 문자는 escape한다. Git 목록 자체가 실패/손상되면 성공 목록을 출력하지 않는다.
- `packages/company-runtime/test/worktree.test.ts`: 기존 55개를 유지하고 open/list **58개 추가**, 공통 fixture에 새 helper 복사 및 읽기 전용 argv audit/파일 snapshot을 연결했다. 제품 코드의 생성/정리 권한을 테스트에 맞춰 완화하지 않았다.
- `README.md`, `packages/company-runtime/README.md`: create/open/list 구분, Pi session 인수, dirty 허용과 Runtime baseline 조건의 차이, 목록 상태/build 예외, 이동/손상/동시 변경 및 수동 점검 한계를 설명한다.
- `docs/WORK_LOG.md`: 현재 요약 및 본 항목. 총 **6개 파일** 변경이다. Pi Core/bin/SessionManager/SDK와 Runtime·Policy·Approval·Workflow·Status Projection 구현, 기존 coding-agent 테스트, dependency/lockfile/package metadata는 변경하지 않았다.

### 이번 검증 명령·실제 결과

```sh
# packages/company-runtime — launcher/worktree, Status, S0~S6/RC
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/worktree.test.ts test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent — 기존 faux Runtime/RC/Status·Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
bash -n packages/company-runtime/bin/weavra
git diff --check
packages/company-runtime/bin/weavra --worktree-list
git rev-parse HEAD weavra-v0.1-rc1 'weavra-v0.1-rc1^{}'
```

- 환경: Darwin arm64, Node `v26.7.0`, Git `2.50.1 (Apple Git-155)`. 최종 **Runtime 20개 파일·658개 + coding-agent 14개 파일·440개 = 34개 파일·1,098개 PASS**, 실패/skip 0. LOG-028의 1,040개는 과거 결과이며 이번에 모두 다시 실행했다.
- 초기 launcher/worktree **2개 파일·126개 PASS** 후 추가 7개를 보완했다. 최종에는 기존 launcher 20개 + worktree 113개(기존 55 + 신규 58)가 포함된다. 이번 작업에서 테스트 실패는 없었다.
- create 종료 후 open, Pi cwd/전체 argv/env/stdio/exit23/SIGTERM, dirty source+target의 staged/unstaged/untracked/`.ai` 및 파일·Git index/ref bytes 불변, worktree의 후속 commit 유지, 수동 이동/다른 linked source discovery를 검증했다.
- 잘못된 이름·옵션 충돌·branch-only·wrong branch/default path, 누락/손상 `.git`/index/symlink, prunable, 중복/변경/위장 목록, 동일 path/branch의 다른 repository 및 같은 common repository의 잘못된 backlink를 거부했다. list는 dirty 상태/build·Extension 부재에서도 동작하고 prefix 필터·locked/prunable·empty 목록·Git 실패·경로 제어문자 escaping·읽기 전용 argv를 확인했다. 모든 경우 global Pi trap은 호출되지 않았다.
- `npm run check`: PASS(TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함). Biome은 이번 helper와 worktree 테스트만 포맷했고 이후 전체 targeted를 실행했다. `bash -n`, `git diff --check`: PASS.
- 최종 문서 기록 후 root `npm run check`를 재실행해 자동 수정 없이 PASS했다. `bash -n`·`git diff --check` 및 임시 Python 검사도 PASS했다. 정확한 6개 변경 파일, staged 변경 없음, 기존 create 실행 본문과 LOG-001~029 본문 보존, 문서 fence/공백, HEAD/RC 태그 불변, 실제 프로젝트 `.ai` 부재를 확인했다. 검사 script는 제거했다.
- 실제 작업 checkout에서 `packages/company-runtime/bin/weavra --worktree-list`: exit 0, NAME/BRANCH/PATH/STATUS 헤더만 출력. 현재 repository에는 대상 등록이 없으며 dirty checkout도 조회를 막지 않았다. Pi/Provider/Runtime 명령은 시작하지 않았다. RC 태그와 HEAD 불변을 재확인했다.

### 남은 한계·다음 작업·커밋

- Pi session 선택 UI 자체는 이번 테스트에서 실행하지 않았다. launcher가 정확한 cwd/인수를 넘기는 process fixture와 기존 coding-agent 회귀를 검증했다. session 존재/선택/오류 처리는 기존 Pi가 소유한다. 사용자가 worktree를 이동했다면 이전 cwd의 Pi session을 자동 이관하지 않는다.
- open의 dirty 허용은 launcher 접근 조건이다. 새 `/workflow run`의 clean baseline·Policy·Approval·writer lock 조건을 완화하거나 기존 workflow를 자동 재개하지 않는다. `.ai`는 registry가 아니며 자동 commit/merge/stash/reset/clean/rollback/삭제는 없다.
- common Git object/ref는 계속 공유한다. Git 검사/exec 사이 외부 교체를 원자적으로 막는 잠금이나 OS sandbox는 아니다. 검사 중 변경을 감지하면 수동 재시도를 요구한다. UTF-8 Git 출력·Git 명령당 10초/8 MiB 한도를 사용하며 한도 초과도 open 성공으로 처리하지 않는다. 다른 OS/Node·구버전 Git은 미검증이다.
- 실제 bundled Pi/TUI·session picker smoke, build, 전체 upstream suite/e2e, 유료 GPT RC-01~08/DeepSeek는 재실행하지 않았다. Runtime semantics 불변이므로 새 실제 Provider 검증을 주장하지 않는다.
- **다음 작업:** 사용자 프로젝트에서 `--worktree-list`와 `--worktree-open <name> --continue/--resume`를 사용해 기존 Pi session을 선택한다. 추가 자동 복구/관리 기능은 별도 승인 범위다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1`을 그대로 유지한다.

---

## LOG-031 — Weavra Worktree Open/List 커밋·푸시 준비

- **기록일:** 2026-09-17 08:57 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-030의 Open/List 변경을 커밋하고 `origin/devlop`에 게시하기 위한 검증을 완료했다.
- **변경 파일:** `README.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`, `packages/company-runtime/bin/weavra`, `packages/company-runtime/src/launcher-worktrees.ts`, `packages/company-runtime/test/worktree.test.ts` 총 6개. 이번 준비에서는 현재 요약과 이 항목만 갱신했다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `bash -n packages/company-runtime/bin/weavra`, `git diff --check` PASS. `git status --short --branch`, diff 목록, 기존 staged 변경 없음과 RC tag object/peeled commit 불변을 확인했다.
- **과거 검증과 구분:** 34개 파일·1,098개 PASS와 실제 checkout의 list 조회는 LOG-030 구현 검증 당시 결과다. 이번 커밋 준비에서는 테스트/build/실제 Provider/TUI를 재실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 명시적 6개 경로만 stage하고 일반 commit/push를 사용한다. create-only 의미, Runtime/Policy/Approval/Workflow/Status Projection, global Pi 설치 및 dependency/lockfile은 그대로다.
- **남은 제한·다음 작업:** 기존 실제 session picker/TUI·플랫폼 미검증과 비-sandbox 한계를 유지한다. 게시 후 원격 HEAD 일치, clean working tree와 RC 태그 불변을 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): reopen and list existing Weavra worktrees`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. 안정 태그 `weavra-v0.1-rc1`은 이동·수정하지 않는다.

---

## LOG-032 — V0.2A: Read-only DAG Projection

- **기록일:** 2026-09-17 09:34 (KST)
- **상태:** 구현·자동 회귀 완료 / 미커밋
- **목적:** 기존 Runtime snapshot과 저장된 Step/attempt·역할·Review·Check·Approval을 DAG DTO/ASCII로 표현한다. 실행 scheduler나 새로운 state authority를 만들지 않는다.
- **시작 상태:** `devlop` clean, HEAD `add45781dc6b937e3212951fd591484272a3021a`. LOG-031 뒤 Open/List를 이 커밋에 게시한 상태였다. RC tag object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c`와 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 시작·최종 조회에서 동일했다.

### 문제·구체적 trace·설계

기존 Run에는 currentStep·revisionCycle·reviewHistory·step이 연결된 verification·approval ledger가 있지만 모든 과거 step 완료 이벤트가 저장되는 것은 아니다. 예를 들어 REVISE 뒤에는 `implement:2`로 이동하고 이전 handoff는 덮어쓰지만 reviewHistory와 `self-check:1` 결과는 남는다. 이 저장 사실로 attempt를 펼치되 없는 결과를 이벤트 재생이나 PASS 추정으로 채우지 않는 순수 projection을 추가했다.

- `review:1 --revise--> implement:2`로 연결해 재작업 순환을 펼친다. 이미 REVISE로 넘어간 attempt의 TEST/COMPLETE는 실행 node로 만들지 않는다. current attempt의 남은 단계는 pending 또는 terminal 이후 skipped다.
- R3의 `approval:1`/`mutation:1`은 `parentId: implement:1`, `stepId: implement`인 projection detail이다. `contains`/`approved` 관계는 Developer 완료나 독립 Kernel step을 뜻하지 않는다. APPROVED는 mutation 완료가 아니며, Run의 CONSUMED가 있어야 해당 mutation을 passed로 표시한다. 승인 후 소비 기록 없이 종료되면 효과를 unknown으로 남기고 `/state decisions`의 action 기록을 안내한다.
- 기존 Check/Review PASS가 있어도 COMPLETE에서 stale evidence로 BLOCKED되면 과거 PASS와 현재 completion blocked를 함께 표시한다. 입력 Run/Check/Review/Approval status를 재작성하지 않는다.
- 현재 호출 시점의 snapshot만 투영한다. `/graph`가 RuntimeEvent를 저장/재생하거나 새로운 bus/cache를 만들지 않는다. V0.2A에는 자동 갱신 UI가 없으며 향후 Viewer는 event를 snapshot 재계산 trigger로만 사용할 수 있다. 실제 event 경계에서의 무변경 조회는 이번 faux 통합으로 검증했다.

### 변경 파일

- 신규 `packages/company-runtime/src/graph.ts`: `GraphProjection`, `GraphNode`, `GraphEdge`, `GraphNodeStatus`, `projectRunGraph(unknown)`, `renderGraphText(graph)`, `GraphProjectionError`. 기존 contracts/TypeBox만 사용하는 순수 모듈이며 Pi/UI/Provider/fs/clock/process 의존성이 없다.
- DTO는 원본 runId/workflow/risk/status와 source revision/recorded 시각, deterministic node/edge 및 diagnostics를 담는다. node 상태는 pending/running/passed/failed/blocked/cancelled/skipped/waiting_approval/revised/unknown이며 Review verdict와 Check 원본 상태를 별도로 남긴다. code revision/attempt 순서와 check ID 정렬은 입력 배열 순서에 의존하지 않는다.
- graph 입력은 Run shape와 identity/phase/attempt·중복/모순 metadata를 검사한다. 한도는 attempt 4, review 4, scoped approval 1, checks 1,000이다. step metadata 없는 check를 SELF_CHECK/TEST에 임의 배정하지 않는다. 저장된 COMPLETED라도 current-attempt 근거가 불완전하면 Complete node는 unknown이다. 이는 Kernel 완료 guard 실행이나 저장 상태 변경이 아니다.
- `packages/company-runtime/src/extension.ts`: 기존 명령 loop/inspect에 `/graph`, `/graph latest`, `/graph <full-run-id>`, help를 연결하고 시작/도움말에 discoverability만 추가했다. notification-capable UI/project trust 조건, live owner snapshot·FileStateStore.readSnapshot·local failure 우선/출처 진단을 공유한다. 조회 시 config/auth, writer open, state repair/recovery/resume, Provider/Agent, approval 변경, Git 호출은 없다. 출력은 약 32,000자이며 제어 문자/bidi를 escape한다.
- 신규 `test/graph.test.ts`, `test/graph-command.test.ts`, 공유 fixture `test/graph-fixtures.ts`: 순수 DTO/정렬/불변/회차/상태/승인/누락·손상과 실제 readSnapshot 경계 **59개**.
- `test/extension.test.ts`, `test/launcher.test.ts`: public loader의 기존 네 명령이 새 `/graph`를 포함한 다섯 명령이 되는 것을 확인한다. 기존 로딩/stdio/argv/global Pi 회귀 assertions는 유지한다. `test/host-boundary.test.ts`에는 Graph import graph의 Pi/UI/Provider/fs 독립 검사를 추가했다.
- `packages/coding-agent/test/suite/company-runtime-observations.test.ts`: 기존 harness/faux 실제 SDK/Kernel/StateStore/check 기반 **11개 추가** 및 기존 revision/R3 pending/local storage failure/corruption 사례에 graph assertion을 보강했다. 실제 Provider API/key/유료 token은 사용하지 않았다.
- `README.md`, `packages/company-runtime/README.md`: 사용법, ASCII 출력, projection 전용 node/edge·unknown 한계·source/조회 경계·V0.2B 후속 단계를 설명한다. `docs/WORK_LOG.md`는 현재 요약과 이 항목을 추가했다. 총 **12개 파일** 변경이다.

### 유지한 실행 의미

Kernel/Workflow/QUICK·STANDARD/R0~R3/Reviewer/Verification/Approval/Policy/StateStore/RuntimeEvent·Status Projection 및 Worktree create/open/list 구현은 변경하지 않았다. worker 도구/prompt/역할/승인 권한도 그대로다. Pi Core/bin/SessionManager/package/version/dependencies/lockfile 변경은 없다. DAG Scheduler, node 실행/retry, workflow 편집/drag-drop/parallel/dynamic dependencies, Planner/Lead/COMPLEX/T3Code/Web UI/V0.2B Viewer를 구현하지 않았다.

RUNNING node는 snapshot의 현재 단계 표시이지 OS process liveness가 아니다. 기존 저장 active 상태·writer 파일만으로 live를 주장하지 않는다. 읽기 실패를 이전 성공 graph/export로 대체하지 않고, 같은 Host의 local storage failure는 기존 `/state`처럼 durable 상태와 구분한다. graph 조회 때문에 footer나 실행 상태를 바꾸지 않는다.

### 이번 검증 명령·실제 결과

```sh
# packages/company-runtime — 신규 graph + S0~S6/RC/launcher/status/worktree
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/graph.test.ts test/graph-command.test.ts test/worktree.test.ts test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent — 실제 SDK/faux Runtime/RC/Status와 관련 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
bash -n packages/company-runtime/bin/weavra
git diff --check
git rev-parse HEAD weavra-v0.1-rc1 'weavra-v0.1-rc1^{}'
```

- 환경: Darwin arm64, Node `v26.7.0`. 최종 **Runtime 22개 파일·717개 + coding-agent 14개 파일·451개 = 36개 파일·1,168개 PASS**, 실패/skip 0. 신규 59+11개이며 LOG-030의 1,098개는 과거 결과다. 기존 회귀도 이번에 모두 다시 실행했다.
- 초기 graph/command/extension/launcher/boundary **5개 파일·96개 PASS**, SDK observation suite **22개 PASS** 후 role/scope/approval 모순 검사 3개를 보강하고 최종 전체 회귀를 통과했다. 테스트 실패는 없었다.
- QUICK R0/R1, STANDARD R1/R2, REVISE 1~3회/한도 차단, R3 PENDING/APPROVED/CONSUMED/DENIED/EXPIRED/CANCELLED/INTERRUPTED, BLOCKED/CANCELLED/FAILED, 실제 stale COMPLETE BLOCK, live event 경계와 reload-equivalent 새 Host의 stored terminal graph를 확인했다.
- 순수 frozen input·반환 참조 격리·JSON 재구성·node/edge/check 정렬/앞으로만 향하는 revision edge, malformed/incomplete/과대/다른 identity 거부 및 UNKNOWN, 제어 문자/출력 크기 한도를 검증했다. graph 조회 전후 state/tasks/config/writer bytes와 디렉터리 목록 불변, Provider 호출 0 및 writer 생성 0, Graph import 경계와 기존 status 미변경을 확인했다.
- `npm run check`: PASS(TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함). 첫 실행에서 Biome이 새 테스트의 문자열 결합에 info 1건을 보고했고 template literal로 수정했다. 타입 오류·실패를 완화하지 않았다. 최종 code check에는 info/warning/error가 없으며 formatter 후 전체 targeted를 실행했다. `bash -n`, `git diff --check`: PASS. HEAD/RC 태그도 불변이다.
- config bytes 불변 assertion을 보강한 뒤 `test/graph-command.test.ts`를 재실행해 **15개 PASS**했다(위 합계와 중복). 최종 문서 기록 후 root check를 다시 실행해 자동 수정 없이 PASS했고, `bash -n`·`git diff --check`도 PASS했다. 임시 Python 검사로 정확한 12개 변경 파일, 기존 Runtime/Status/Worktree/Pi/dependency 불변, Extension의 inspect/status/run/lifecycle 본문 보존, LOG-001~031 본문·문서 fence/공백·HEAD/RC 태그 불변 및 실제 프로젝트 `.ai` 부재를 확인했다(PASS). 검사 script는 제거했다.

### 한계·다음 작업·커밋

- 모든 과거 step 완료·세션-attempt 대응이 저장된 것은 아니다. 실제 남은 handoff/check/review로 확인 가능한 부분만 표시하고 나머지는 UNKNOWN이다. graph만으로 현재 diff/check freshness나 action effect를 재검증하지 않는다. 원본 status와 표시 node 상태의 차이는 diagnostics로 설명한다.
- V0.2A는 요청 시점의 ASCII 조회다. 자동 live view/별도 event 저장·replay/Graph DB는 없다. 향후 V0.2B는 동일 DTO와 snapshot authority를 유지해야 하며 아직 진행하지 않았다.
- 실제 bundled Pi/TUI 그래프 화면 smoke, build, 전체 upstream suite/e2e, 다른 OS/Node 조합·실제 GPT RC-01~08/DeepSeek는 이번에 미실행이다. Runtime semantics가 바뀌지 않아 실제 Provider RC를 재호출하지 않았다. 자동 테스트의 real SDK/faux 결과를 유료 Provider/TUI PASS로 확대하지 않는다.
- **다음 작업:** 사용자 환경에서 `/graph` 출력과 정보 한계를 확인하고 V0.2A 안정화 후 V0.2B의 읽기 전용 TUI Viewer 범위를 별도 승인한다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1`을 그대로 유지한다.

---

## LOG-033 — V0.2A Read-only DAG Projection 커밋·푸시 준비

- **기록일:** 2026-09-17 10:13 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-032의 V0.2A 변경을 커밋하고 `origin/devlop`에 게시하기 위한 검증을 완료했다.
- **변경 파일:** `README.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`, `src/graph.ts`, `src/extension.ts`, `test/graph.test.ts`, `test/graph-command.test.ts`, `test/graph-fixtures.ts`, `test/extension.test.ts`, `test/host-boundary.test.ts`, `test/launcher.test.ts`(앞의 상대 경로는 company-runtime 기준), `packages/coding-agent/test/suite/company-runtime-observations.test.ts` 총 12개. 이번 준비에서는 현재 요약과 이 항목만 갱신했다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `bash -n packages/company-runtime/bin/weavra`, `git diff --check` PASS. `git status --short --branch`, diff 목록과 기존 staged 변경 없음, HEAD 및 RC tag object/peeled commit 불변을 확인했다.
- **과거 검증과 구분:** 36개 파일·1,168개 PASS와 graph-command 15개 재검증은 LOG-032 구현 당시 결과다. 이번 커밋 준비에서는 테스트/build/실제 Provider/TUI를 재실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 명시적 12개 경로만 stage하고 일반 commit/push를 사용한다. Runtime 실행 의미·Status/Worktree 구현·Pi Core·dependency/lockfile은 그대로다.
- **남은 제한·다음 작업:** 실제 TUI smoke·플랫폼 미검증 및 누락 과거 결과의 UNKNOWN 한계를 유지한다. 게시 후 원격 HEAD 일치, clean working tree와 RC 태그 불변을 확인한다. V0.2B는 V0.2A 안정화와 별도 승인 후 진행한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): add read-only Weavra DAG projection`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. 안정 태그 `weavra-v0.1-rc1`은 이동·수정하지 않는다.

---

## LOG-034 — V0.2B: Read-only TUI DAG Viewer

- **기록일:** 2026-09-17 11:08 (KST)
- **상태:** 구현·자동 회귀·실제 TUI smoke 완료 / 미커밋
- **목적:** V0.2A GraphProjection을 그대로 보여주는 읽기 전용 TUI viewer를 추가한다. Viewer는 Runtime 실행/승인 authority가 아니다.
- **시작 상태:** `devlop` clean, HEAD `b40c016d385b1c28b8f352c9cb99aceffef7c8bf`. LOG-033 뒤 V0.2A가 이 커밋으로 게시됐다. RC tag object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c` 및 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 그대로다.

### 문제·설계·구조

ASCII snapshot은 모든 기록을 읽을 수 있지만 긴 revision 이력을 한 화면에서 보기 어렵다. `/graph`/`latest`/`runId` 출력은 유지하고 `/graph view [latest|runId]`만 transient overlay로 연결했다. `Runtime snapshot → 기존 GraphProjection → 순수 layout → Pi TUI Component` 순서이며 양쪽 renderer가 각각 Run 상태를 추론하지 않는다.

- `src/graph.ts`의 DTO/projector/ASCII renderer는 byte 변경 없이 재사용한다. viewer는 같은 node ID/status/edge를 받고 glyph·색상·들여쓰기·스크롤만 계산한다. R3 승인과 mutation은 inside IMPLEMENT인 projection detail이며 APPROVED != mutation success와 UNKNOWN/CONSUMED 의미를 그대로 유지한다.
- 첫 버전은 **open 시점의 정적 사본**이다. `Static snapshot`을 표시하고 현재 상태를 보려면 닫고 다시 연다. RuntimeEvent subscription/replay/cache DB/polling/timer를 만들지 않아 late event가 viewer 상태를 바꾸지 않는다. Live update는 별도 후속으로 남겼다.
- 공식 `ctx.ui.custom(..., {overlay:true, overlayOptions:{anchor:"center", width:"96%", maxHeight:"100%", margin:1}})`를 사용한다. Pi Core/TUI 자체, editor component/footer/header/status를 교체하지 않는다.
- 키는 up/k·down/j, PgUp/PgDn, Home/End, Esc/q/Ctrl+C close만 제공한다. viewer-local `DEFAULT_APP_KEYBINDINGS`와 주입된 manager의 user bindings를 조합하며 Pi 전역 manager/config는 변경하지 않는다. Enter와 node 실행/retry/approve/deny/cancel/resume 메뉴는 없다. Esc/q는 Worker 취소가 아니다.
- viewport 높이/폭마다 layout·scroll 경계를 갱신하고 공식 truncation으로 display width를 제한한다. 좁은 화면은 단일 column, 너무 작은 화면은 resize 또는 `/graph` 안내다. glyph와 상태 이름을 같이 표시하고 theme fg palette만 사용한다.
- Extension은 요청/overlay owner를 한 개만 보유한다. lifecycle에서 viewer를 먼저 닫은 뒤 기존 Status clear·Runtime cancel/lease cleanup을 그대로 수행한다. pending read/늦은 factory/중복 open과 dispose 후 입력·render를 보호하며 UI close 실패도 Runtime cleanup을 막지 않는다.

### 변경 파일

- 신규 `packages/company-runtime/src/graph-view.ts`: 순수 row layout, 상태 glyph/label, 제어 문자 escaping. 기존 GraphNode/GraphEdge 참조를 보존하며 Node/edge 상태를 변경하지 않는다.
- 신규 `src/graph-view-component.ts`: theme/terminal 크기·세로 scroll·navigation/close Component 및 `GraphViewSession` transient owner. runtime port/action은 전달하지 않는다.
- `src/extension.ts`: 기존 read-only `inspect → projectRunGraph` 결과를 ASCII 또는 viewer로 분기한다. TUI-only/project trust/정확한 run ID/동시 open 검사를 추가하고 기존 lifecycle hook에서 viewer owner만 닫는다. config/Provider/Agent/Git/state writer 경로는 추가하지 않는다.
- 신규 `test/graph-view.test.ts` **43개**: workflow/risk/revision/R3/terminal/stale/UNKNOWN, 동일 DTO node/edge set, glyph/colorless, 긴 CJK/제어 문자, narrow/resize, scroll 경계, user keybindings, Enter 무동작, theme 실패, static/dispose 경계.
- 신규 `test/graph-view-command.test.ts` **16개**와 `test/graph-view-harness.ts`: 실제 TuiMainScreen/VirtualTerminal 및 공식 custom bridge 형태로 open/close·editor/footer/focus 보존, state/config/tasks/writer bytes 불변, Provider/writer 0, pending read/factory·lifecycle/UI 실패·중복/malformed/non-TUI를 검증한다. source selection/projector spy로 ASCII와 동일 DTO임도 확인한다.
- `test/host-boundary.test.ts`: 순수 graph layout도 Kernel/Policy/Graph와 함께 Pi/UI/fs import 경계를 검사한다.
- `packages/coding-agent/test/suite/company-runtime-status.test.ts` **4개 추가**: 기존 harness/faux의 실제 live Worker를 유지한 채 Esc/q가 viewer만 닫는지, reload/UI close 실패에도 CANCELLED 저장·lock cleanup·다른 status 보존이 유지되는지 확인한다.
- `packages/company-runtime/package.json`, root `package-lock.json`: 기존 workspace `@earendil-works/pi-tui` `0.85.1` dev dependency 1개를 명시했다. lock diff도 해당 metadata 1줄뿐이며 새 외부 버전/패키지·lifecycle script·shrinkwrap 변경은 없다. `npm install --package-lock-only --ignore-scripts`로 갱신했다.
- `README.md`, `packages/company-runtime/README.md`: ASCII/viewer 구분, static snapshot·keybinding·작은 화면·lifecycle 및 미지원 범위를 설명한다. `docs/WORK_LOG.md`는 현재 요약과 본 항목을 추가했다. 총 **13개 파일** 변경이다.

### 유지한 의미와 제한

GraphProjection/GraphNode/GraphEdge, Kernel/Workflow/QUICK·STANDARD/R0~R3/Reviewer/Verification/Approval/Policy/StateStore/RuntimeEvent·Status Projection·Worktree Launcher는 변경하지 않았다. worker 도구/prompt/권한·Pi Core/TUI 소스도 그대로다. Graph editor, node action/retry, drag/drop/workflow 편집, scheduler/parallel/dynamic dependency, zoom/pan/mouse dependency, Planner/Lead/COMPLEX/T3Code/Web UI는 구현하지 않았다.

Viewer에는 Run의 현재 단계나 승인 상태를 바꿀 콜백이 없다. 기존 active run도 정적 표시이며 자동 갱신/현재 filesystem·process 생존 보장이 아니다. 오류 표시/close는 best-effort UI 경계이며 다른 extension의 동시 overlay stack·fullscreen 조합은 이번 검증 범위가 아니다.

### 자동 검증 명령·실제 결과

```sh
# packages/company-runtime — V0.2B + V0.2A/S0~S6/RC/launcher/status/worktree
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/graph-view.test.ts test/graph-view-command.test.ts test/graph.test.ts test/graph-command.test.ts test/worktree.test.ts test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent — 기존 harness/faux Runtime/RC/Status 및 Pi 회귀
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts

# root
npm run check
git diff --check
bash -n packages/company-runtime/bin/weavra
```

- 환경: Darwin arm64, Node `v26.7.0`. 최종 **Runtime 24개 파일·776개 + coding-agent 14개 파일·455개 = 38개 파일·1,231개 PASS**, 실패/skip 0. 신규 59+4개이며 LOG-032의 1,168개는 과거 결과다. 기존 targeted도 이번에 모두 다시 실행했다.
- 초기 viewer/layout/command/기존 graph-command/boundary 실행은 **52 PASS / 23 FAIL**이었다. 16개는 test harness에서 SDK의 type-only KeybindingsManager export를 생성자로 사용한 setup 오류, 7개는 공식 truncateToWidth가 삽입하는 정상 SGR reset을 unsafe source escape로 판단한 assertion 오류였다. test-only 실제 manager import와 중립 reset/데이터 escape 구분으로 고쳤으며 구현의 width 검사나 Runtime guard를 낮추지 않았다. 이후 **4개 파일·75개 PASS**, SDK Status suite **29개 PASS**를 확인했다.
- 최종 full targeted 이후 test teardown을 finally로 보강하고 `test/graph-view-command.test.ts`를 다시 실행해 **16개 PASS**했다(합계와 중복). 살아 있는 Worker의 기존 Provider 호출은 baseline으로 두고 viewer로 인한 추가 Provider/writer 호출이 0임을 검증했다. query-only 테스트는 전체 Provider/Agent/Workflow/Git/writer 실행 0이다.
- `npm run check`: PASS, TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함. Biome은 이번 변경 파일만 포맷했고 그 뒤 전체 targeted를 실행했다. `git diff --check`, `bash -n`: PASS. root package-lock 갱신 시 기존 **moderate 3건**을 보고했으며 이번에 audit fix/의존성 보안 해소를 수행하거나 PASS로 선언하지 않았다.

- 최종 문서 기록 후 `npm run check`를 재실행해 자동 수정 없이 PASS했다. `bash -n`·`git diff --check` 및 임시 Python 최종 검사도 PASS했다. 정확한 13개 변경 파일, V0.2A 모델/Runtime/Status/Worktree/Pi Core 불변, Extension의 기존 snapshot 조회·run/취소 로직 보존, lockfile의 내부 TUI dependency metadata 외 불변, LOG-001~033 본문·문서 fence/공백·HEAD/RC 태그 불변과 실제 프로젝트 `.ai` 부재를 확인했다. 최종 검사 script는 제거했다.

### 실제 Pi TUI smoke

- `.pi/skills/interactive-testing.md`에 따라 고유 임시 fixture와 tmux **80×24**에서 source `pi-test.sh`를 실행했다. 별도 HOME/agentDir, credential 없는 `env -i`, `--offline --approve --no-session --no-extensions --no-skills --no-prompt-templates --no-context-files` 및 명시적 임시 wrapper Extension을 사용했다. 기존 global Pi/config/auth는 건드리지 않았다.
- V0.2A의 shape-valid stored fixture를 사용했다: QUICK/R0 COMPLETED, STANDARD/R2 COMPLETED, STANDARD/R1 REVISE→attempt2 COMPLETED, R3 WAITING_APPROVAL/PENDING. Worker/Provider는 호출하지 않았으며 no-model/offline-fd 경고는 예상된 fixture 조건이다.
- 실제 `/graph view quick`, `view standard`, `view revise`, `/graph view`(latest R3), reload 후 `view quick`까지 **5회 open/close**를 확인했다. QUICK의 완료 chain, STANDARD Reviewer, REVISE edge/들여쓴 attempt2, R3 inside IMPLEMENT와 승인!=mutation 안내를 확인했다.
- PgDn/End 세로 scroll, **42×18** 단일 column, **30×10** too-small 안내, 80×24 복귀 및 Esc/q 닫기를 확인했다. 실제 TUI에서 viewer를 닫은 뒤 `/reload`하고 새 viewer를 열었다. viewer가 열린 채 강제 session lifecycle이 발생하는 경계는 자동 테스트로 별도 검증했다.
- wrapper는 실제 graph handler 진입 직전에 draft를 넣고 반환 뒤 editor text를 기록했다. 5회 모두 `DRAFT_PRESERVED`였고 footer의 `OTHER STATUS`도 복원됐다. fixture state SHA-256은 전후 동일하며 `.ai`에는 state.json만 있었다(writer/tasks 생성 없음). 검증 script PASS 후 tmux와 임시 fixture/wrapper/검사 파일을 제거했다. 전체 화면/대화 로그는 저장소에 복사하지 않았다.
- 이 결과는 source Pi + stored fixture의 실제 TUI smoke다. 실제 bundled 배포물이나 real-Provider workflow 성공 evidence로 확대하지 않는다. tiny/fallback 화면의 key hint는 이후 사용자 binding을 반영하도록 정리했고 최종 자동 회귀에서 다시 검증했다.

### 다음 작업·커밋

- live update·추가 overlay 조합·fullscreen/다른 OS·Node 검증은 별도 후속이다. 사용자 환경에서 static snapshot 의미와 키 설정을 확인한 뒤 범위를 정한다.
- Runtime semantics 불변이므로 GPT RC-01~08/DeepSeek·유료 Provider를 재실행하지 않았다. build·전체 upstream suite/e2e도 이번에 실행하지 않았다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1`을 이동·수정하지 않았다.

---

## LOG-035 — V0.2B Read-only TUI DAG Viewer 커밋·푸시 준비

- **기록일:** 2026-09-17 13:46 (KST)
- **상태·목적:** 사용자 요청에 따라 LOG-034의 V0.2B 변경을 커밋하고 `origin/devlop`에 게시하기 위한 검증을 완료했다.
- **변경 파일:** `README.md`, `docs/WORK_LOG.md`, `package-lock.json`, `packages/company-runtime/README.md`, `packages/company-runtime/package.json`, 같은 패키지의 `src/extension.ts`, `src/graph-view.ts`, `src/graph-view-component.ts`, `test/graph-view.test.ts`, `test/graph-view-command.test.ts`, `test/graph-view-harness.ts`, `test/host-boundary.test.ts`, `packages/coding-agent/test/suite/company-runtime-status.test.ts` 총 13개. 이번 준비에서는 현재 요약과 이 항목만 갱신했다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `bash -n packages/company-runtime/bin/weavra`, `git diff --check` PASS. `git status --short --branch`, 변경 목록과 기존 staged 변경 없음, RC tag object/peeled commit 불변을 확인했다.
- **과거 검증과 구분:** 38개 파일·1,231개 PASS, graph-view-command 16개 재검증 및 실제 80×24 TUI smoke는 LOG-034 구현 당시 결과다. 이번 커밋 준비에서는 테스트/build/실제 Provider/TUI를 재실행하지 않았다.
- **문제·해결:** lockfile은 내부 `@earendil-works/pi-tui` dev dependency metadata 1줄뿐임을 재확인했다. 사용자 승인된 V0.2B 게시 범위로 `PI_ALLOW_LOCKFILE_CHANGE=1`을 명시하여 포함하며 일반 commit 검사는 유지한다. 다른 의존성 변경이나 검사 우회는 없다.
- **남은 제한·다음 작업:** 정적 snapshot, 다른 extension overlay 중첩/fullscreen·플랫폼 미검증과 기존 취약점 미해소 한계를 유지한다. 명시적 13개 경로만 stage·commit 후 일반 push하고 원격 HEAD 일치, clean working tree와 RC 태그 불변을 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): add read-only Weavra TUI graph viewer`이며 실제 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. `weavra-v0.1-rc1`은 이동·수정하지 않는다.

---

## LOG-036 — V0.2B 게시: 원격 문서 커밋과 충돌 없는 통합

- **기록일:** 2026-09-17 13:47 (KST)
- **상태·목적:** V0.2B 최초 커밋 후 non-fast-forward로 거부된 푸시를 강제 푸시 없이 해결한다.
- **변경 파일:** 이번 후속 기록은 `docs/WORK_LOG.md`만 추가한다. LOG-035의 13개 게시 파일은 유지하며 원격 문서는 수정하지 않았다.
- **문제·해결:** 최초 커밋 `407b34a45`의 푸시가 원격 선행 커밋으로 거부됐다. `git fetch origin devlop`으로 원격 `8037cefae`가 `docs/WEAVRA_OMP_OMO_ADOPTION_PLAN.md`만 추가했음을 확인했다. `git rebase origin/devlop`은 충돌 없이 완료됐고 V0.2B 코드 내용은 유지됐다. force push는 사용하지 않았다.
- **검증 명령·실제 결과:** rebase 후 `npm run check` 재실행 PASS, Biome 자동 수정 없음. `git diff --check`, `bash -n packages/company-runtime/bin/weavra` PASS. `git status --short --branch`에서 원격 대비 V0.2B 커밋 1개 선행·작업 트리 clean을 확인했다. 테스트/TUI/실제 Provider는 재실행하지 않았으며 LOG-034 결과와 구분한다.
- **남은 제한·다음 작업:** 기존 정적 viewer/플랫폼/보안 검증 한계를 유지한다. 이 기록을 미게시 V0.2B 커밋에 포함하고 일반 push 후 로컬·원격 HEAD 일치와 RC 태그 불변을 확인한다.
- **커밋 상태:** 최초 커밋은 rebase로 교체됐으며, 이 항목 작성 시 최종 기록 반영·푸시 직전이다. 최종 SHA와 실제 push 결과는 Git 이력 및 최종 응답으로 보고한다.

---

## LOG-037 — V0.2C: Product Isolation / Setup / Doctor

- **기록일:** 2026-09-17 14:44 (KST)
- **상태:** 구현·자동 회귀·임시 HOME 실제 launcher/TUI smoke 완료 / 미커밋
- **목적:** 같은 머신의 기존 Pi와 Weavra가 기본 auth/settings/session을 섞지 않도록 user-level 제품 영역을 분리한다. 프로젝트 `.ai`는 기존 Runtime source로 유지한다.
- **시작 상태:** `devlop` clean, HEAD `0834683bd1c43cf1442f37be1db478ba004b53fb`. LOG-036의 V0.2B는 원격 문서 커밋 위로 충돌 없이 rebase 후 이 커밋으로 게시됐다. 안정 태그 object `7deb58be5b2da7b4f8e2cf42c1b1fd5d912a107c` 및 peeled commit `183f85de1897d8b9f4fadb368a54e2b1390e5a84`는 불변이다.

### Pi 경로/첫 실행 조사와 선택

- `config.ts`의 공식 `getAgentDir()`는 `PI_CODING_AGENT_DIR`을 우선 사용하고 auth/models/settings/themes/prompts/tools/bin/sessions가 그 경로 아래로 파생된다. `main.ts`는 SessionManager 생성 전에 CLI sessionDir → 환경 sessionDir → startup settings.sessionDir를 선택하고, 없으면 기존 SessionManager가 agent/sessions/<encoded-cwd>를 사용한다.
- `cli/startup-ui.ts`의 `shouldRunFirstTimeSetup()`은 custom agent dir override가 있으면 false다. `main.ts`의 bootstrap Settings/Migrations는 실제 Pi 시작 시 실행되므로 launcher의 setup/doctor가 이 API를 import하면 user-level mutation을 유발할 수 있다.
- 따라서 **A: 명시적 setup**을 선택했다. Weavra agent dir가 없으면 `Weavra has not been set up. Run: weavra setup`으로 종료한다. worktree 생성보다 먼저 검사하며 기존 Pi 경로 fallback은 없다. 준비된 private dir에 auth가 없어도 Pi `/login`을 위해 시작할 수 있다. doctor READY는 인증 성공이 아니라 로컬 실행 조건만 뜻한다.

### 구현·변경 파일

- 신규 `packages/company-runtime/src/launcher-home.ts`: Node built-in만 사용하는 launcher 전용 helper. `resolveWeavraHome`, `prepareLaunch`, `setupWeavra`, `doctorWeavra`, 제한 import 함수가 경로/설치/진단을 소유한다. Runtime/Extension에서 import하지 않는다.
- 기본 home `~/.weavra`, effective agent dir `$WEAVRA_HOME/agent`. 절대 경로·tilde override·공백/한글을 지원하고 cwd 상대/줄바꿈/빈 override는 거부한다. 기존 경로 조상의 canonical 해석으로 Pi home과 같은/상위/하위 alias를 차단한다. custom inherited Pi dir와의 겹침도 보수적으로 검사하되 Weavra child 자체 경로 재진입은 허용한다. product home/agent/주요 하위 디렉터리는 실제 private directory여야 한다.
- `packages/company-runtime/bin/weavra`: setup/doctor 단독 명령 dispatch와 worktree mutation 전 home 검사, child 직전 `PI_CODING_AGENT_DIR` override 및 `PI_CODING_AGENT_SESSION_DIR` unset만 추가했다. cwd·나머지 환경·argv/stdio/exit/signal·동일 checkout의 CLI/Extension 경로를 유지한다. setup/doctor와 Pi/worktree 옵션 혼합은 거부하고 literal prompt는 `--` 뒤에 전달한다. 읽기 전용 worktree-list는 setup 없이 기존대로 동작한다.
- setup은 home/agent와 sessions/themes/prompts/tools/bin을 0700으로 생성하며 기존 권한을 자동 chmod하지 않는다. Pi는 기본 `~/.pi/agent`의 auth/models/settings 3개만 read-only 후보 탐색한다. `[x]`는 존재 표시일 뿐 동의가 아니며 파일별 기본 No에 명시적 y/yes만 import한다. settings는 Pi-specific extension/path/command/sessionDir 경고 후 선택적으로 가져오며 내용은 자동 변환하지 않는다.
- import는 non-symlink/single-link regular UTF-8 JSON object(1 MiB 이하)를 읽는다. 0600 임시 파일에 write/fsync 후 `link`로 no-clobber publication하고 임시 이름만 제거한다. POSIX rename이 기존 대상을 덮어쓰는 경합을 피하기 위한 선택이다. 기존 file/directory/symlink 대상은 SKIP이고 force/자동 overwrite는 없다. 실패/동시 대상 생성에서도 원본 및 기존 대상은 보존하며 credential 값이나 원문 parse 오류는 출력하지 않는다.
- doctor는 checkout/build/Extension, Node 최소 버전/Git version, effective home/agent, private·readable/writable 디렉터리·Pi 경로 격리, auth 존재·JSON/권한, models/settings JSON 및 session 기본값을 PASS/WARN/FAIL로 표시한다. auth/models/settings 없음은 WARN, 경로/build/권한/손상 JSON 등 필수 실패는 non-zero다. READY는 local checks only, Provider readiness not verified다. settings.sessionDir이 있으면 값 자체는 표시하지 않고 override 경고한다.
- doctor는 파일 생성/chmod/repair/credential refresh/Provider/network/session/Git mutation/`.ai` 생성이 없다. Git은 trace/config 주입을 상속하지 않는 제한 환경의 `git --version`만 사용한다.
- 신규 `test/launcher-home.test.ts` **57개**: 임시 HOME·fake credential만 사용하며 default/custom 경로, first-run, inherited env 분리, 명시적 import/skip/복사 실패·동시 대상 생성·unsafe 경로·secret 미출력, doctor 읽기 전용 및 실제 Pi SessionManager 경로/continue를 검증한다.
- `test/launcher.test.ts`, `test/worktree.test.ts`: 기존 process fixture에 private Weavra home/helper를 준비하고 agentDir 기대값만 새 제품 계약에 맞췄다. 기존 argv/stdio/exit/signal/create-only/open/list/global Pi trap·source 보호 assertions는 보존했다. stdin 회귀 fixture에도 임시 HOME을 명시했다.
- `packages/coding-agent/test/suite/company-runtime-workflow.test.ts`: 기존 launcher-created worktree/faux SDK 통합 fixture에 helper 및 private home 준비만 추가했다. Runtime 실행/완료/취소 assertions는 유지한다.
- `README.md`, `packages/company-runtime/README.md`: Pi/Weavra/.ai 역할·setup/doctor·migration 제한·명시적 session precedence·default 격리 한계를 설명했다. `docs/WEAVRA_OMP_OMO_ADOPTION_PLAN.md`는 V0.2B 기준선과 V0.2C 실제 구현 범위를 갱신하고 LSP/QA evidence/stale-project diagnosis를 후속으로 구분했다. `docs/WORK_LOG.md`는 현재 요약과 이 항목. 총 **10개 파일** 변경이다.

### 의미·안전 경계

- `~/.weavra`는 사용자 설정/인증/session 영역이고 `.ai`는 각 project/worktree의 Runtime state/evidence다. 한 worktree마다 user agent dir를 만들지 않으며 기존 Pi cwd partitioning을 사용한다.
- `Existing Pi sessions were not imported automatically.`를 setup에서 명시한다. 이전 Pi/과거 Weavra 대화를 구분할 수 없어 bulk migration을 하지 않는다. 새 `--continue`는 새 Weavra 영역을 보며, 사용자가 지정한 `--session`/`--session-dir` 및 settings의 명시적 override는 기존 Pi 규칙을 따른다. WEAVRA_SESSION_DIR는 추가하지 않았다.
- Kernel/Workflow/Policy/Approval/Verification/StateStore/RuntimeEvent/Graph/Viewer/Status·worker 도구/prompt와 worktree 생성/등록 조회 본문은 불변이다. Pi Core/name/branding/auth format·dependency/lockfile·global Pi command/PATH/shell rc는 수정하지 않았다.
- 격리는 user-level **기본 저장 경로**에 한정된다. 명시적 settings import/project `.pi`/session 경로·Provider 환경변수·실행 코드 전체를 sandbox하지 않는다. 의도적으로 기존 Pi 경로를 가리키는 settings/path를 import하면 공유될 수 있으므로 별도 경고와 사용자 검토가 필요하다. 악성 외부 파일 교체를 OS 수준으로 막는 기능이나 다중 파일 transaction/전원 장애 내구성은 아니다.

### 자동 검증 명령·실제 결과

```sh
# packages/company-runtime — setup/doctor + 기존 V0.2A/B/S0~S6/RC/launcher/status/worktree
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/launcher-home.test.ts test/graph-view.test.ts test/graph-view-command.test.ts test/graph.test.ts test/graph-command.test.ts test/worktree.test.ts test/launcher.test.ts test/status.test.ts test/hardening.test.ts test/kernel-hardening.test.ts test/observations.test.ts test/observation-files.test.ts test/approval.test.ts test/r2-review.test.ts test/quick.test.ts test/agent-metadata.test.ts test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/verification-boundary.test.ts

# packages/coding-agent — Runtime/RC/Status·Pi 회귀 + 관련 argv/session 회귀
node ../../node_modules/vitest/dist/cli.js --run --maxWorkers=2 test/suite/company-runtime-status.test.ts test/suite/company-runtime-timeout.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-agent.test.ts test/suite/agent-session-prompt.test.ts test/suite/agent-session-runtime.test.ts test/suite/agent-session-model-extension.test.ts test/suite/agent-session-retry-events.test.ts test/suite/agent-session-queue.test.ts test/args.test.ts test/sdk-session-manager.test.ts test/session-manager/file-operations.test.ts

# root
npm run check
bash -n packages/company-runtime/bin/weavra
git diff --check
```

- 환경: Darwin arm64, Node `v26.7.0`. 최종 **Runtime 25개 파일·833개 + coding-agent 17개 파일·569개 = 42개 파일·1,402개 PASS**, 실패/skip 0. 기존 1,231개 + 신규57개 + 관련 Pi 추가114개다. LOG-034 결과는 당시 기록이며 이번에 기존 targeted를 모두 재실행했다.
- 초기 home/launcher **2개 파일·71개 PASS**, 실제 SessionManager 경로/continue 보완 뒤 home **52개 PASS**, launcher/home/worktree **3개 파일·185개 PASS**를 확인했다. 이후 root path·first-run worktree·destination 종류 5개를 보완한 최종 home57개가 전체 회귀에 포함된다. 테스트 실패는 없었다.
- 실제 별도 child에서 기존 Pi SessionManager의 create/continueRecent를 사용하여 Weavra agent/sessions 아래 경로, 동일 cwd의 ID 재사용, 다른 cwd의 partition 분리, explicit session-dir를 검증했다. 해당 SDK session probe는 실제 Provider 추론이 아니다. 기존 Pi bytes/modes와 session 파일 목록은 그대로였다.
- `npm run check`: 최종 PASS, TypeScript/deps/entry graphs/shrinkwrap/install-lock/browser smoke 포함. 초기 import 함수의 catch/finally 경로 TS2366을 명시적 never-return으로 정리했고 test 문자열 결합 info 1건은 template literal로 수정했다. 검사 완화는 없다. 최종 formatter 후 전체 targeted를 실행했으며 warning/info/error가 없다. `bash -n`, `git diff --check`: PASS.

- 최종 문서 기록 후 root `npm run check`를 다시 실행해 자동 수정 없이 PASS했다. `bash -n`, `git diff --check`와 임시 Python 검사도 PASS했다. 정확한 10개 변경 파일, Runtime/Extension/Graph/Viewer/Status/Pi Core·dependency 불변, worktree 실행 본문과 LOG-001~036 보존, 문서 fence/공백, HEAD/RC 태그 불변 및 실제 project `.ai` 부재를 확인했다. 최종 검사 script는 제거했다.

### 실제 임시 HOME smoke

- 실제 사용자 HOME이 아닌 고유 `/tmp` 아래 fake `~/.pi/agent` auth/models/settings/session fixture를 만들었다. 인증 값은 가짜이며 출력하지 않았다. 실제 launcher로 `weavra setup`을 실행하여 auth/models에 yes, settings에 no를 입력했고 새 Weavra dir·0600 auth 및 empty sessions를 확인했다.
- 같은 임시 HOME으로 실제 `weavra doctor`: exit 0, checkout/build/Extension·Node `26.7.0`·Git `2.54.0`·home/dir/JSON PASS, settings 없음 WARN, local READY를 확인했다. 이는 현재 PATH의 Git이며 자동 fixture는 `/usr/bin` Git도 사용한다.
- interactive-testing 지침에 따라 tmux **80×24**와 credential 없는 `env -i`, inherited Pi agent/session 변수를 fake Pi로 고정한 상태에서 **기존 built fork-local CLI를 실제 launcher로 실행**했다. offline/telemetry off/명시적 Weavra Extension·no-session·no 자동 리소스 로딩으로 `/graph`, `/state`, `/quit`를 확인했다. Model 미설정/offline fd 경고는 예상된 결과였고 Provider는 호출하지 않았다.
- 기존 fake Pi auth/models/settings/session의 SHA-256·permissions와 전체 목록은 전후 동일했다. 새 Pi settings는 `~/.weavra/agent/settings.json`에만 생성됐고 기존 session은 복사되지 않았으며 project `.ai`도 없었다. 검사 script PASS 후 tmux·임시 HOME/fixture/script를 제거했다. 사용자 실제 `~/.pi`/`~/.weavra`는 테스트로 읽어 복사하거나 수정하지 않았다.
- build를 새로 실행하지 않았다. 이번 smoke는 현재 checkout에 이미 있던 built CLI의 실제 startup/명령 연결 검증이며 real-Provider RC나 전체 배포물/플랫폼 검증은 아니다.

### 남은 제한·다음 작업·커밋

- JSON object 검사만 하며 auth 유효성/원격 모델 가용성·network refresh는 doctor에서 확인하지 않는다. auth가 없어도 로컬 READY일 수 있으므로 Weavra `/login` 또는 explicit import가 필요하다.
- 외부 프로세스의 syscall 사이 변경·악성 user-owned extension/명시적 path override는 sandbox하지 않는다. 기존 broad permissions/링크/손상 config는 자동 repair하지 않으므로 수동 검토가 필요하다. session bulk migration/cloud sync/keychain/auto update/Hash-Anchored Edit/LSP/QA Evidence bundle은 구현하지 않았다.
- Runtime semantics 불변이므로 실제 GPT RC-01~08/DeepSeek·유료 Provider는 재실행하지 않았다. 전체 upstream suite/e2e·다른 OS/Node/파일시스템은 미검증이다.
- **다음 작업:** 사용자가 실제 환경에서 직접 `weavra setup` → candidate별 동의 → `weavra doctor`를 실행한다. 에이전트가 실제 HOME에서 자동 setup/import하지 않는다. 이후 Weavra 안의 `/login` 또는 설정을 확인하고 필요한 과거 session만 명시적으로 연다.
- **커밋·푸시·태그 변경:** 모두 하지 않음. `weavra-v0.1-rc1`은 그대로 유지한다.

---

## LOG-038 — V0.2C 사용자 실행 확인 및 커밋·푸시 준비

- **기록일:** 2026-09-17 15:03 (KST)
- **상태·목적:** 사용자의 정상 실행 보고와 커밋·푸시 요청에 따라 V0.2C 게시 전 검증을 완료했다.
- **사용자 확인:** 사용자가 실행이 잘 되는 것 같다고 보고했다. 구체적인 setup/import/doctor 출력·사용한 모델·session 선택 결과는 전달되지 않았으므로 전체 사용자 환경/Provider RC PASS로 확대하지 않는다. 에이전트가 실제 사용자 HOME에 setup을 실행한 것은 아니다.
- **변경 파일:** `README.md`, `docs/WEAVRA_OMP_OMO_ADOPTION_PLAN.md`, `docs/WORK_LOG.md`, `packages/company-runtime/README.md`, `packages/company-runtime/bin/weavra`, 같은 패키지의 `src/launcher-home.ts`, `test/launcher-home.test.ts`, `test/launcher.test.ts`, `test/worktree.test.ts`, `packages/coding-agent/test/suite/company-runtime-workflow.test.ts` 총 10개. 이번 준비에서는 현재 요약과 이 항목만 갱신했다.
- **이번 검증:** root `npm run check` 재실행 PASS, Biome 자동 수정 없음. `bash -n packages/company-runtime/bin/weavra`, `git diff --check` PASS. `git status --short --branch`와 diff 목록에서 대상 외 변경·기존 staged 변경이 없음을 확인했고 HEAD/RC tag object/peeled commit 불변을 확인했다.
- **과거 검증과 구분:** 자동 42개 파일·1,402개 PASS 및 임시 HOME의 실제 launcher/TUI smoke는 LOG-037 구현 당시 결과다. 이번 커밋 준비에서는 테스트/build/실제 Provider/TUI를 재실행하지 않았다.
- **문제·해결:** 추가 문제 없음. 명시적 10개 경로만 stage하며 일반 commit/push를 사용한다. Runtime 의미/Pi Core·dependency/lockfile은 그대로다.
- **남은 제한·다음 작업:** 기존 default 경로 격리·명시적 설정 override·session bulk migration 미지원 및 플랫폼/Provider 미검증 한계를 유지한다. 게시 후 원격 HEAD 일치, clean working tree와 RC 태그 불변을 확인한다.
- **커밋 상태:** 이 항목 작성 시 실행 직전. 메시지는 `feat(coding-agent): isolate Weavra home and add setup and doctor`이며 최종 SHA·push 결과는 Git 이력과 최종 응답으로 보고한다. `weavra-v0.1-rc1`은 이동·수정하지 않는다.

---

## 이후 항목 형식

```markdown
## LOG-NNN — 단계: 작업 제목

- 기록일: YYYY-MM-DD (시간대)
- 상태: 완료 / 진행 중 / 중단
- 목적:
- 변경 내용·파일:
- 검증 명령·결과: 통과 / 실패 / 미실행과 이유
- 문제와 해결:
- 남은 제한:
- 다음 작업:
- 커밋: 하지 않음 / 실제 커밋 ID
```
