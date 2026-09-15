# Company Runtime — S0~S4

Host 독립 Kernel, StateStore·Policy, 독립 Pi SDK 역할에 실제 Git evidence·등록 check·명령/lifecycle을 연결했다. **첫 STANDARD/R0~R1 Vertical Slice**를 지원한다. QUICK/COMPLEX/R2/R3 실행, 자동 resume/rollback/commit, 병렬 조직과 전체 V0.1은 지원하지 않는다.

## 로딩

저장소 루트에서 설치된 Pi에 명시적으로 로드한다.

```sh
pi -e ./packages/company-runtime/src/extension.ts
# package.json의 pi.extensions 진입점을 사용하는 경우
pi -e ./packages/company-runtime
```

소스 TypeScript를 Pi가 로드하므로 이 패키지의 별도 build는 없다. 자동 로딩 설정은 추가하지 않는다. 체크아웃 개발 환경은 root `npm install --ignore-scripts`를 사용한다. 모델 데이터가 없는 체크아웃에서 Pi 소스 로딩 테스트를 하려면 `npm run hydrate:model-data`도 필요하다. 이 명령은 공개 모델 카탈로그를 가져오며 추론 요청을 보내지 않는다.

명령은 알림을 지원하는 TUI/RPC에서 출력한다. Print/JSON에서는 명시적 오류를 반환한다. 전체 Runtime의 RPC 실행 지원을 뜻하지 않는다.

| 명령 | 동작 |
|---|---|
| `/workflow run <goal>` | 신뢰 확인 후 비동기 preflight·STANDARD 실행 시작 |
| `/workflow`, `/workflow status` | 현재 또는 마지막 저장 run의 goal/status/phase/risk/review/check/변경 요약 |
| `/workflow cancel` | 취소 요청 후 worker/check 정리와 종료 보고를 기다림; rollback 없음 |
| `/state`, `/team`, `/risk` | 같은 Kernel 상태의 최소 요약; 별도 TUI나 조직 화면 없음 |

Factory는 네 명령과 lifecycle/input 보호 훅만 등록하고 startup I/O·Agent 실행은 하지 않는다. 명령 시 project trust와 `.ai/config.yaml`을 검사한다. run은 부모 Agent가 idle일 때만 시작하며 등록된 check 실행을 UI에서 확인받는다. 활성 run 동안 일반 입력·부모 도구·user bash를 차단한다. 명령은 빠르게 반환하므로 status/cancel을 계속 사용할 수 있다. 설정 생성·자동 모델 대체·일반 대화의 조직 실행 변환은 없다.

## 설정 schema 1

아래는 **수동으로 작성할 예시**다. 모델 ID와 검증 script는 프로젝트에 맞게 교체하고 실행 내용을 검토한다. S4는 coding/reasoning 모델·인증을 모두 사전 검사한다.

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
- `agents`: 병렬 수는 현재 `1`만 허용. 재작업 횟수는 `0..3`, 기본 `1`. 최초 구현 이후 재작업 횟수를 의미한다.
- `review.enabled`, `state.enabled`: `true`만 허용. state 디렉터리는 `.ai`로 고정한다.
- `risk.approval_required`: 현재 `[R3]`만 허용. 프로젝트 설정으로 review·state·승인 요구를 끌 수 없다.
- `files.allowed_paths`: 기본 `[]`. 문자 그대로의 workspace 상대 파일/디렉터리 경로이며 glob이 아니다. S2 Policy와 경로 Adapter가 이 범위 및 보호 파일·symlink를 검사한다.
- `verification.checks`: 기본 `[]`. check마다 `id`, `kind`, `executable`, 문자열 배열 `args`가 필수다. `kind`는 `build`/`lint`/`test`/`typecheck`/`format`/`custom`이다. 선택 필드는 `cwd`(기본 `.`), `timeout_ms`(기본 `60000`, 범위 `1..3600000`), `required`(기본 `true`)다. ID 중복을 거부한다.

파일/cwd 경로에는 절대 경로, `..`, Windows 드라이브/역슬래시, glob, 제어 문자를 허용하지 않는다. executable은 명시적 PATH에서 해석한 절대 경로로 고정한다. 설정 파싱 자체가 경로·프로그램의 안전성을 증명하지 않는다. **check 등록과 실행 확인은 신뢰한 코드에 대한 허가이지 OS sandbox가 아니다.** S4는 필수 check 한 개 이상과 재작업 한도 0 또는 1을 요구한다.

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
- `start()`: STANDARD 순차 실행 상태로 진입한다. QUICK/COMPLEX/R3 실행은 BLOCKED로 남긴다.
- `advance(expectedStep, signal?)`: 현재 단계 하나만 수행한다. 순서를 건너뛰거나 중복·동시 호출하면 거부한다. 실제 작업은 주입한 Port가 담당하며 S1 테스트에서는 fake뿐이다.
- `snapshot`: 외부에서 수정해도 Kernel에 영향을 주지 않는 상태 사본이다.
- `stop(CANCELLED | INTERRUPTED, reason)`: 단계 사이에서 중단한다. 진행 중 작업은 `advance`의 AbortSignal을 Port에 전달하고 반환 후 다시 검사한다. Port가 취소에 협조하지 않으면 반환까지 기다린다. 프로세스 강제 종료·자동 resume는 구현하지 않았다.

STANDARD Step ID는 `implement → self-check → review → test → complete`다. 재작업에도 ID는 유지하고 `attempt`를 증가시킨다. `(runId, stepId, attempt)`로 단계를 식별한다. Run의 `currentStep`이 이 식별자를 사용한다. `revisionCycle`과 handoff/review/check의 `revision`은 코드 재작업 횟수이며, Run의 `revision`은 상태 저장마다 증가하는 별도 번호다.

AgentExecutor에는 역할·profile·task·handoff·증거를, Verifier에는 check의 ID/kind/required 계약을 전달한다. 실제 모델·workspace·명령은 Host가 구성할 Adapter의 책임이다. StateStore의 `load/save` 계약은 S1 그대로이며 S2의 FileStateStore로 구현했다. R2 테스트는 Reviewer 규칙을 검증하는 것이며, 초기 실제 실행에서 R2/R3를 차단할 S2 정책을 대체하지 않는다. ApprovalPort와 승인 이벤트는 계약만 있고, 주입해도 S1의 R3 차단을 해제하지 않는다.

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

저장은 같은 디렉터리의 무작위 temp 생성 → write → file sync → close → rename 순서다. state를 먼저 교체하고 tasks를 교체한다. `StateStoreError.stage/stateCommitted/cleanupFailed`로 부분 저장과 정리 실패를 구분한다. 어떤 저장 오류든 해당 인스턴스의 추가 변경을 차단하고 소유 lock 정리를 시도한다. 성공 상태의 state 교체 뒤 tasks 저장이 실패해도 호출 결과는 실패다. 디렉터리 fsync에 의한 전원 장애 내구성이나 여러 파일의 transaction은 보장하지 않는다. 파일당 16 MiB를 넘으면 거부하며 자동 보관·분할은 없다.

다음 소유자가 열면 CREATED/RUNNING/WAITING_APPROVAL은 INTERRUPTED로 바꾸고 activeAgents/next를 비운다. PREPARED action도 실행 여부를 추정하지 않고 INTERRUPTED로 남긴다. 저장 후 기존 `RunInterrupted` 이벤트를 발행하며 sink 실패는 `deliveryFailures`에만 기록한다. 기존 Step ID/attempt는 유지한다. 자동 resume/retry, 승인·PASS 재사용, 이벤트 재생은 없다. crash가 남긴 lock은 소유 프로세스 종료를 사용자가 확인하고 수동으로 정리해야 한다. 불명확하면 열지 않는다.

### Policy와 경로 Adapter

`policy.ts`는 파일 I/O·Pi·UI 없는 `evaluatePolicy`와 작은 실행 gate를 제공한다. `policy-paths.ts`의 `FilePolicyPathInspector`만 파일 시스템을 조회한다. Kernel은 두 Adapter를 import하지 않는다.

| 결과 | S2 동작 |
|---|---|
| ALLOW | 등록된 read/search 또는 일반 write/edit, R0/R1, 역할·허용 범위·경로 검사를 모두 통과해야 실행 |
| DENY | UNKNOWN, 미등록 도구, 임의 shell/exec, 보호·허용 범위 밖 경로, 검사 불가 등 미실행 |
| REVIEW_REQUIRED | R2 미실행; dependency 파일 mutation은 최소 R2로 승격 |
| APPROVAL_REQUIRED | R3 미실행; 승인 토큰이나 UI는 구현하지 않음 |

PolicyDecision의 기존 S0 예약 이름 REQUIRE_REVIEW/REQUIRE_APPROVAL을 위 이름으로 확정했고, action risk에 UNKNOWN을 추가했다. Run/분류 risk R0~R3 계약은 변경하지 않았다.

- Worker가 아닌 신뢰한 Adapter가 도구의 실제 operation, 역할, action risk 하한, 전체 입력의 action digest, 고정 정책/config digest를 구성해야 한다. 등록 이름만으로 도구 구현의 안전성을 증명하지 않는다.
- Reviewer/Lead는 write/edit 불가다. 허용 경로 기본값은 비어 있다. literal 상대 경로만 받아 절대 경로·`..`·역슬래시·glob·제어 문자를 거부한다.
- `.git`, `.ai`, `.pi`, 알려진 credential/secret 이름과 확장자, policy/config 파일을 읽기·쓰기 모두 보호한다. 추가 Runtime 소스·제어 파일은 신뢰한 Host가 `protectedPaths`로 지정한다. 임의 이름의 비밀 내용을 자동 판별하는 기능은 없다.
- 모든 경로 구성요소를 lstat 검사한다. workspace 안쪽 symlink까지 전부, dangling symlink, 새 파일의 symlink 조상, hardlink 파일, 특수 파일을 거부한다. 루트의 정규 경로 변경도 거부한다.
- **검색도 검사된 구체 파일 목록만 지원**한다. 디렉터리를 허가받아 재귀 검색하는 것은 불가다. S3 검색 도구는 caller가 명시한 파일 목록을 검사하며 디렉터리 후보 탐색을 구현하지 않는다. 삭제·이동·구조 변경·검증 명령 실행은 이 gate에서 열지 않았다.
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

파일 도구는 모두 S2의 검사→intent 저장→재검사→실행→결과 저장을 통과한다. Worker가 role/risk/등록 도구/digest를 지정하지 않는다. Runtime 자신의 소스 디렉터리가 workspace 안에 있으면 자동 보호하고, 추가 제어 파일은 Host의 `protectedPaths`로 제한한다. read/search는 R0, 일반 write/edit는 R1에서 시작하며 dependency 파일은 S2가 R2로 승격·차단한다. 임의 코드를 분석해 모든 의미적 위험을 자동 판정하는 기능은 아니다.

- 일반 bash·Pi 기본 도구·외부 custom tool을 설치하지 않는다. 파일 도구는 sequential이며 SDK Agent도 sequential로 설정한다.
- 텍스트 파일은 256 KiB 이하, edit는 유일한 exact match, write는 기존 부모 디렉터리만 지원한다. 검색은 최대 32개 명시 파일의 literal 문자열 검색이며 100개 결과에서 잘림을 표시한다. OS sandbox·원자 코드 변경/rollback은 아니다.
- `runtime_request_check`는 등록 ID만 받아 Pi tool history에 요청을 남기고 **UNAVAILABLE/미실행**을 반환한다. verifier를 호출하거나 PASS 증거를 만들지 않는다.
- Handoff/Review 제출은 자기 역할의 전용 schema만 받는다. run/task/role/code revision 및 Review diffDigest를 검사한다. 자연어 완료, 누락·오류 결과, 다른 도구와 섞인 제출 batch는 실패다. 제출 도구는 `terminate`로 종료하며 이후 도구 실행을 막는다.
- Kernel의 기존 독립 Review·요구사항·증거·완료 guard는 유지한다. Adapter의 schema 통과는 COMPLETE 승인이 아니다.

Reviewer는 `VerificationResult.reviewContext`의 명시적 `{diff, evidence:[{ref,content}]}`를 요구한다. 모든 evidence reference와 실제 자료가 대응해야 한다. 이 선택 필드는 S1 fake 검증 계약을 유지하기 위한 최소 확장이며, 실제 Pi Reviewer에서는 누락을 거부한다. S3 테스트는 고정 fixture를, S4는 실제 Git/파일 snapshot과 등록 check 결과를 전달한다. Developer reasoning이나 세션 history는 전달하지 않는다.

### Resource와 모델

- DefaultResourceLoader를 생성하거나 reload하지 않는다. 명시적 ResourceLoader가 Extensions/Skills/Prompt templates/AGENTS/Themes/append prompt를 빈 값으로 반환한다. `noExtensions` 하나에 의존하지 않는다.
- system prompt는 역할 규칙과 선택적인 `projectInstructions` 문자열뿐이다. AGENTS.md는 자동 사용하지 않는다. Host가 검토한 규칙을 이 문자열로 전달할 수 있으며 정책 권한을 낮추지 못한다.
- Settings는 역할별 in-memory이고 자동 compaction·agent retry·provider retry·skill command를 끈다. 프로젝트/전역 Settings 파일은 로드하지 않는다.
- 생성 시 coding/reasoning 모두 `config mapping → ModelRuntime.getProvider/getModel → checkAuth/getAuth`를 확인한다. 실행 직전 선택 profile/auth를 다시 확인하고 명시한 model을 SDK에 전달한다. 누락·설정 오류·인증 실패는 시작 전 오류이며 fallback을 허용하지 않는다.
- 주입된 ModelRuntime의 기존 Pi 인증·Provider 범위를 사용한다. 부모의 동적 등록/메모리 인증을 자동 공유하지 않는다. 공유가 필요하면 Host가 검토한 Runtime을 명시적으로 주입하고 실행 중 변경하지 않아야 한다. 사전 auth 해석 성공은 원격 서비스 가용성 보장이 아니다. OAuth 갱신 등이 필요한 실환경 auth는 네트워크를 사용할 수 있으나 테스트는 faux만 사용한다.

### 취소와 이벤트

기본 실행 제한은 60초·32 turns다. `timeoutMs`(1~3,600,000), `maxTurns`(1~128)로 제한할 수 있다. Kernel의 AbortSignal과 timeout을 결합하고 tool gate·실제 파일 실행·Provider stream 시작 지점에서 검사한다. SDK prompt preflight에서 취소되어도 스트림 시작 guard가 Provider 호출을 막는다. 취소/실패한 run ID는 해당 Adapter에서 다음 역할을 실행하지 않는다.

`finally`에서 abort/idle을 기다린 후 unsubscribe/dispose한다. 늦은 결과와 cleanup 중 취소도 성공으로 반환하지 않는다. 협조하지 않는 Provider/인증/파일 시스템 I/O를 강제로 종료하는 OS 격리는 없다. timeout은 취소 요청 시점이며 비협조 I/O의 정리 완료 시간까지 보장하지 않는다. Host는 worker 정리 후 StateStore lock을 해제해야 한다.

이벤트 발행자는 계속 Kernel 하나다. 기존 AgentStarted는 Adapter 호출 시작, 새 **AgentSessionCreated**는 세션 참조 저장 성공, AgentCompleted/Failed는 호출 결과를 의미한다. 새 이벤트에는 step/role/profile/code revision/sessionRef가 있으며 Completed/Failed에도 가능한 sessionRef를 포함한다. 기존 sequence/stateRevision/저장 후 발행 규칙을 유지한다. 토큰 스트림·reasoning·전체 대화를 RuntimeEvent로 복제하지 않는다. 직접 Adapter만 호출하는 Host는 콜백 저장을 구현해야 하며 별도 이벤트 버스는 없다.

S3의 단일 역할 검증에 이어 S4는 아래 전체 순차 흐름을 연결했다. R3 승인 UI·DAG·병렬화는 추가하지 않았다.

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
- 정확히 `.ai/state.json`, `.ai/tasks.json`, `.ai/writer.lock`만 제외하며 이 세 파일의 Git 추적은 거부한다. `.ai/config.yaml`과 그 밖의 `.ai` 파일 변경은 숨기지 않는다. 사용자가 `.gitignore`를 직접 관리해야 한다.
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

## 검증

```sh
# packages/company-runtime에서
node ../../node_modules/vitest/dist/cli.js --run test/contracts.test.ts test/config.test.ts test/extension.test.ts test/classification.test.ts test/kernel.test.ts test/host-boundary.test.ts test/state-store.test.ts test/policy.test.ts test/agent-metadata.test.ts test/verification-boundary.test.ts

# packages/coding-agent에서: 실제 SDK + suite harness/faux provider
node ../../node_modules/vitest/dist/cli.js --run test/suite/company-runtime-agent.test.ts test/suite/company-runtime-workflow.test.ts test/suite/agent-session-prompt.test.ts

# 저장소 루트에서
npm run check
```

테스트는 임시 디렉터리와 설정 fixture를 사용한다. S0는 Pi public loader로 파일·패키지 진입점을 검사한다. S3는 실제 AgentSession을 실행하되 로컬 faux provider만 사용한다. 생성/수정 가능한 위치는 각 테스트가 만든 임시 디렉터리뿐이다.

Root workspace glob, TypeScript 및 Biome 설정은 이 패키지를 이미 포함한다. `test`/`clean` scripts를 제공하고 공개 배포는 하지 않는다. S0에는 Core 변경, 자동 `.pi`/`.ai` 설정 생성, Git 변경 명령, 세션 history 추가가 없다.

S1 테스트는 fake AgentExecutor/Verifier와 메모리 StateStore를 사용하므로 Pi AgentSession이나 실제 Provider 없이 실행된다. `host-boundary.test.ts`가 Kernel과 Policy import graph에 Pi/Host I/O 의존성이 없는지도 검사한다. S2는 임시 파일 시스템, 실제 lock 경합, 저장 장애 주입과 fake executor로 검증한다. S4는 임시 Git fixture·등록 Node check·faux 세션으로 전체 성공/실패/lifecycle을 검증한다. 다음 단계는 [구현 계획의 S5](../../docs/IMPLEMENTATION_PLAN.md)이며 첫 Slice 완료는 전체 V0.1 완료가 아니다.
