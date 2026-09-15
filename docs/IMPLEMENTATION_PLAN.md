# Personal AI Runtime 구현 계획

## 1. 현재 상태와 목표

Phase 0과 S0~S4를 완료했다. S4는 실제 Git evidence·등록 check·독립 Developer/Reviewer SDK session·명령/lifecycle을 STANDARD 순차 Kernel에 연결했다. faux provider와 임시 Git 프로젝트로 자동 검증 및 실제 Pi interactive 성공·취소·reload를 확인했다. Kernel의 Host 독립 경계는 유지하며 전체 V0.1 확장은 S5 범위다.

기준: [MASTER_SPEC](MASTER_SPEC_PI_PERSONAL_AI_RUNTIME.md), [아키텍처](ARCHITECTURE.md), [결정 기록](DECISIONS.md).

첫 목표는 모든 조직 기능이 아니라 다음 흐름을 실제 Pi에서 검증하는 것이다.

```text
사용자 요청 → STANDARD 판정 → Developer
          → 검증 증거 → Reviewer
          → PASS 또는 REVISE → 상태 저장 → 최종 보고
```

안전한 변경을 하려면 최소 정책과 상태 기록이 먼저 필요하다. 따라서 마스터 명세의 Phase 1~6을 그대로 큰 덩어리로 구현하지 않고, 상태·정책의 최소 부분을 Agent 실행보다 앞에 배치한다. 제품 범위를 늘리는 변경은 아니다.

## 2. 첫 Vertical Slice

### 입력과 전제

- 로컬의 신뢰된 Git 프로젝트 한 개, 실행 중 run 한 개.
- 사용자가 명시적으로 `/workflow run <goal>`을 실행한다. 일반 Pi 대화를 자동 가로채 조직 작업으로 바꾸지 않는다.
- 대표 요청: “로그인 500 오류를 수정하고 회귀 테스트를 추가해줘.”
- coding/reasoning profile, 허용된 파일 범위와 검증 명령을 미리 설정한다.
- 기존 사용자 변경이 있으면 중단한다. 자동 Git 정리, commit, push는 하지 않는다.
- 실제 사용자 실행은 사용자가 설정한 모델을 사용한다. 개발 테스트는 faux provider와 임시 fixture만 사용한다.

### 포함

1. 규칙 기반 intent/complexity/risk 및 판정 근거. STANDARD·R0/R1만 실행.
2. Developer와 Reviewer의 독립 SDK 세션, 순차 실행, 명시적 도구·리소스 제한.
3. 구조화 handoff 및 PASS/REVISE/BLOCK 검증.
4. REVISE 후 최대 1회 재작업, 최종 Reviewer PASS 없이는 완료 불가.
5. 실제 diff와 등록된 회귀 check 수집. 미실행 항목과 실패 이유 표시.
6. 최소 `.ai` 저장과 중단 판정; 대화는 Pi 세션에 보관.
7. `/workflow run|status|cancel`, `/state`; `/team`, `/risk`는 같은 상태의 간단한 출력으로 추가.
8. 지원하지 않는 위험 action을 실행 전에 차단.

### 제외

- Lead/Planner, 조직 병렬 실행, 범용 task graph.
- QUICK/COMPLEX 실제 실행; 분류 결과는 숨기지 않고 미지원으로 보고.
- 범용 셸과 위험 명령의 자동 승인, production/credential/history 작업.
- 자동 crash resume, checkpoint 복원, 모델 fallback, 비용 기반 라우팅.
- custom TUI, RPC 클라이언트, 서버, SQLite 조직 DB, Web UI.

### 성공 trace

```text
run 생성: STANDARD / R1 / Developer + Reviewer
Developer #1: 원인·코드·테스트 수정 → handoff
SELF_CHECK: regression PASS, diff digest D1
Reviewer #1: REVISE (예: 만료 토큰 케이스 누락)
Developer #2: 지적 반영 → 새 handoff
SELF_CHECK: regression PASS, diff digest D2
Reviewer #2: PASS, 대상 D2
TEST: 필수 checks PASS, 변경 digest 유지
state 저장: COMPLETED / COMPLETE
최종 보고: 변경 파일, 원인, review, checks, 미실행 사유, 남은 위험
```

PASS 직행 경로도 별도로 검증한다. REVISE 한도 초과, BLOCK, check 실패, 승인 거절, 모델 실패, 취소는 성공 trace로 합치지 않는다.

## 3. 작은 단계별 실행 계획

각 단계는 다음 단계의 전제 조건을 검증하는 단위다. 아래 파일명은 제안이며 구현 전에 현 소스/API를 다시 확인한다.

### S0 — 계약과 로딩 골격

**대상:** `packages/company-runtime/package.json`, `src/contracts.ts`, `src/config.ts`, `src/extension.ts`.

- public SDK/Extension exports만 사용한다. 기존 Core 내부 import에 의존하지 않는다.
- Run, Task, Handoff, Review, CheckResult, PolicyDecision schema를 정의한다.
- `.ai/config.yaml` 필드·default·오류 처리·변경 권한을 확정한다.
- Pi Extension의 명시적 로딩과 네 명령의 읽기 전용 출력 골격을 만든다.
- root workspace/TypeScript/check/test 편입과 패키지 scripts를 확인한다. 새 외부 dependency가 필요하면 정확한 버전과 lockfile 변경을 함께 검토한다.

**완료 기준:** 잘못된 설정은 LLM 호출 전에 실패하며, Extension을 로드하지 않은 기존 Pi 동작에는 영향이 없다. 이 단계에는 파일 변경을 수행하는 Agent가 없다.

### S1 — 순수 Kernel

**대상:** `src/classification.ts`, `src/kernel.ts`, 기존 `src/contracts.ts`의 최소 확장, `src/ports.ts`, `src/events.ts`, 관련 unit tests.

- intent 9종, complexity 3종, risk 4종을 인식하는 최소 규칙과 근거를 둔다.
- classification과 실제 실행 capability를 분리한다.
- STANDARD 역할 구성, 허용된 상태 전이, revision 횟수, 완료 불변식을 구현한다.
- Kernel은 Pi SDK 구체 타입과 분리한다. 기존 `extension.ts`는 Pi Host Adapter로 유지한다.
- LLM runner, verifier, store, approval은 작은 Port 인터페이스로 대체 가능하게 한다. 테스트에서는 fake/no-op 구현을 주입한다. 범용 plugin framework는 만들지 않는다.
- 안정적인 STANDARD Step ID와 재작업 attempt를 상태·이벤트에서 공유한다.
- 구조화 RuntimeEvent 타입과 선택적 RuntimeEventSink를 정의한다. Event는 관찰용이며 sink 실패로 완료 guard를 우회할 수 없다.
- 실제 파일 저장·검증 명령·Pi AgentSession 실행·승인 UI는 구현하지 않는다. 순차 전이만 fake Port로 검증한다. DAG scheduler/renderer, RPC, Web UI, 별도 서비스는 제외한다.

**완료 기준:** 외부 API와 Pi AgentSession 없이 STANDARD 전이, PASS/REVISE/BLOCK, invalid transition, revision limit, completion guard, R2 Reviewer 강제, RuntimeEvent 순서, Step ID/attempt 일관성, sink 실패 및 저장 실패의 안전한 처리를 검증한다. 기존 S0 테스트도 유지한다.

**S1 결과:** 위 조건을 unit test로 검증했다. S0 포함 6개 테스트 파일·133개 테스트와 `npm run check`가 통과했다. Kernel import 경계도 테스트한다. ApprovalPort는 계약만 정의하고 R3 실행은 차단한다. Pi 명령은 S0 골격을 유지하며 실제 파일 저장·도구 정책은 S2 진입 후 구현한다.

### S2 — 최소 State와 Policy

**대상:** `src/state-store.ts`, `src/policy.ts`, `src/policy-paths.ts`(파일 시스템 검사 Adapter), `test/state-store.test.ts`, `test/policy.test.ts`.

- `.ai/state.json` 원본, revision이 있는 `tasks.json` projection, decision/action ID와 최소 실행 전후 기록을 구현한다. config는 S0 사용자 관리 파일을 유지한다. 별도 decisions.md·logs의 사용자용 출력은 S4/S5에서 연결한다.
- 프로젝트 단일 writer lock, 파일별 원자 교체, 불완전 저장 감지, stale run의 INTERRUPTED 처리를 넣는다.
- Runtime 관리 파일과 credential/.git/workspace 밖 접근을 제한한다.
- R0/R1 허용, R2/R3·알 수 없는 도구·일반 shell 기본 차단으로 시작한다.
- 실행 전/후 최소 action 상태를 저장한다. 저장 실패 뒤에는 다음 mutation을 실행하지 않는다.

**완료 기준:** 두 run의 동시 소유 불가, 손상 파일은 성공 상태로 읽히지 않음, projection 복구 가능, symlink/path traversal 차단, 차단된 도구 실행 횟수 0.

**S2 결과:** 파일 StateStore, 정규 프로젝트 경로의 배타 lock, 파일별 temp/write/sync/rename, projection 복구와 부분 저장 오류, stale run/action INTERRUPTED, 순수 Policy와 경로 Adapter를 구현했다. R2/R3/UNKNOWN·미등록 도구·shell은 미실행이며 fake executor 호출 0을 검증했다. 기존 Kernel/Ports/Step/이벤트 구조는 유지했다. 실제 도구 설치·명령 연결·자동 resume는 없다. 상세 API·보안 한계는 [패키지 README](../packages/company-runtime/README.md), 검증 기록은 [WORK_LOG](WORK_LOG.md)의 LOG-005를 따른다.

### S3 — SDK Agent adapter

**대상:** `src/agent-runner.ts`, `src/agent-tools.ts`, 계약·Kernel metadata 최소 확장, `test/agent-metadata.test.ts`, `packages/coding-agent/test/suite/company-runtime-agent.test.ts`.

- Developer/Reviewer 각각 독립 세션과 역할 도구를 구성한다.
- 기본 ResourceLoader 자동 탐색에 기대지 않고 worker 리소스를 명시한다. 부모 조직 Extension은 로드하지 않는다.
- SDK worker의 Provider/인증 범위를 명시하고 profile 해석 실패를 시작 전 차단한다.
- 결과 제출 schema·run/role/revision을 확인한다. 결과 없는 자연어 종료는 실패다.
- timeout/abort/dispose와 session 참조를 연결한다. usage와 대화/tool history는 Pi Session이 보관하며 Runtime에 복제하지 않는다.
- worker 파일 도구를 S2 정책에 직접 연결한다. 등록 check는 요청만 기록하고 실행하지 않는다. 같은 정책을 사용하는 host verifier의 실제 실행 연결은 S4다.

**완료 기준:** faux Developer가 변경하고 faux Reviewer는 읽기만 가능하다. 부모 훅이 없는 자식에도 정책이 적용된다. abort 후 추가 tool 실행과 다음 역할 시작이 없다.

**S3 결과:** 매 역할 호출에 새 SDK 세션·명시적 ResourceLoader·제한 도구·메모리 Settings를 구성했다. coding/reasoning 모델·인증을 시작 전 검사하며 fallback은 없다. 구조화 결과와 Reviewer용 명시적 diff/evidence 자료를 요구한다. Kernel은 session reference 저장 콜백과 AgentSessionCreated 이벤트만 추가했고 Pi 구체 타입을 import하지 않는다. 독립 역할 통합 테스트와 단일 IMPLEMENT 연결을 검증했으며 전체 workflow는 실행하지 않았다. [패키지 README](../packages/company-runtime/README.md)에 API·취소·리소스·보안 한계, [WORK_LOG](WORK_LOG.md) LOG-006에 실제 검증 결과를 기록했다.

### S4 — 검증과 STANDARD 통합: 첫 Slice 종료점

**대상:** `src/verification.ts`, `src/process-runner.ts`, `src/workspace.ts`, `src/workflow.ts`, Kernel/명령 연결, suite 통합 테스트.

- 신뢰한 executable/argv/cwd/timeout을 실행하는 제한된 검증기를 연결한다.
- tracked/staged/untracked 변경을 포함한 실제 증거와 digest를 만든다.
- SELF_CHECK → REVIEW → TEST 순서, stale PASS 무효화, 한 번의 revision을 구현한다.
- 명령 반환 후에도 상태·취소가 가능하게 run 소유권을 유지한다.
- session switch/reload/shutdown 정리와 부모 입력·tool/user_bash 경합 방지를 연결한다.
- 최종 보고는 Kernel의 저장된 상태에서 생성한다.

**완료 기준:** 2절 성공 trace와 실패 trace가 faux provider로 재현된다. 실제 Pi interactive mode에서 명령·상태·취소가 동작한다. 실제 Provider 호출 없이 테스트 가능한 첫 Slice를 완료한다.

**S4 결과:** 실제 SELF_CHECK/TEST와 HEAD/index/byte·mode digest, 등록 실행 tuple·환경 필터·process group 정리, 최신 독립 Review PASS·COMPLETE 직전 재검사, 부분 변경 보고와 Host lifecycle을 연결했다. TEST mutation은 자동 재검토 없이 BLOCKED다. 현재 자동 검증은 Runtime 261개와 coding-agent 관련 106개, 합계 13개 파일·367개이며 실제 Pi 80×24 tmux에서 성공·status/team/state/risk·cancel·실행 중 reload도 faux로 확인했다. 전체 build/suite·유료 Provider는 실행하지 않았다. 실제 명령·보안 한계는 [패키지 README](../packages/company-runtime/README.md), 결과는 [WORK_LOG](WORK_LOG.md) LOG-007에 기록했다.

### S5 — 전체 V0.1 범위 확장

- QUICK: Executor 1개로 처리하고 동일 정책·검증 적용. 구현자가 최종 승인하는 것이 아니라 Kernel이 증거로 완료를 판단한다. 독립 Reviewer 생략은 명세의 QUICK 예외에 한정한다.
- COMPLEX: 먼저 분류·명시적 보류를 제공한다. 실행까지 포함하려면 Lead가 계획을 겸하고 Developer/Reviewer를 순차 조율하는 별도 작은 단계로 진행한다. V0.1 DoD의 “판정 가능”을 전체 COMPLEX 실행 완료로 보고하지 않는다.
- R2: Reviewer 필수 경로를 구현한다.
- R3: 지원하는 제한된 action에만 사용자 승인 UI와 1회 승인 binding을 구현한다. 임의 destructive shell을 먼저 열지 않는다.
- `/team`, `/state`, `/workflow`, `/risk`의 저장 상태·실행 상태 출력 완성.
- revision 한도 설정, 결정 기록, 검증 결과/증거 조회를 완성한다.

**완료 기준:** 아래 V0.1 추적표의 필수 항목을 만족한다. 미지원 COMPLEX 실행과 sandbox 범위를 문서·출력에 명시한다.

### S6 — V0.1 hardening

- 모델 오류·timeout·출력 누락·한도 초과·부분 변경·디스크 실패를 테스트한다.
- 취소 직후 늦게 도착한 결과가 COMPLETE를 기록하지 못하게 한다.
- 재시작·branch 이동이 작업을 자동 재실행하거나 과거 승인·PASS를 재사용하지 못하게 한다.
- check 프로세스의 종료·출력 제한·환경 필터를 검증한다.
- Extension 비활성/활성 양쪽에서 기존 Pi 회귀 테스트를 실행한다.

**완료 기준:** 실패는 FAILED/BLOCKED/CANCELLED/INTERRUPTED로 남고 성공으로 위장하지 않는다. 자동 resume와 fallback은 여전히 제외한다.

## 4. 검증 전략

### 테스트 계층

| 계층 | 필수 사례 |
|---|---|
| 순수 unit | 분류, 팀 선택, 상태 전이, schema, revision 한도, 완료 guard |
| Policy unit | 부모/자식/검증 공통 검사, 미등록 도구, 경로 탈출, 보호 파일, R3 거절·timeout·변경된 action |
| State unit | 원자 교체 실패, projection revision 차이, lock 경합, 손상 상태, INTERRUPTED, 비밀 값 제외 |
| SDK integration | 서로 다른 세션, Reviewer write 불가, resource 재귀 로딩 없음, profile/auth 실패 |
| Workflow integration | PASS, REVISE→PASS, BLOCK, 필수 test 실패, stale review, malformed handoff, 취소 |
| Lifecycle integration | 실행 중 중복 run, 부모 mutation, switch/reload/종료, 늦은 결과 무시, lock 해제 |
| Interactive smoke | 명령 등록·출력, 상태 갱신, 승인 취소, `/workflow cancel` |

새 `AgentSession`/Runtime 통합 테스트는 [suite harness](../packages/coding-agent/test/suite/harness.ts)와 faux provider를 사용한다. 실제 Provider API·키·유료 토큰은 사용하지 않는다. Policy의 위험 작업은 fake executor로 승인 여부와 실행 횟수만 확인하고 실제 삭제·배포를 하지 않는다.

### 명령 규칙

구현 단계에서 코드 변경 후:

- `npm run check` 전체 출력을 확인하고 모든 진단을 해결한다. 이 명령은 formatter의 자동 수정이 포함되므로 변경 diff도 확인한다.
- 생성/수정한 테스트는 package root에서 개별 실행한다.

```sh
# packages/company-runtime 또는 packages/coding-agent 안에서, 실제 만든 테스트 경로 지정
node "$(git rev-parse --show-toplevel)/node_modules/vitest/dist/cli.js" --run test/specific.test.ts
```

전체 non-e2e 검증이 필요하면 저장소의 `./test.sh`를 사용한다. `npm test`, 전체 Vitest 직접 실행, `npm run build`는 사용자 요청 없이 실행하지 않는다. Interactive 검증 시 [.pi/skills/interactive-testing.md](../.pi/skills/interactive-testing.md)를 먼저 따른다.

Runtime의 검증 명령 선택도 프로젝트 규칙을 따라야 한다. 특히 이 저장소에서는 `npm run check`를 read-only lint로 오인하지 않고, build와 test 실행 권한을 별도로 확인한다. 마스터 명세의 “가능한 검증”은 프로젝트별 실행 금지를 무시하라는 뜻이 아니다.

Phase 0 문서 작성에서는 위 명령을 실행하지 않았다. S0~S4에서는 unit/로딩/파일 저장·정책 및 faux SDK/전체 STANDARD 통합 테스트와 `npm run check`를 통과했다. S4에서 실제 Pi 명령 interactive smoke도 수행했다. 전체 테스트 suite나 실제 유료 Provider 추론은 실행하지 않았다.

## 5. V0.1 요구사항 추적표

| 마스터 명세 요구사항 | 계획 / 수락 증거 |
|---|---|
| Pi에서 실제 실행 | S0/S4 Extension 로딩·명령 smoke |
| Intent / Complexity / Workflow / Team | S1 규칙 테스트, S5 QUICK 경로; COMPLEX 실행 범위 별도 명시 |
| Risk R0~R3 | S1 분류, S2 실행 전 검사, S5 R2/R3 처리 |
| Developer → Reviewer | S3 독립 SDK 세션, S4 성공 trace |
| Reviewer REVISE 재작업 | S4 REVISE→PASS 및 한도 초과 테스트 |
| 위험 Tool 차단 또는 승인 | S2 차단된 실행 0회, S5 승인 1회 binding·거절 테스트 |
| `.ai` 네 파일 | S2/S5 저장·projection·decision·config 검증 |
| 네 명령 | S0/S4/S5 출력·취소·조회 smoke |
| diff/test/build/lint 검증 | S4/S6 실행 가능한 명령의 실제 증거, 불가/미실행 이유 |
| 기존 Pi 회귀 없음 | S6 관련 기존 테스트 및 Extension 미로딩 비교 |

첫 Slice 완료는 전체 V0.1 완료가 아니다. 실제 smoke와 회귀 검증 전에는 “Pi에서 실제 실행”이나 “회귀 없음”을 체크하지 않는다.

## 6. 구현 시작 전 확정할 사항

1. 이 최소 Slice 범위와 `packages/company-runtime/` 위치 승인.
2. 첫 fixture/대상 프로젝트, 수정 허용 범위, 필요한 검증 명령 및 실행 권한.
3. coding/reasoning profile mapping과 worker가 사용할 인증·Provider 범위.
4. `.ai`의 Git 추적 정책. config/장기 decisions와 개인 상태/logs의 구분을 권장하되 자동 `.gitignore` 수정은 하지 않는다.
5. 단일 프로젝트 run, dirty tree 거부, 자동 resume 없음이라는 초기 제한 수용 여부.

S0~S4는 완료했다. 다음 작업은 **S5 범위 확장**이며 사용자 승인 후 진행한다. 첫 Slice는 STANDARD/R0~R1, 재작업 최대 1회, 등록 check·clean Git 프로젝트로 제한한다. QUICK/R2/R3·결정 기록 조회 등은 별도 작은 작업으로 검증하고, DAG·병렬화·자동 resume는 추가하지 않는다. macOS 외 process cleanup, 탈출 daemon·외부 TOCTOU, 실제 Provider 품질/인증/네트워크는 완료 범위로 주장하지 않는다.
