# Weavra Runtime

Adaptive Agent Workflow Runtime — **Weavra v0.1 RC1 기반 development build**.

사용자 설치·Quick Start·기능 범위는 [Weavra README](../../README.md)를 참고한다. 이 문서는 S0~S6 및 RC 수정의 구현 참조다. 내부 `company-runtime`/`CompanyKernel` 명칭과 Pi workspace package 버전 `0.85.1`은 유지하며 Weavra 제품 버전과 구분한다.

Host 독립 Kernel, StateStore·Policy, 독립 Pi SDK 역할에 실제 Git evidence·등록 check·명령/lifecycle을 연결했다. **STANDARD/R0~R2와 QUICK/R0~R1**을 지원한다. R2는 제한된 파일 변경과 독립 리뷰를 결합한 경로다. R3는 명시적 인간 승인을 받은 단일 tracked 텍스트 파일 삭제만 지원한다. COMPLEX/범용 R3 실행, 자동 resume/rollback/commit, 병렬 조직은 지원하지 않는다. [GPT RC-01~08 validation](../../docs/GPT_RC_VALIDATION_2026-09-16.md)의 한정된 실제 검증을 통과했으며 정식 V0.1 release 선언은 아니다. DeepSeek는 NOT VERIFIED다.

## 로딩

저장소 루트에서 의존성을 설치하고 launcher를 link한다. 기존 `pi` executable이 PATH에 있어야 한다.

```sh
npm install --ignore-scripts
npm link --workspace packages/company-runtime --ignore-scripts
cd /absolute/path/to/my-project
weavra
weavra --help     # Pi 도움말 (그대로 전달)
weavra --version  # Pi 버전; Weavra 버전은 /workflow help
```

Bash wrapper가 npm link symlink를 해석하여 checkout의 Extension 절대경로를 계산하고 `exec pi -e <extension> <args>`로 실행한다. cwd·환경·인수·종료 코드/시그널을 유지한다. checkout을 보존해야 하며 Windows는 지원하지 않는다. Pi Core/bin/설정·인증은 수정하지 않는다.

기존 명시적 로딩도 가능하다(아래는 저장소 루트 기준).

```sh
pi -e ./packages/company-runtime/src/extension.ts
# package.json의 pi.extensions 진입점을 사용하는 경우
pi -e ./packages/company-runtime
```

소스 TypeScript를 Pi가 로드하므로 이 패키지의 별도 build는 없다. 자동 로딩 설정은 추가하지 않는다. 체크아웃 개발 환경은 root `npm install --ignore-scripts`를 사용한다. 모델 데이터가 없는 체크아웃에서 Pi 소스 로딩 테스트를 하려면 `npm run hydrate:model-data`도 필요하다. 이 명령은 공개 모델 카탈로그를 가져오며 추론 요청을 보내지 않는다.

명령은 알림을 지원하는 TUI/RPC에서 출력한다. Print/JSON에서는 명시적 오류를 반환한다. 전체 Runtime의 RPC 실행 지원을 뜻하지 않는다.

| 명령 | 동작 |
|---|---|
| `/workflow help`, `/state help`, `/team help`, `/risk help` | Weavra 사용법; workflow help에 risk/Reviewer/Approval·commit/rollback 제한 안내 |
| `/workflow run <goal>` | 신뢰 확인 후 비동기 preflight·분류에 따른 QUICK/STANDARD 실행 시작 |
| `/workflow`, `/workflow status [runId]` | live Kernel 또는 저장된 run의 출처·시각·상태·변경 요약 |
| `/workflow history [page]`, `/workflow config` | 저장 run 이력 / 현재 설정과 effective revision 안내 |
| `/workflow cancel` | 취소 요청 후 worker/check 정리와 종료 보고를 기다림; rollback 없음 |
| `/state [runId]` | task/requirements, structured result, 검증·부분 변경 요약 |
| `/state checks [runId] [page]`, `/state check <number> [runId]` | check 목록 / 실제 stdout·stderr·exit·시간·step·evidence 상세 |
| `/state review [runId]`, `/state decisions [runId] [page]` | 회차별 review / 구조화 운영 결정 |
| `/team [runId]`, `/risk [runId]` | 역할/profile/session 참조 / 분류·Policy·Approval 상태 |
| `/state export` | idle/terminal 상태의 운영 결정·check projection을 명시적으로 생성 |

Factory는 네 명령과 lifecycle/input 보호 훅, TUI `session_start`의 짧은 Weavra 로드 알림만 등록한다. 시작 시 config/state I/O·Agent 실행은 하지 않고 기존 Pi 헤더를 교체하지 않는다. Print/JSON/RPC에는 시작 배너를 출력하지 않는다. 모든 명령은 project trust를 요구한다. run/config는 `.ai/config.yaml`을 검사하지만 상태 조회는 config/model/auth 없이 저장된 source를 읽는다. run은 부모 Agent가 idle일 때만 시작하며 등록된 check 실행을 UI에서 확인받는다. 활성 run 동안 일반 입력·부모 도구·user bash를 차단한다. 명령은 빠르게 반환하므로 status/cancel을 계속 사용할 수 있다. 설정 생성·자동 모델 대체·일반 대화의 조직 실행 변환은 없다.

## Weavra Status Projection

TUI에서 현재 Host가 소유한 `StandardWorkflow.snapshot`(기존 Kernel snapshot)을 footer에 투영한다. 별도 Workflow/State/Graph model을 만들거나 `.ai`에 UI 상태를 저장하지 않는다. Worker에는 UI/Extension 리소스를 추가하지 않는다.

- `RuntimeEvent` 수신 시 현재 snapshot의 run ID가 event와 일치할 때만 투영한다. 이벤트 종류를 상태 전이 명령으로 재해석하지 않는다. `RunCreated` 도중 아직 Kernel이 Host에 연결되지 않았거나 과거 복구 이벤트인 경우 건너뛰고 이후 현재 run 이벤트를 사용한다.
- 공식 `ctx.ui.setStatus("weavra.runtime", text)`로 단일 합성 문자열을 발행한다. 같은 문자열은 재발행하지 않으며 polling/timer는 없다. phase를 바꾸지 않는 token/tool 진행은 갱신하지 않는다.
- 예: `Weavra · QUICK · R1 · IMPLEMENT · Executor`, `Weavra · STANDARD · R2 · REVIEW · Reviewer`. WAITING_APPROVAL은 저장 phase가 IMPLEMENT여도 UI에 `APPROVAL`로 투영한다. terminal은 `Weavra · COMPLETED/BLOCKED/CANCELLED/FAILED/INTERRUPTED` 중 실제 상태만 표시하며 과거 active role을 붙이지 않는다.
- 실행 Promise 종료 시 final snapshot/report를 한 번 더 확인한다. 이벤트 없는 저장 실패도 반영하며 별도 cleanup/report 오류는 `Weavra · ATTENTION · /state`로 표시한다. owner가 끝났지만 snapshot이 active인 경우 `Weavra · UNCONFIRMED · /state`다.
- 시작 시 표시를 비우고 config/state 파일은 읽지 않는다. 저장된 상태나 writer 존재는 live 근거가 아니며 `/state` 등 과거 조회도 footer를 덮어쓰지 않는다. 종료 결과는 이 Host의 마지막 실행 결과로 유지하며 현재 filesystem 검증을 뜻하지 않는다.
- 새 run preflight에서 과거 결과를 지운다. `/workflow cancel`은 기존 cleanup을 기다린 후 실제 terminal 표시를 남긴다. switch/fork/tree/reload/shutdown은 cleanup 대기 전에 UI 연결을 끊고 자기 키만 지워 늦은 이벤트/finally가 stale 표시를 복원하지 못하게 한다.
- Snapshot/format/setStatus/clear 예외는 표시 계층에서 격리한다. 기존 주입 observer는 그대로 전달하고 실패 진단은 기존 Kernel이 소유한다. 정상 run을 FAILED로 바꾸거나 cleanup을 중단하지 않는다. 고장 난 UI의 실제 화면 갱신 자체는 best-effort다.
- 기존 Pi footer와 다른 키의 status를 유지한다. 외부 footer가 공식 extension status map(`getExtensionStatuses()`)을 렌더링하면 같은 키를 사용할 수 있다. 외부 extension 의존성·footer 교체·RPC/Print/JSON status 출력은 추가하지 않는다.

구체적인 live transition·승인·취소·lifecycle·UI 실패 검증은 `test/status.test.ts` 및 `packages/coding-agent/test/suite/company-runtime-status.test.ts`의 기존 harness/faux 통합을 따른다.

## 설정 schema 1

최소 실행 예제는 [examples/config.yaml](examples/config.yaml)이다. 아래는 기본값을 명시한 **수동으로 작성할 예시**다. 모델 ID와 검증 script는 프로젝트에 맞게 교체하고 실행 내용을 검토한다. STANDARD는 coding/reasoning 모델·인증을 모두, QUICK은 coding만 사전 검사한다.

```yaml
schemaVersion: 1
models:
  profiles:
    coding:
      provider: your-provider
      model: your-coding-model
    reasoning:
      provider: your-provider
      model: your-review-model
runtime:
  workflow: adaptive
agents:
  max_parallel: 1
  max_revision_cycles: 1
  worker_timeout_ms: 180000
review:
  enabled: true
state:
  enabled: true
  directory: .ai
risk:
  approval_required: [R3]
files:
  allowed_paths: [src, test]
verification:
  checks:
    - id: regression
      kind: test
      executable: node
      args: [scripts/check.mjs]
      cwd: .
      timeout_ms: 60000
      required: true
```

- 필수: `schemaVersion: 1`, `models.profiles.coding`, `models.profiles.reasoning`. 각 profile에는 비어 있지 않은 `provider`, `model`이 필요하다. `fast`, `creative`는 선택이다.
- `runtime.workflow`: `adaptive` 기본값 또는 `QUICK`/`STANDARD`/`COMPLEX`. 설정 파싱은 workflow 판정·실행이 아니다.
- `agents`: 병렬 수는 현재 `1`만 허용. STANDARD 재작업 횟수는 `0..3`, 기본 `1`이며 S5D부터 Host 실행에서도 그대로 적용한다. 최초 구현 이후 재작업 횟수다. QUICK/R3의 effective 한도는 항상 0이다.
- `agents.worker_timeout_ms`: 기본 `180000`(180초), 정수 `10000..600000`(10~600초). Developer·Reviewer·Executor의 각 역할 호출에 동일하게 적용한다. 전체 run이나 개별 Provider 요청의 timeout이 아니며 여러 tool/retry turns를 포함한 역할 실행 총 예산이다. 역할별 설정·무제한 값은 지원하지 않는다. `/workflow config`로 현재 값을 확인할 수 있다.
- `review.enabled`, `state.enabled`: `true`만 허용. state 디렉터리는 `.ai`로 고정한다.
- `risk.approval_required`: 현재 `[R3]`만 허용. 프로젝트 설정으로 review·state·승인 요구를 끌 수 없다.
- `files.allowed_paths`: 기본 `[]`. 문자 그대로의 workspace 상대 파일/디렉터리 경로이며 glob이 아니다. S2 Policy와 경로 Adapter가 이 범위 및 보호 파일·symlink를 검사한다.
- `verification.checks`: 기본 `[]`. check마다 `id`, `kind`, `executable`, 문자열 배열 `args`가 필수다. `kind`는 `build`/`lint`/`test`/`typecheck`/`format`/`custom`이다. 선택 필드는 `cwd`(기본 `.`), `timeout_ms`(기본 `60000`, 범위 `1..3600000`), `required`(기본 `true`)다. ID 중복을 거부한다.

파일/cwd 경로에는 절대 경로, `..`, Windows 드라이브/역슬래시, glob, 제어 문자를 허용하지 않는다. executable은 명시적 PATH에서 해석한 절대 경로로 고정한다. 설정 파싱 자체가 경로·프로그램의 안전성을 증명하지 않는다. **check 등록과 실행 확인은 신뢰한 코드에 대한 허가이지 OS sandbox가 아니다.** 실행은 필수 check 한 개 이상을 요구한다. S4 첫 Slice의 기본 재작업 1회는 유지하며, STANDARD는 설정한 0~3회까지 지원한다.

단일 YAML 문서(64 KiB 이하)만 지원한다. 알 수 없는 필드, 중복 키, alias, 알 수 없는 tag, 잘못된 타입은 거부한다. 문자열의 환경 변수·셸 표현식을 확장하지 않는다. 오류 메시지에 YAML 원문이나 값을 출력하지 않는다. API key, credential, 임의 Provider 옵션은 지원하지 않으며 기존 Pi 인증 저장소를 사용하도록 설계한다.

사용자가 설정을 관리한다. S2 Policy는 worker의 제어 파일 접근을 차단한다. Store는 첫 action의 config digest를 기준으로 같은 run에서 변경된 digest를 거부한다. S3 Adapter는 설정 사본을 고정하고 정책/config 및 전체 파일 도구 입력의 digest를 생성한다. 설정 parser 자체는 sandbox나 권한 gate가 아니다.

## 데이터 계약

`src/contracts.ts`는 TypeBox schema와 그 schema에서 추론한 TypeScript 타입을 함께 제공한다.

- `Run`: schema 버전, run/task 참조, 분류·risk, 실행 상태와 phase, revision, 역할 세션 참조, 검증 목록, timestamps(Unix milliseconds).
- `Task`: 목표, 요구사항, pending/inProgress/completed/blocked 상태.
- `Handoff`: Developer의 변경 요약, 전제·위험·미해결 항목과 검증 증거 참조.
- `Review`: Reviewer의 PASS/REVISE/BLOCK, 지적사항, 요구사항별 판단, 증거·diff digest.
- `CheckResult`: verifier가 생성할 실제 실행 결과와 증거 참조. 미실행 상태는 PASS와 구분한다.
- `PolicyDecision`: action/config digest에 연결한 판단. 사용자 승인 토큰이 아니다.

`validateContract`는 누락·알 수 없는 필드·타입 등을 검사한다. **유효한 schema가 완료 조건 충족이나 실행 허가를 의미하지 않는다.** 상태 전이, run/role/revision 일치, 증거 진위, R3 승인, PASS와 check의 관계는 S1 이후 Kernel/정책 검증의 책임이다. S3는 Handoff/Review schema를 전용 제출 도구에 노출하고 Adapter와 Kernel에서 다시 검사한다.

## S1 순수 Kernel

`classification.ts`, `kernel.ts`, `contracts.ts`, `ports.ts`, `events.ts`의 의존 경로에는 Pi SDK·UI·Provider·파일 I/O가 없다. `extension.ts`는 기존 Pi Host Adapter로 유지한다. S3의 `PiAgentExecutor`가 AgentExecutor를 구현한다. Kernel은 Pi 타입을 import하지 않는다.

- `classifyRequest(goal, hints?)`: 9개 intent, 3개 complexity, R0~R3의 최소 규칙 분류. 확률로 검증되지 않은 confidence는 `null`이며, 인식하지 못한 목표는 `requiresConfirmation: true`다. Host는 확인 전 실행하면 안 된다. 분류는 도구 실행 허가가 아니다.
- `selectWorkflow(classification, requested?)`: 최소 역할 선택. R2/R3의 QUICK 요청은 Reviewer가 있는 STANDARD로 승격한다.
- `CompanyKernel.create(request, ports, clock?)`: 새 run을 저장하고 RunCreated를 알린다. 저장소에 같은 ID가 있으면 거부한다. 복구·재실행은 하지 않는다.
- `start()`: 선택한 순차 Workflow로 진입한다. QUICK은 고정 scope·필수 check·live inspection이 필요하다. COMPLEX와 미지원 R3는 BLOCKED다. R2 및 한정 R3도 필수 check/live inspection과 현재 회차의 독립 세션 증거를 요구한다.
- `advance(expectedStep, signal?)`: 현재 단계 하나만 수행한다. 순서를 건너뛰거나 중복·동시 호출하면 거부한다. 실제 작업은 주입한 Port가 담당하며 S1 테스트에서는 fake뿐이다.
- `snapshot`: 외부에서 수정해도 Kernel에 영향을 주지 않는 상태 사본이다.
- `stop(CANCELLED | INTERRUPTED, reason)`: 단계 사이에서 중단한다. 진행 중 작업은 `advance`의 AbortSignal을 Port에 전달하고 반환 후 다시 검사한다. Port가 취소에 협조하지 않으면 반환까지 기다린다. 프로세스 강제 종료·자동 resume는 구현하지 않았다.

STANDARD Step ID는 `implement → self-check → review → test → complete`다. 재작업에도 ID는 유지하고 `attempt`를 증가시킨다. `(runId, stepId, attempt)`로 단계를 식별한다. Run의 `currentStep`이 이 식별자를 사용한다. `revisionCycle`과 handoff/review/check의 `revision`은 코드 재작업 횟수이며, Run의 `revision`은 상태 저장마다 증가하는 별도 번호다.

AgentExecutor에는 역할·profile·task·handoff·증거를, Verifier에는 check의 ID/kind/required 계약을 전달한다. 실제 모델·workspace·명령은 Host가 구성할 Adapter의 책임이다. StateStore의 `load/save` 계약은 S1 그대로이며 S2의 FileStateStore로 구현했다. S1 R2 테스트는 조직 판정을 검증했고, 실제 R2 파일 실행은 아래 S5B의 run binding과 durable state 검사로 연결한다. R3는 아래 S5C의 명시적 단일 삭제 scope·ApprovalPort·소비된 승인 evidence가 있어야 실행·완료할 수 있다. ApprovalPort 주입만으로 일반 R3 작업을 열지 않는다.

완료 guard는 다음을 확인한다: Developer handoff와 미해결 항목, 정확한 run/task/코드 revision, 독립 Reviewer PASS, 모든 요구사항과 증거 참조, 필수 check 누락·실패, exit code, 최신 diff. 최종 check가 diff를 바꾸면 BLOCKED로 보고하고 PASS를 재사용하지 않는다. S4에서도 자동 재검토 없이 종료하며 사용자가 변경을 확인해야 한다. Kernel은 신뢰한 Verifier가 반환한 증거의 연결을 검사하며 실제 파일·명령의 진위 검증은 하지 않는다.

### 이벤트 전달과 실패

- 구조화 이벤트에는 `schemaVersion`, `runId`, `taskId`, `sequence`, `stateRevision`, `timestamp`와 단계별 payload가 있다.
- `RuntimeEventSink`는 선택 사항이다. 상태 저장 뒤 `emit`을 순서대로 await한다. Sink는 빠르게 반환하거나 자체 출력 큐를 소유해야 하며, Kernel을 재진입 호출하지 않는다.
- Sink throw/reject는 `deliveryFailures`에 sequence/type으로 남긴다. 검증 실패가 성공으로 바뀌지 않으며 자동 재시도하지 않는다.
- 저장 실패는 현재 인스턴스를 FAILED로 닫고 오류를 호출자에게 반환한다. 이때 durable 상태는 이전 값일 수 있다. 그 실패를 저장 성공으로 주장하거나 RunCompleted 이벤트를 발행하지 않는다.
- 상태 사본과 Port 요청·결과·이벤트를 분리해 외부 객체 수정이 guard를 바꾸지 못하게 한다.
- Event Bus/서버/재생 로그/Event Sourcing은 없다. 향후 그래프 화면은 이벤트의 projection으로 붙인다. DAG 실행 엔진이나 병렬 Agent는 없다.

## S2 파일 StateStore와 실행 전 Policy

### 저장소와 소유권

- `FileStateStore.open(projectPath, options?)`: `realpath`로 프로젝트를 정규화하고 `.ai/writer.lock`을 배타 생성한다. 별칭 경로와 다른 프로세스도 같은 lock을 사용한다. PID는 참고 정보이며 생존 여부로 자동 탈취하지 않는다.
- `load/save`: 기존 StateStore Port 구현. Run revision은 정확히 1씩 증가해야 하며 terminal run은 덮어쓰지 않는다. 이전 run ID를 보존하고 활성 run은 프로젝트당 하나만 허용한다.
- `state.json`: `{schemaVersion, revision, runs, actions}`가 원본이다. 프로젝트 revision은 action 저장에서도 증가하며, Kernel의 Run revision·code revisionCycle과 별개다.
- `tasks.json`: 같은 프로젝트 revision을 가진 pending/inProgress/completed/blocked projection이다. 누락·손상·내용 불일치는 state에서 다시 만든다. state가 없는데 tasks만 있거나 state가 손상됐으면 열기를 거부한다.
- `prepare/finish`: `(runId, actionId)`를 중복 방지 ID로 사용한다. decision/digest와 PREPARED → SUCCEEDED/FAILED/INTERRUPTED 또는 DENIED만 저장한다. 입력 내용·출력·대화·tool history를 복제하지 않는다. `.ai/decisions.md`, 별도 logs/check 증거의 사용자용 출력은 S4/S5에 남겨둔다. config는 S0의 사용자 관리 파일을 유지한다.
- `close()`: 자신이 소유한 lock만 해제한다. `withFileStateStore(path, async store => …)`는 정상 반환·취소·예외에서 `finally`로 닫는다. 호출자는 **worker 종료를 기다린 뒤** scope를 끝내야 한다. 장기 실행 Host lifecycle 연결은 S3/S4 범위다.

저장은 같은 디렉터리의 무작위 temp 생성 → write → file sync → close → rename 순서다. state를 먼저 교체하고 tasks를 교체한다. `StateStoreError.stage/stateCommitted/cleanupFailed`로 부분 저장과 정리 실패를 구분한다. 저장 오류는 해당 인스턴스의 추가 변경을 차단하지만 lock을 즉시 해제하지 않는다. 실행 소유자가 worker/process 종료를 확인한 뒤 명시적으로 close해야 한다. 초기 open 실패처럼 worker가 아직 없는 경로만 자체 lock을 정리한다. 성공 상태의 state 교체 뒤 tasks 저장이 실패해도 호출 결과는 실패다. 디렉터리 fsync에 의한 전원 장애 내구성이나 여러 파일의 transaction은 보장하지 않는다. 파일당 16 MiB를 넘으면 거부하며 자동 보관·분할은 없다.

다음 소유자가 열면 CREATED/RUNNING/WAITING_APPROVAL은 INTERRUPTED로 바꾸고 activeAgents/next를 비운다. PREPARED action도 실행 여부를 추정하지 않고 INTERRUPTED로 남긴다. 저장 후 기존 `RunInterrupted` 이벤트를 발행하며 sink 실패는 `deliveryFailures`에만 기록한다. 기존 Step ID/attempt는 유지한다. 자동 resume/retry, 승인·PASS 재사용, 이벤트 재생은 없다. crash가 남긴 lock은 소유 프로세스 종료를 사용자가 확인하고 수동으로 정리해야 한다. 불명확하면 열지 않는다.

### Policy와 경로 Adapter

`policy.ts`는 파일 I/O·Pi·UI 없는 `evaluatePolicy`와 작은 실행 gate를 제공한다. `policy-paths.ts`의 `FilePolicyPathInspector`만 파일 시스템을 조회한다. Kernel은 두 Adapter를 import하지 않는다.

| 결과 | S2 동작 |
|---|---|
| ALLOW | 등록된 read/search 또는 일반 write/edit, R0/R1, 역할·허용 범위·경로 검사를 모두 통과해야 실행 |
| DENY | UNKNOWN, 미등록 도구, 임의 shell/exec, 보호·허용 범위 밖 경로, 검사 불가 등 미실행 |
| REVIEW_REQUIRED | R2 run binding이 없으면 미실행; dependency 파일 mutation은 최소 R2로 승격 |
| APPROVAL_REQUIRED | 지원되는 단일 삭제도 아직 정확한 미만료 인간 승인이 없으면 미실행 |

PolicyDecision의 기존 S0 예약 이름 REQUIRE_REVIEW/REQUIRE_APPROVAL을 위 이름으로 확정했고, action risk에 UNKNOWN을 추가했다. Run/분류 risk R0~R3 계약은 변경하지 않았다.

- Worker가 아닌 신뢰한 Adapter가 도구의 실제 operation, 역할, action risk 하한, 전체 입력의 action digest, 고정 정책/config digest를 구성해야 한다. 등록 이름만으로 도구 구현의 안전성을 증명하지 않는다.
- Reviewer/Lead는 write/edit 불가다. 허용 경로 기본값은 비어 있다. literal 상대 경로만 받아 절대 경로·`..`·역슬래시·glob·제어 문자를 거부한다.
- `.git`, `.ai`, `.pi`, 알려진 credential/secret 이름과 확장자, policy/config 파일을 읽기·쓰기 모두 보호한다. 추가 Runtime 소스·제어 파일은 신뢰한 Host가 `protectedPaths`로 지정한다. 임의 이름의 비밀 내용을 자동 판별하는 기능은 없다.
- 모든 경로 구성요소를 lstat 검사한다. workspace 안쪽 symlink까지 전부, dangling symlink, 새 파일의 symlink 조상, hardlink 파일, 특수 파일을 거부한다. 루트의 정규 경로 변경도 거부한다.
- **검색도 검사된 구체 파일 목록만 지원**한다. 디렉터리를 허가받아 재귀 검색하는 것은 불가다. S3 검색 도구는 caller가 명시한 파일 목록을 검사하며 디렉터리 후보 탐색을 구현하지 않는다. 이동·범용 구조 변경·검증 명령은 worker 도구로 제공하지 않는다. S5C의 한정 삭제는 별도 human approval을 같은 gate에 연결한다.
- `executePolicyAction`은 평가 → decision/intent 저장 → 경로 재검사 → lock/취소 검사 → executor → 결과 저장 순서다. ALLOW 이외의 결과와 저장·평가 실패는 executor를 호출하지 않는다. 저장 실패 후 다음 action도 차단한다.

신뢰된 같은 프로세스 Adapter를 위한 안전장치이지 OS sandbox가 아니다. 검사와 실행 사이 외부 프로세스의 교체 경합(TOCTOU), 악성 Extension 직접 I/O, 등록 프로그램 내부 동작을 완전히 통제하지 않는다. S3는 실제 파일 도구 입력·실행·취소를 같은 gate에 연결한다. 실제 SDK 세션은 faux provider로만 검증했으며 유료 Provider는 호출하지 않았다.

## S3 Pi SDK Agent Adapter

### API와 경계

`PiAgentExecutor.create({cwd, agentDir, config, modelRuntime, audit, ...})`가 사전 검사 후 AgentExecutor를 반환한다. `config`는 `parseRuntimeConfig` 결과, `modelRuntime`은 Host가 명시적으로 구성한 Pi ModelRuntime, `audit`은 해당 프로젝트 lock을 소유한 FileStateStore다. `agentDir`는 기존의 신뢰한 Pi 디렉터리이며 workspace 밖이어야 한다. Adapter는 새 인증 저장소를 만들거나 부모 Extension을 탐색하지 않는다.

```text
Kernel → AgentExecutor.execute(request) → PiAgentExecutor → 새 SDK AgentSession
                 ↑                              │
                 └── onSessionCreated(ref) ──────┘
                       저장 성공 후 prompt
```

- `execute`마다 새 세션·ResourceLoader·메모리 Settings·도구를 생성한다. 세션 재사용·부모 대화 복사·자동 모델 fallback은 없다. Adapter당 동시 호출을 거부한다.
- Port에 `onSessionCreated` 비동기 콜백만 추가했다. Pi Adapter는 이 콜백을 요구하며 Kernel이 제공한다. 역할·중복·schema 검사 후 `roleSessionRefs`를 저장하고, 실패하면 prompt를 시작하지 않는다. 콜백은 한 번만 유효하며 늦은 호출은 거부한다.
- Pi SessionManager가 `<agentDir>/sessions/company-runtime/` 아래 JSONL을 소유한다. 정규 세션 경로가 workspace로 들어가는 symlink도 거부한다. `.ai`에는 세션 ID/파일 참조만 저장한다. Pi는 첫 assistant 메시지까지 파일 생성을 늦추므로 조기 실패한 참조의 파일은 없을 수 있다.
- 공개 SDK만 사용한다. Kernel/Ports/Policy에는 SDK·UI·Provider 구체 타입을 추가하지 않았다. StateStore/Policy 저장 형식과 실행 gate도 변경하지 않았다.

### 역할별 도구와 결과

| 역할 | 제공 도구 |
|---|---|
| Developer | `runtime_read`, `runtime_search`, `runtime_write`, `runtime_edit`, `runtime_request_check`, `submit_handoff` |
| Reviewer | `runtime_read`, `runtime_search`, `submit_review` |
| Developer (한정 R3) | `runtime_read`, `runtime_search`, `runtime_delete`, `runtime_request_check`, `submit_handoff`; write/edit 없음 |

파일 도구는 모두 S2의 검사→intent 저장→재검사→실행→결과 저장을 통과한다. Worker가 role/risk/등록 도구/digest를 지정하지 않는다. Runtime 자신의 소스 디렉터리가 workspace 안에 있으면 자동 보호하고, 추가 제어 파일은 Host의 `protectedPaths`로 제한한다. read/search는 R0, 일반 write/edit는 R1에서 시작하며 dependency 파일은 R2로 승격한다. bound STANDARD/R2가 아니면 실행을 차단하고 새 R2 run을 안내한다. 임의 코드를 분석해 모든 의미적 위험을 자동 판정하는 기능은 아니다.

- 일반 bash·Pi 기본 도구·외부 custom tool을 설치하지 않는다. 파일 도구는 sequential이며 SDK Agent도 sequential로 설정한다.
- 텍스트 파일은 256 KiB 이하, edit는 유일한 exact match, write는 기존 부모 디렉터리만 지원한다. 검색은 최대 32개 명시 파일의 literal 문자열 검색이며 100개 결과에서 잘림을 표시한다. OS sandbox·원자 코드 변경/rollback은 아니다.
- `runtime_request_check`는 등록 ID만 받아 Pi tool history에 요청을 남기고 **UNAVAILABLE/미실행**을 반환한다. verifier를 호출하거나 PASS 증거를 만들지 않는다.
- Handoff/Review 제출은 자기 역할의 전용 schema만 받는다. run/task/role/code revision 및 Review diffDigest를 검사한다. 자연어 완료, schema/identity 오류, 다른 도구와 섞인 제출 batch는 실패다. 정상 수락한 제출만 `terminate`로 종료하며 이후 도구 실행을 막는다. Reviewer evidence 참조 오류와 아래 Developer unresolved 표현 오류는 Tool error로 반환하여 기존 시간·턴 한도 안에서 같은 세션의 수정·재제출을 허용한다.
- Kernel의 기존 독립 Review·요구사항·증거·완료 guard는 유지한다. Adapter의 schema 통과는 COMPLETE 승인이 아니다.

Developer의 `unresolved`는 **직접 해결하지 못한 구현·요구사항 문제와 blocker**다. 예를 들어 `Required input validation is not implemented.`는 반드시 남겨야 한다. 반면 `Independent Reviewer PASS is required and remains pending.`는 Kernel/Workflow가 관리하는 후속 의무이므로 unresolved에 쓰지 않는다. SELF_CHECK·TEST·Human Approval 필요 여부도 Runtime이 관리한다. `unresolved: []`는 구현 미해결 문제가 없다는 뜻일 뿐 review/check/approval 완료나 생략 허가가 아니다. R3의 미실행 삭제 등 실제 필요한 변경이 남았다면 구체적 미완료 문제로 보고해야 하며 승인 도구를 우회할 수 없다.

`submit_handoff`는 Developer에 한해 알려진 영어 whole-entry 패턴(Reviewer/PASS, SELF_CHECK, TEST, Human Approval + required/needed/pending)을 보수적으로 검출한다. 거부된 handoff는 저장/수락하지 않고, 해당 필드와 실제 blocker 보존 지침을 Tool error로 전달한다. 어떤 문자열도 자동 삭제·필터링하지 않는다. 구현 문제를 함께 담은 문장이나 인식하지 못한 표현은 그대로 수락될 수 있으나, unresolved가 하나라도 남으면 Kernel의 기존 `unresolved.length === 0` 완료 가드가 차단한다. 자연어 전체를 의미적으로 판정하는 기능이 아니다. QUICK Executor 계약·가드, R1/R2 독립 review와 R3 consent 조건은 유지한다. 이미 수락한 handoff를 이후 Reviewer PASS에 맞춰 다시 쓰지 않는다.

Reviewer는 `VerificationResult.reviewContext`의 명시적 `{diff, evidence:[{ref,content}]}`를 요구한다. 모든 evidence reference와 실제 자료가 대응해야 한다. 이 선택 필드는 S1 fake 검증 계약을 유지하기 위한 최소 확장이며, 실제 Pi Reviewer에서는 누락을 거부한다. S3 테스트는 고정 fixture를, S4는 실제 Git/파일 snapshot과 등록 check 결과를 전달한다. Developer reasoning이나 세션 history는 전달하지 않는다.

### Resource와 모델

- DefaultResourceLoader를 생성하거나 reload하지 않는다. 명시적 ResourceLoader가 Extensions/Skills/Prompt templates/AGENTS/Themes/append prompt를 빈 값으로 반환한다. `noExtensions` 하나에 의존하지 않는다.
- system prompt는 역할 규칙과 선택적인 `projectInstructions` 문자열뿐이다. AGENTS.md는 자동 사용하지 않는다. Host가 검토한 규칙을 이 문자열로 전달할 수 있으며 정책 권한을 낮추지 못한다.
- Settings는 역할별 in-memory이고 자동 compaction·agent retry·provider retry·skill command를 끈다. 프로젝트/전역 Settings 파일은 로드하지 않는다.
- 생성 시 coding/reasoning 모두 `config mapping → ModelRuntime.getProvider/getModel → checkAuth/getAuth`를 확인한다. 실행 직전 선택 profile/auth를 다시 확인하고 명시한 model을 SDK에 전달한다. 누락·설정 오류·인증 실패는 시작 전 오류이며 fallback을 허용하지 않는다.
- 주입된 ModelRuntime의 기존 Pi 인증·Provider 범위를 사용한다. 부모의 동적 등록/메모리 인증을 자동 공유하지 않는다. 공유가 필요하면 Host가 검토한 Runtime을 명시적으로 주입하고 실행 중 변경하지 않아야 한다. 사전 auth 해석 성공은 원격 서비스 가용성 보장이 아니다. OAuth 갱신 등이 필요한 실환경 auth는 네트워크를 사용할 수 있으나 테스트는 faux만 사용한다.

### 취소와 이벤트

기본 실행 제한은 180초·32 turns다. `.ai/config.yaml`의 `agents.worker_timeout_ms`(10,000~600,000ms)를 Extension Host가 전달하며 Adapter는 복사한 config와 함께 호출 예산을 고정한다. 이미 생성된 Adapter의 예산은 원본 config 객체를 바꿔도 변하지 않는다. Developer·Reviewer·Executor에 공통으로 적용하며 새 역할/재작업 호출마다 예산을 새로 시작한다. V0.1에는 역할별 timeout이나 자동 연장·재시도를 추가하지 않는다.

실행 timer는 `execute()`에서 audit/auth 재확인·SDK 생성·session 참조 저장·전체 prompt/tool turns·R3 승인 대기를 포함한다. inactivity timeout이 아니므로 응답/도구 호출마다 갱신되지 않는다. 생성 시 profile/auth 사전 검사도 같은 값의 별도 AbortSignal budget을 사용한다. 등록 check의 `verification.checks[].timeout_ms`와 R3 승인의 TTL은 별도이며 변경하지 않는다. 직접 SDK를 구성하는 신뢰된 Host/test의 기존 `timeoutMs` override(1~3,600,000)와 `maxTurns`(1~128)는 유지하지만 이 override는 YAML 필드가 아니다.

Kernel의 AbortSignal과 timeout을 결합하고 tool gate·실제 파일 실행·Provider stream 시작 지점에서 검사한다. timeout은 기존처럼 실패이며 다음 역할·COMPLETE로 진행하지 않는다. `/workflow cancel`·switch/fork/tree·reload/shutdown은 늘어난 timeout까지 기다리지 않고 즉시 취소 signal을 전달한다. 먼저 취소된 호출은 비협조 Provider를 기다리는 동안 deadline에 도달해도 timeout으로 원인을 덮어쓰지 않는다. SDK prompt preflight에서 취소되어도 스트림 시작 guard가 Provider 호출을 막는다. 취소/실패한 run ID는 해당 Adapter에서 다음 역할을 실행하지 않는다.

`finally`에서 abort/idle을 기다린 후 unsubscribe/dispose한다. 늦은 결과와 cleanup 중 취소도 성공으로 반환하지 않는다. 협조하지 않는 Provider/인증/파일 시스템 I/O를 강제로 종료하는 OS 격리는 없다. timeout은 취소 요청 시점이며 비협조 I/O의 정리 완료 시간까지 보장하지 않는다. Host는 worker 정리 후 StateStore lock을 해제해야 한다.

이벤트 발행자는 계속 Kernel 하나다. 기존 AgentStarted는 Adapter 호출 시작, 새 **AgentSessionCreated**는 세션 참조 저장 성공, AgentCompleted/Failed는 호출 결과를 의미한다. 새 이벤트에는 step/role/profile/code revision/sessionRef가 있으며 Completed/Failed에도 가능한 sessionRef를 포함한다. 기존 sequence/stateRevision/저장 후 발행 규칙을 유지한다. 토큰 스트림·reasoning·전체 대화를 RuntimeEvent로 복제하지 않는다. 직접 Adapter만 호출하는 Host는 콜백 저장을 구현해야 하며 별도 이벤트 버스는 없다.

S3의 단일 역할 검증에 이어 S4는 아래 전체 순차 흐름을 연결했다. R3 승인 UI는 이후 S5C에서 추가했으며 DAG·병렬화는 미지원이다.

## S4 STANDARD 실행

```text
명령/신뢰 확인 → 분류 → project lock → profile/auth → clean Git baseline
  → IMPLEMENT (새 Developer session)
  → SELF_CHECK (등록 checks + 실제 diff/evidence)
  → REVIEW (새 read-only Reviewer session)
      REVISE → IMPLEMENT (최대 1회), BLOCK → 종료
      PASS → TEST (등록 checks 재실행)
  → COMPLETE 직전 live digest 재확인 → Kernel 저장 → 최종 보고 → lock 해제
```

### 소유권과 계약

- `StandardWorkflow`가 순차 Kernel 호출, AbortController, Verifier/StateStore의 생존 기간을 소유한다. Kernel만 상태 전이와 COMPLETE를 결정한다. Host는 시작·상태·취소를 전달한다.
- `RegisteredVerifier`가 기존 Verifier Port를 구현한다. Port의 선택적 `inspect`는 check 재실행 없는 live evidence 조회다. 실제 S4 Adapter는 반드시 제공하며 Kernel/Ports는 SDK·fs를 import하지 않는다.
- Run에는 최소 `workspace`(digest, 변경 경로, 참조, 안전 여부)와 구조화 `review`를 보관한다. CheckResult에는 시작/종료 시각, 실제 exit code, 제한된 stdout/stderr가 추가된다. RuntimeEvent의 기존 sequence·step/attempt·저장 후 발행 규칙은 유지한다.
- `.ai`는 operational state/check 요약만 보관하고 전체 diff/reasoning/transcript를 복제하지 않는다. 실제 Reviewer 자료는 명시적인 reviewContext로 전달하고 Pi 세션이 기록한다. 별도 decisions.md/logs 조회 UI·usage 집계는 S5 범위다.

### Git와 freshness

- Git 프로젝트 루트, 기존 HEAD, clean tracked/staged/untracked 상태를 요구한다. dirty면 worker prompt 전에 거부한다. 설정이나 사용자 파일을 자동 정리하지 않는다.
- `.ai/state.json`, `.ai/tasks.json`, `.ai/writer.lock`을 제외하며 이 세 파일의 Git 추적은 거부한다. S5D의 정확한 generated view 두 경로는 유효한 ownership/checksum이 있을 때만 추가 제외한다(아래 설명 참조). `.ai/config.yaml`과 그 밖의 `.ai` 파일 변경은 숨기지 않는다. 사용자가 `.gitignore`를 직접 관리해야 한다.
- HEAD/index/config와 정렬된 파일 경로·mode·전체 byte SHA-256으로 digest를 만든다. 허용 root 안의 ignored 파일도 포함한다. `diff`는 변경 파일별 실제 before/after UTF-8 내용·mode의 JSON이며 unified patch 형식은 아니다.
- 시작 후 HEAD/index 변경은 보수적으로 unsafe로 차단한다. 보호 파일·binary 변경도 성공 대상으로 허용하지 않는다. Reviewer PASS와 SELF_CHECK/TEST 증거는 같은 digest에 묶인다. TEST 중 변경이나 COMPLETE 직전 변경은 BLOCKED이며 과거 PASS를 재사용하지 않는다.
- 증거 한도: 5,000개 파일, 파일당 2 MiB, 합계 32 MiB, diff 240,000 bytes, 허용 root 탐색 10,000개. submodule·symlink·hardlink·special file·비표준 Git 경로는 초기 Slice에서 거부한다. 수집 불가는 성공이 아니라 불완전 수집으로 보고한다.

### 등록 check 실행

- immutable executable/argv/cwd/timeout/env tuple이 등록과 정확히 같아야 한다. Verifier 전용 PolicyDecision → intent 저장 → cwd/lock/취소 재확인 → `spawn(shell:false)` → 실제 종료 결과 저장 순서다. Worker에 process tool을 제공하지 않는다.
- shell·일반 실행 wrapper·inline eval/print switch를 차단한다. Worker가 요청한 check ID는 여전히 미실행 요청이며, 실제 checks는 Kernel의 SELF_CHECK/TEST에서만 실행한다. 명시적으로 등록된 workspace script/program은 worker 보호 경로에 추가한다.
- 환경은 PATH, LANG, LC_ALL, CI, NO_COLOR 및 Git 전역 설정/인증 prompt 차단 값만 전달한다. HOME/NODE_OPTIONS/Provider key/npm token/proxy 등은 상속하지 않는다. PATH와 등록 프로그램·그 의존 코드는 신뢰한 Host 책임이다. 실행 프로그램 내부 I/O·네트워크·읽는 설정까지 sandbox하는 기능은 없다.
- 실제 exit 0만 PASS 후보이며 실패·timeout·출력 한도는 FAIL, 실행 불가는 UNAVAILABLE, 취소로 시작하지 않은 다음 check는 SKIPPED다. 출력은 stdout/stderr 합계 16 KiB로 제한하고 초과하면 종료·FAIL로 기록한다. 후속 check가 앞 check의 대상을 바꾸면 앞 증거도 stale로 처리한다.
- POSIX process group에 TERM 후 필요하면 KILL을 보내고 close·group 소멸 확인을 기다린다. 부모가 먼저 종료하며 남긴 background process도 종료하고 check를 실패시킨다. 정리 확인이 안 되면 lock을 유지해 수동 점검을 요구한다. Windows·탈출한 별도 process group/daemon은 지원하지 않는다.

### 실패·취소·Host lifecycle

- 실패/timeout/취소 후 실제 변경 경로를 다시 수집하고 partial changes, verification 상태, 원인, 권장 후속 조치를 보고한다. 수집 실패는 `changesUnknown`으로 표시한다. 활성 단계의 상태 출력은 live diff가 아니므로 부분 변경 가능성을 표시한다.
- session switch/fork/tree, reload/shutdown, `/workflow cancel`은 worker/check 정리를 기다린다. preflight 확인 dialog에도 signal을 전달한다. **부모 Esc가 worker를 취소한다고 가정하지 않으며 `/workflow cancel`을 사용한다.**
- 외부에서 authoritative state가 바뀌면 덮어쓰지 않고 저장 실패로 닫는다. COMPLETE 저장 실패는 RunCompleted를 발행하지 않는다. per-file atomicity와 부분 commit 한계는 S2와 같다.
- 기존 lock을 자동 탈취하거나 Git rollback/stash/reset/checkout/clean/commit을 하지 않는다. 외부 프로세스의 TOCTOU, 악성 같은-process Extension, 협조하지 않는 Provider/auth I/O를 완전히 제어하지 못한다. 완료는 해당 snapshot에 대한 판단이지 이후 외부 변경을 영구 방지한다는 뜻이 아니다.

## S5A QUICK 실행

```text
/workflow run Fix typo in src/app.ts
  → QUICK/R1, targetPath=src/app.ts
  → 새 Executor (coding profile)
  → SELF_CHECK → TEST → Kernel guard → COMPLETE
```

- 같은 `StandardWorkflow` 실행 소유자를 재사용한다. 이름은 기존 S4 API 그대로이며 분류에 따라 QUICK도 실행한다. 새 Agent 시스템/Verifier/StateStore/증거 엔진을 만들지 않는다.
- QUICK 후보: question·typo·명시적 작은 변경/한 파일 작업. unknown·refactor·아키텍처/다수 모듈/대규모 및 R2/R3는 QUICK 실행 대상이 아니다. R1은 goal에서 한 개의 확장자 있는 literal 상대 파일 경로를 요구한다. 예: `Fix typo in src/app.ts`, `작은 설정 수정 ui/settings.json`. 공백 있는 파일명·문장에 붙인 조사 등은 초기 parser에서 지원하지 않으므로 경로를 별도 토큰으로 쓴다.
- R0(`Explain src/app.ts`)는 write/edit 도구가 없고 Policy도 mutation을 거부한다. R1은 시작 시 고정된 targetPath 한 개만 수정한다. 설정 예시도 기존 `.ai`/config/credential 보호를 우회하지 않는다. dependency 대상은 action에서 R2로 승격·미실행 처리된다.
- 실제 workspace 변경이 한 파일을 넘거나 보수적 변경 구간 합계 100행을 넘으면 BLOCKED다. 공통 prefix/suffix를 뺀 removed+added 구간을 세므로 떨어진 작은 수정도 사이 구간이 길면 거부할 수 있다. 의미적 영향 범위를 증명하는 분석기나 OS sandbox는 아니다.
- Executor는 기존 `coding` mapping을 사용한다. `fast` 자동 선택·cost routing·fallback이 없다. `PiAgentExecutor.create`에 Host가 고정한 `quickScope`를 넘기고 요청의 scope와 일치해야 한다. QUICK은 Reviewer를 생성하거나 reasoning auth를 조회하지 않지만 config schema의 coding/reasoning mapping 필수 조건은 유지한다.
- 제출은 기존 `submit_handoff`에 ExecutorHandoffSchema를 사용한다. 기존 handoff 필드에 요구사항별 `requirement/status/explanation`이 필수이며 `role: Executor`다. 정확한 requirement coverage·MET·설명, actual changed_files 일치, unresolved 없음이 필요하다. QUICK/R0 read-only 설명·분석에서 known_risks는 정보성 finding일 수 있으므로 보존하되 완료를 막지 않는다. 실제 changedFiles는 반드시 비어 있어야 한다. QUICK/R1 mutation은 known_risks가 남으면 기존대로 BLOCKED이며 STANDARD 재실행이 필요하다. 이 모델 진술만으로 완료하지 않으며 실제 필수 SELF_CHECK/TEST evidence를 함께 검사한다. 의미적 정확성은 프로젝트 check 품질과 사용자 확인에 의존한다.
- Kernel이 구현 직후 실제 digest를 `executorDigest`에 결합한다. 이후 SELF_CHECK/TEST/COMPLETE에서 달라지면 stale로 차단한다. **QUICK에서는 check autofix도 결과 제출 후 변경이므로 완료 불가**다. 형식 변경은 Executor 단계에서 끝내거나 처음부터 STANDARD로 실행한다.
- Run에는 `quickScope`, 구조화 `executorResult`, `executorDigest`, 기존 workspace의 `changedLines`를 저장한다. 전체 diff/transcript를 `.ai`에 중복 저장하지 않는다. 이벤트는 기존 Step/attempt/sequence이며 Reviewer 이벤트만 없다. 모든 QUICK step의 attempt는 1이며 재작업/자동 hot-switch는 없다.
- 체크의 Policy 거부는 optional check라도 QUICK에서 FAIL로 완료를 막는다. 임의 미실행을 PASS로 처리하지 않는다. 취소/Provider 실패/저장 실패와 partial changes 보고·lock cleanup은 S4 경로를 공유한다.
- 네 명령은 `Workflow: QUICK`, `Agent: Executor`, `Reviewer: not required`, risk, 구조화 결과를 표시한다. 기존 `runtime.workflow: STANDARD` 설정으로 처음부터 독립 review 경로를 선택할 수 있다. 새 mode UI는 추가하지 않았다. 더 넓은 작업이 필요하면 현재 변경을 사용자가 보존·정리한 뒤 새 STANDARD run을 시작한다.

## S5B R2 Review Enforcement

```text
/workflow run Update dependency in package.json and package-lock.json
  → STANDARD/R2 사전 선택 (coding/reasoning 모두 검사)
  → run ID에 결합한 Policy + 저장된 R2 Developer 상태 확인
  → Developer → SELF_CHECK → 독립 Reviewer
  → PASS → TEST → 최신 digest/current-session guard → Kernel COMPLETE
```

- `files.allowed_paths`에 명시된 파일만 기존 write/edit로 처리한다. manifest/lockfile을 다룰 때도 `.ai`/credential/.git/Runtime·등록 script 보호, symlink/hardlink·size 제한은 그대로다. 새로운 설치·삭제·이동·mkdir·배포·shell 도구는 없다.
- 기존 classifier가 초기 R2로 판정하면 `adaptive`는 STANDARD를 고른다. Complexity QUICK/Risk R2도 Executor를 생성하지 않는다. 명시적 `runtime.workflow: QUICK`은 R2를 거부한다. COMPLEX/범용 R3는 미지원이며 한정 R3는 아래 S5C를 따른다. R1/QUICK 실행 중 dependency action이 나타나면 REVIEW_REQUIRED로 차단하고 사용자가 새 STANDARD/R2 run을 시작해야 한다.
- Host composition callback은 `createAgents(store, quickScope?, r2RunId?)`를 받는다. PiAgentExecutor.create와 PolicyContext의 `r2RunId`는 Host가 preflight에서 고정하며 모델 도구 입력으로 받지 않는다. 다른 run/Executor/QUICK scope와 혼용할 수 없고 configDigest에도 포함된다.
- Policy는 bound run의 Developer 파일 mutation을 R2 하한으로 평가한다. 그 결과의 ALLOW는 **독립 리뷰를 생략할 허가나 이미 받은 PASS가 아니다.** 해당 run은 이후 Reviewer PASS 없이는 완료하지 못한다.
- R2 ALLOW intent를 저장할 때 StateStore는 실제 저장된 STANDARD/R2·RUNNING·IMPLEMENT·attempt·active Developer와 마지막 세션 참조를 검사한다. R2 risk/workflow obligation을 낮춰 저장할 수 없다. 순수 Policy에 binding을 꾸며 넣어도 durable R1 run에서 실행하지 못한다.
- Kernel은 현재 구현/리뷰 회차의 서로 다른 session ID와 sessionFile, 정확한 review/requirement evidence, 필수 SELF_CHECK/TEST와 live workspace digest를 확인한다. 재작업 시 이전 Reviewer 참조를 비우고 새 등록을 요구한다. 가짜/누락된 참조, 자연어 PASS, stale digest, BLOCK·REVISE 한도 초과, check/상태 저장 실패는 완료가 아니다.
- 기존 Review/Run/Action 상태 포맷·STANDARD Step/attempt·RuntimeEvent를 재사용한다. 별도 R2 Workflow나 event bus·risk hot-switch·approval token은 없다. 네 명령에 `Risk: R2`와 `Review enforcement: REQUIRED (STANDARD/R2)` 및 분류 근거를 표시한다. Policy 거부 사유는 신뢰된 Policy 문자열만 최종 오류에 전달하며 Provider 원문 로그는 노출하지 않는다.
- **실제 패키지 설치나 lockfile 재생성을 자동 보장하지 않는다.** 테스트는 임시 manifest/lockfile의 명시적 텍스트 변경과 등록 Node check를 검증한다. 사용자 check가 실제 설치 상태·lockfile 일관성·회귀를 검증하도록 구성해야 한다. 등록 프로그램 내부의 script 실행·네트워크·설치 동작은 기존과 같이 trusted code이며 sandbox하지 않는다. 특히 변경 가능한 프로젝트 metadata를 읽어 실행하는 검증 명령은 그 간접 실행까지 사용자가 검토해야 한다.
- 거부/실패/취소는 이미 변경한 파일을 rollback하지 않는다. R3 Human Approval은 S5C이며 이 binding을 인간 승인으로 재사용하지 않는다.

## S5C R3 Human Approval

```text
/workflow run Delete file src/obsolete.ts
  → clean Git / tracked UTF-8 / 허용 경로 확인
  → Developer runtime_delete 요청
  → PENDING 저장 / WAITING_APPROVAL / 인간 선택 (기본 Deny)
  → 정확한 미만료 승인 → intent 저장 → target/config/signal 재검사 → unlink
  → action SUCCEEDED 저장 → 승인 CONSUMED 저장
  → SELF_CHECK → 독립 Reviewer PASS → TEST → Kernel COMPLETE
```

### 지원 범위와 사용

- 초기 grammar는 `Delete file <상대 경로>`, `Remove file <상대 경로>`, `파일 삭제 <상대 경로>`다. 공백 없는 literal 경로 한 개만 받는다. 대상은 clean baseline의 Git 추적 일반 UTF-8 파일이며 256 KiB 이하, `files.allowed_paths` 안이어야 한다.
- `.git`, `.ai`/Runtime 설정·정책, 기존 규칙의 credential/secret, 알려진 npm/Cargo/Python/Go manifest/lockfile, node_modules와 symlink/hardlink/특수 파일은 승인으로 우회하지 못한다. 모든 의미적 파일 종류나 숨겨진 비밀을 판별하는 기능은 아니다. 디렉터리·대량 삭제·설치·배포·history·임의 shell은 지원하지 않는다.
- R3 scope는 새 run에만 고정한다. R1/R2/QUICK에서 자동 승격하지 않으며 R2 binding을 인간 승인으로 취급하지 않는다. R3 Developer에는 delete 요청 외 mutation 도구가 없다. Reviewer는 계속 read-only다.
- **`runtime_delete` 호출 자체가 승인 요청의 진입점**이다. Developer는 별도의 approval tool이나 승인 권한을 갖지 않으며, 이미 승인받았다고 가정하고 기다리는 구조가 아니다. preselected target으로 호출하면 Runtime이 `WAITING_APPROVAL`을 저장하고 사용자에게 Deny/Approve once를 묻는다. 유효한 1회 승인일 때만 그 tool 안에서 exact tracked text file을 삭제하고 결과를 반환한다. Deny·승인 timeout은 삭제 없이 종료한다. prompt/tool 설명은 승인 요청 능력과 승인 권한을 구분하며, Developer의 직접 승인·우회·tool 확인 전 승인 획득 주장을 금지한다. R3 Reviewer 및 R0/R1/R2에는 이 승인 요청/삭제 도구가 제공되지 않는다.
- 일반 run/check 확인과 실제 삭제 승인은 별개다. Pi의 `--approve`는 project trust 설정이지 R3 승인 bypass가 아니다. 삭제 UI는 project/run/role/step/path/bytes/fingerprint/action/expiry를 표시하고 **Deny를 첫 선택**으로 둔다. 명시적으로 `Approve once`를 골라야 한다.
- 승인 modal에서는 선택 또는 Esc/ctrl+c로 응답한다. Esc는 이번 승인 거부이며 다른 단계의 부모 Esc가 worker를 자동 취소한다는 의미가 아니다. modal이 떠 있는 동안 터미널 slash command 입력 대신 dialog 응답이 우선한다. Host API의 status/cancel과 lifecycle은 계속 동작하며, cancellation signal이 modal·worker를 정리한다.

### Port·상태·1회 실행

- 기존 ApprovalPort는 `requestApproval(request, signal?)`을 제공한다. request는 run/action ID, Developer role, delete-file operation, path, fingerprint, byte 수, step/attempt, revision, action/config digest, expiresAt을 담는다. 응답은 정확히 같은 run/action/digests/expiry와 boolean approved만 포함한다. 누락·불일치·UI 오류/부재는 승인으로 취급하지 않는다.
- Kernel은 `onApprovalRequested`/`onApprovalConsumed` callback을 SDK adapter에 전달한다. callback은 Provider prompt/tool schema에 노출하지 않는다. timeout·취소 뒤 UI가 늦게 true를 반환해도 실행하지 않는다.
- 기본 TTL은 30초다. Host composition의 `approvalTimeoutMs`만 1~60,000ms로 지정할 수 있고 config YAML은 바꾸지 않았다. 기존 worker 총 timeout도 유지하므로 승인 대기 중 더 일찍 취소될 수 있다.
- Run의 선택적 r3Scope와 approvals ledger에 PENDING → APPROVED → CONSUMED 또는 DENIED/EXPIRED/CANCELLED/INTERRUPTED를 보관한다. 승인 request metadata는 바꿀 수 없고 과거 ledger를 지우지 못한다. action audit의 고유 `(runId, actionId)`가 재실행을 막는다.
- StateStore는 R3 ALLOW intent 전에 저장된 STANDARD/R3·IMPLEMENT·Developer session·APPROVED request·digest·step/attempt·만료를 검사한다. CONSUMED는 같은 action의 durable SUCCEEDED가 있어야 저장한다. 승인 flag만으로 실행/완료 상태를 꾸밀 수 없다.
- 실행 직전 `dev/ino/mode/size/mtime/ctime/bytes hash` fingerprint, 정규화된 config, signal과 만료를 다시 확인한다. 마지막 확인과 unlink 사이에는 JS yield가 없다. 외부 프로세스의 syscall 사이 경합까지 원자적으로 막는다는 뜻은 아니다.
- 재시작 시 active run과 미완료 grant를 INTERRUPTED로 남기고 실행·승인·resume를 자동 반복하지 않는다. 사용된/거부된/만료된 승인은 다른 요청에 재사용하지 못한다.

### 완료와 한계

- 승인은 파일 삭제 1회를 허용할 뿐 작업 완료나 Reviewer PASS가 아니다. 소비 기록 없이 check로 넘어가지 않는다. 정확한 단일 삭제 diff, 구조화 handoff/requirements, 현재 회차의 독립 Reviewer PASS, 필수 두 검증 단계와 최신 digest가 필요하다.
- R3 재작업은 0회다. Reviewer REVISE/BLOCK, check 실패/stale diff, Provider/저장 실패는 성공이 아니며 이미 삭제한 파일은 partial changes로 보고한다. 자동 rollback/복원은 하지 않는다.
- 파일 삭제와 state/tasks 여러 파일을 하나의 transaction으로 묶지 않는다. unlink 후 저장 실패는 실제 effect가 남을 수 있으며 audit/state를 확인해야 한다. OS sandbox·전원 장애 내구성·강제 daemon 종료는 제공하지 않는다.
- 등록된 verifier 프로그램은 여전히 trusted code다. 승인 gate는 Runtime의 delete 도구를 보호하며 검증 프로그램 내부의 임의 I/O/네트워크까지 가로채지 않는다. 사용자 check는 간접 실행하는 프로젝트 코드까지 검토해야 한다. S5C 자동 검증은 테스트가 생성한 임시 파일만 삭제했다. 후속 실제 GPT RC-05의 승인 UI·유지/삭제 증거와 한계는 [validation](../../docs/GPT_RC_VALIDATION_2026-09-16.md#7-rc-05--scoped-r3-human-approval)을 따른다.

## S5D 읽기 전용 관찰과 명시적 export

```text
/workflow history
/workflow status <full-run-id>
/state checks latest
/state check 2 latest
/state review latest
/state decisions latest 2
/team
/risk
/state export
```

### 조회의 의미

- run ID 생략 또는 `latest`는 최신 run이다. 다른 ID는 정확히 일치해야 하며 prefix 추정/자동 fallback은 없다. page/check 번호는 1부터 시작한다. 각 명령의 `help`로 문법을 볼 수 있다.
- local 실행 중에는 Kernel/action audit snapshot을, 그 밖에는 `FileStateStore.readSnapshot(cwd)`의 원본을 사용한다. 이 메서드는 디렉터리/lock을 만들거나 tasks를 repair하거나 active run/grant를 INTERRUPTED로 바꾸지 않는다. 다른 writer가 있어도 atomic state snapshot을 읽는다.
- writer.lock 존재는 생존 증명이 아니다. 저장된 active 상태는 liveness unconfirmed로 표시하며 취소는 해당 owner Pi에서 해야 한다. 다른 Pi의 `/workflow cancel`로 원격 제어하는 기능은 없다.
- 모든 view는 출처·recorded 시각과 filesystem/check 미재검증을 표시한다. 저장된 COMPLETED/PASS를 현재 코드나 worker 생존에 대한 보장으로 읽으면 안 된다. tasks projection이 없거나 source와 어긋나면 경고하고 조회에서 고치지 않는다.
- 같은 Host에서 마지막 저장 실패와 durable 상태가 다르면 local 실패를 우선 표시하며 durable 상태도 함께 안내한다. state가 손상되면 이전 성공 캐시로 대체하지 않는다. reload 후 메모리 전용 실패 원인은 사라질 수 있으므로 저장된 active 상태/불일치 경고와 원본을 확인해야 한다.
- 명령 출력은 페이지와 약 32,000자 한도를 사용하고 잘림을 표시한다. terminal 제어문자/bidi를 escape한다. check output 상세는 원본의 bounded stdout/stderr를 표시하며 새 check를 실행하지 않는다. team은 Pi session 참조만 읽고 JSONL을 열어 복제하지 않는다.

### 기록과 revision

- Run의 `maxRevisionCycles`는 실제 적용한 한도다. STANDARD는 config 0~3(기본 1), QUICK/R3는 0이다. `handoff`는 구조화 Developer 결과이며 승인이 아니다. `reviewHistory`는 수락한 회차별 REVISE/PASS/BLOCK을 보존한다.
- 실제 `CheckResult.step`을 저장해 SELF_CHECK/TEST와 attempt를 구분한다. 이전 기록에 없는 step/timing/limit는 `not recorded`로 표시하고 추정하지 않는다.
- 운영 결정 ID는 classification/run, review/run/revision, approval/run/action, policy/run/action, outcome/run에 기반한다. 조직 선택·검토·승인·정책·종료 사실을 projection하며 별도 LLM로 기술적 ADR/숨은 reasoning을 만들어내지 않는다. 이벤트 delivery 실패는 local 진단이지 성공/실패 판정을 바꾸는 입력이 아니다.

### 파일 export와 소유권

- `/state export`가 `.ai/decisions.md`(운영 결정 Markdown)와 `.ai/logs/checks.json`(check evidence)을 만든다. 자동 export는 아니며 실제 state.json이 있어야 한다. 원본 state나 approval/검증 조건은 바꾸지 않는다.
- export는 parent/run이 idle이고 모든 저장 run이 terminal일 때만 writer를 획득한다. `FileStateStore.open(..., {recoverInterrupted:false})` + `exportViews()`를 사용하며 이 모드는 interruption recovery와 tasks repair를 하지 않는다. 상태 조회/exports 때문에 이전 작업을 재개하거나 승인을 무효화하지 않는다.
- 파일에는 source revision/hash 및 생성 주체/body checksum이 있다. 동일 source를 다시 export하면 변경이 없다. marker가 없는 수동 파일, checksum이 깨진 생성 파일, symlink/hardlink/unsafe 경로는 덮어쓰지 않는다. 강제 덮어쓰기 옵션은 없다. 기존 수동 `.ai/decisions.md`는 그대로 유지되며 CLI 운영 결정 조회는 계속 사용할 수 있다.
- 소유한 lock 아래 temp/write/sync/rename을 파일별로 수행한다. 둘 전체의 transaction은 아니므로 실패 시 한 파일만 갱신될 수 있다. source는 유지되고 재export가 가능하며 export 실패를 과거 Run 실패/성공으로 재기록하지 않는다. export-only 작업 중에는 부모 mutation을 막고 shutdown이 정리를 기다린다.
- 관찰 파일은 실행/승인/완료/복구의 원본으로 읽지 않는다. checks.json에는 이미 state에 기록한 check 출력만 있고 transcript/tool history/전체 diff는 복제하지 않는다. 출력에 민감한 데이터가 있을 수 있으므로 자동으로 공개·commit하지 말아야 한다. checksum은 accidental edit 보호이지 악성 동일 사용자에 대한 인증 서명이 아니다.
- Git baseline은 `.ai/decisions.md`와 `.ai/logs/checks.json`의 **온전한 generated 내용만** 조건부 제외한다. generated 파일을 Git 추적하면 실행을 거부한다. 수동 파일·깨진 checksum은 일반 evidence 대상이며 Git ignored인 checks.json의 수동 변경도 검사한다. `.ai`나 `.ai/logs` 전체를 제외하지 않는다. `.gitignore`는 사용자가 직접 관리하며 Runtime이 자동 수정하지 않는다.
- 기존 OS sandbox/외부 TOCTOU/파일당 크기/단일 writer 한계를 유지한다. 큰 state/export는 파일당 16 MiB 한도이며 자동 archive/분할은 없다. technical decision authoring, 전체 이벤트 replay, 별도 TUI/DAG/Web/RPC/SQLite 시스템은 추가하지 않았다.

## S6 실패 경계

- AgentExecutor/Verifier의 `safeToRelease`는 promise 정산과 자원 종료 확인을 구분한다. 실제 Pi/파일 adapter는 worker·check·Git process가 살아 있거나 cleanup이 불확실하면 false를 제공한다. custom Port도 정산 전 cleanup을 보장하거나 미확인을 명시해야 한다.
- 저장 실패 시 Store는 쓰기만 닫고 lease를 유지한다. 정상 종료는 `cancel → SDK/process 종료 확인 → terminal state 저장 → close/unlock` 순서다. SDK abort/dispose나 process runner/그룹 cleanup 확인이 실패하면 다음 역할·COMPLETE를 막고 lock을 남긴다. 실패 중 state 저장 자체가 불가능하면 기존 PREPARED/active 기록이 남을 수 있다.
- cleanup 불확실 상태에서 추가 Git evidence process를 시작하지 않으며 변경 수집은 incomplete로 보고한다. 완료 commit 뒤에는 새 Git 수집을 하지 않고 COMPLETE 직전 확인한 snapshot을 보고한다. lock retained 오류가 있으면 다른 작업을 시작하지 말고 OS process와 owner를 수동 확인해야 한다. 자동 unlock/lock stealing은 없다.
- check settlement 전 취소는 PASS가 아니다. audit 결과 저장 실패를 두 번째 finish로 덮지 않는다. 이전 attempt의 session ID뿐 아니라 sessionFile 재사용도 거부한다.
- state/config/lock/worker descriptor는 no-follow/nonblocking + regular-file 검사를 사용해 FIFO open trap을 피한다. config의 symlink/비일반 파일·unsafe directory도 거부한다. Windows 실행은 writer 획득 전에 명시적으로 거부하며 Windows 지원을 추가하지 않았다.
- 완료 guard를 통과해 terminal save가 **시작되기 전** cancel은 수락한다. 이미 시작된 completion commit 뒤의 늦은 cancel은 이를 rollback하지 않는다. 저장 실패에서는 RunCompleted를 발행하지 않지만, 파일별 partial persistence로 durable source와 caller 결과가 다를 수 있다.
- 확인 범위는 관리하는 SDK 세션과 원래 POSIX process group이다. 탈출 daemon·악성 동일-process 코드·등록 프로그램 내부 I/O는 sandbox하지 않는다. 비협조 Provider/auth/event sink/파일 I/O는 종료를 오래 지연시킬 수 있으며 timeout을 절대 정리 기한으로 주장하지 않는다.
- DoD의 PASS/PARTIAL/UNSUPPORTED/NOT VERIFIED 및 실제 Provider/플랫폼 미검증은 [V0.1_READINESS](../../docs/V0.1_READINESS.md)를 따른다. S6 완료는 release 선언이 아니다.

## 검증

```sh
# packages/company-runtime에서
node ../../node_modules/vitest/dist/cli.js --run test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/agent-metadata.test.ts test/verification-boundary.test.ts test/quick.test.ts test/r2-review.test.ts test/approval.test.ts test/observations.test.ts test/observation-files.test.ts test/hardening.test.ts test/kernel-hardening.test.ts

# packages/coding-agent에서: 실제 SDK + suite harness/faux provider
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-agent.test.ts test/suite/company-runtime-workflow.test.ts test/suite/company-runtime-quick.test.ts test/suite/company-runtime-r2.test.ts test/suite/company-runtime-approval.test.ts test/suite/company-runtime-observations.test.ts test/suite/company-runtime-hardening.test.ts test/suite/company-runtime-timeout.test.ts test/suite/agent-session-prompt.test.ts

# 저장소 루트에서
npm run check
```

테스트는 임시 디렉터리와 설정 fixture를 사용한다. S0는 Pi public loader로 파일·패키지 진입점을 검사한다. S3는 실제 AgentSession을 실행하되 로컬 faux provider만 사용한다. 생성/수정 가능한 위치는 각 테스트가 만든 임시 디렉터리뿐이다.

Root workspace glob, TypeScript 및 Biome 설정은 이 패키지를 이미 포함한다. `test`/`clean` scripts를 제공하고 공개 배포는 하지 않는다. S0에는 Core 변경, 자동 `.pi`/`.ai` 설정 생성, Git 변경 명령, 세션 history 추가가 없다.

S1 테스트는 fake AgentExecutor/Verifier와 메모리 StateStore를 사용하므로 Pi AgentSession이나 실제 Provider 없이 실행된다. `host-boundary.test.ts`가 Kernel과 Policy import graph에 Pi/Host I/O 의존성이 없는지도 검사한다. S2는 임시 파일 시스템, 실제 lock 경합, 저장 장애 주입과 fake executor로 검증한다. S4는 임시 Git fixture·등록 Node check·faux 세션으로 전체 성공/실패/lifecycle을 검증한다. S5A는 같은 테스트 기반에서 QUICK을 검증한다. S5B는 bound R2 실행·독립 리뷰와 회귀를 추가 검증한다. S5C는 exact/expired/denied/replayed approval과 실제 단일 삭제·리뷰·취소를 추가 검증한다. S5D는 읽기 전용 조회/명시적 export와 configured revision을 검증한다. S6는 실패/경합/crash/lifecycle과 기존 Pi 회귀를 보강했다. 후속 실제 GPT RC-01~08은 [validation](../../docs/GPT_RC_VALIDATION_2026-09-16.md)에 기록된 범위에서 PASS다. DeepSeek·추가 플랫폼은 NOT VERIFIED다. 상세 판정은 [readiness](../../docs/V0.1_READINESS.md)에 기록한다.
