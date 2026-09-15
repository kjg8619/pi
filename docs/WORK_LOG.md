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
| S5~S6 | 미착수 | 기존 계획 유지; 사용자 승인 후 진행 |

현재 완료 범위는 S4까지다. STANDARD/R0~R1의 실제 Git baseline·검증 명령·독립 SDK 역할·최신 review guard·명령 취소와 부분 변경 보고를 연결했다. 전체 V0.1, 유료 Provider 품질/네트워크와 OS sandbox를 완료한 것은 아니다.

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
