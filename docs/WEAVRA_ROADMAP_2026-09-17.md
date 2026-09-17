# Weavra Roadmap — Post V0.3B

> 작성일: 2026-09-17 (KST)  
> 대상 브랜치: `devlop`  
> 기준 소스: `a3eae0c86b8ea19d2bb9173c66cf2ebc001b4e10`  
> 기준 상태: V0.3B Read-only LSP Diagnostics / Navigation 구현·자동 회귀·실제 TS/Provider smoke 완료  
> 안정 기준점: `weavra-v0.1-rc1` — 이동/수정하지 않음

이 문서는 V0.3B 이후의 **실행 순서와 완료 기준을 고정하기 위한 개발 로드맵**이다.

기존 `MASTER_SPEC`, `ARCHITECTURE`, `DECISIONS`, `IMPLEMENTATION_PLAN`, `WORK_LOG`를 대체하지 않는다. 세부 설계의 근거는 다음 문서를 함께 따른다.

- `docs/WEAVRA_IMPROVEMENT_AND_FEATURE_RESEARCH_2026-09-17.md`
- `docs/WEAVRA_OMP_OMO_ADOPTION_PLAN.md`
- `docs/WORK_LOG.md`
- `docs/V0.1_READINESS.md`

로드맵의 버전명은 개발 단계 표기이며 정식 release/tag 선언이 아니다.

---

## 1. 현재 기준선

V0.3B까지 다음 기반을 확보했다.

```text
V0.1 Runtime / GPT RC
  ↓
Branding / fork-local launcher / Status
  ↓
Worktree create / open / list
  ↓
V0.2A Read-only DAG Projection
  ↓
V0.2B Read-only TUI DAG Viewer
  ↓
V0.2C Product Isolation / setup / doctor
  ↓
V0.3A Hash-Anchored Edit
  ↓
V0.3B Read-only LSP Diagnostics / Navigation
```

현재 강점은 에이전트 수가 아니라 다음 경계다.

- Kernel이 workflow 전이와 완료를 결정한다.
- Developer/Executor와 Reviewer 권한을 분리한다.
- Policy, 독립 Review, Human Approval을 같은 의미로 취급하지 않는다.
- required process check와 advisory evidence를 구분한다.
- mutation 전 anchored freshness와 완료 전 stale evidence guard를 함께 사용한다.
- `.ai` Runtime state와 `~/.weavra/agent` user-level 상태를 분리한다.
- 자동 commit/merge/stash/reset/rollback/resume을 하지 않는다.

V0.3B 시점 자동 targeted regression은 `47 files / 1,565 PASS`이며, 실제 TypeScript LSP query와 `codex-lb / gpt-6-astra` STANDARD/R1 smoke를 별도로 확인했다. 이 수치는 해당 기준점의 기록이며 이후 HEAD에 자동 승계하지 않는다.

---

## 2. 로드맵 원칙

이후 개발은 세 축으로 관리한다.

```text
                    Weavra

     ┌──────────── Safety ────────────┐
     │ execution contract            │
     │ Policy / Approval             │
     │ anchored / strict mutation    │
     │ verifier trust / sandbox      │
     └────────────────────────────────┘

     ┌───────── Intelligence ─────────┐
     │ project instructions          │
     │ file discovery / repo context │
     │ LSP                           │
     │ acceptance criteria           │
     └────────────────────────────────┘

     ┌──────── Measurement ───────────┐
     │ telemetry / budget            │
     │ evals                         │
     │ evidence pack                 │
     │ provenance                    │
     └────────────────────────────────┘
```

우선순위 원칙:

1. **권한을 먼저 고정하고 기능을 늘린다.**
2. **프로젝트 맥락과 완료 조건을 명확히 한 뒤 agent 수를 늘린다.**
3. **새 기능의 효과를 eval/usage로 측정할 수 있어야 한다.**
4. **read-only evidence를 execution authority로 승격하지 않는다.**
5. **외부 프로그램을 사용한다고 sandboxed라고 표현하지 않는다.**
6. **COMPLEX/Parallel은 마지막 단계까지 보류한다.**

---

## 3. 권장 단계 요약

| 단계 | 목표 | 연구 문서 매핑 | 우선순위 |
|---|---|---|---|
| **V0.3C — Trust Baseline** | 설치·CI·실행 권한 계약 고정 | FIX-01, FIX-02, FIX-04 | 즉시 |
| **V0.3D — Project Context** | 프로젝트 규칙·파일 탐색·JVM risk 보강 | FIX-03, FIX-06, FEAT-02 일부 | 높음 |
| **V0.3E — Task Contract** | 복합 요청을 검증 가능한 AC로 고정 | FIX-05, FEAT-01 | 높음 |
| **V0.3F — Measurement & Evidence** | 실제 품질·비용·실패를 측정/설명 | FEAT-03, FEAT-04, FEAT-05, FIX-09 | 높음 |
| **V0.4A — Mutation Hardening** | anchored protection을 strict mutation으로 확장 | FIX-07 | 후속 |
| **V0.4B — Verifier Trust** | 검증 기준/entrypoint의 신뢰성 강화 | FIX-08 | 후속 |
| **V0.4C — Verifier Sandbox** | 검증 프로세스 OS 경계 도입 | FEAT-07 | 후속 |
| **Later** | Facts / Browser QA / Capability Broker / COMPLEX | FEAT-06, 08, 09, Team Mode | 수요 기반 |

---

# 4. V0.3C — Trust Baseline

## 목표

사용자 요청 해석과 실제 실행 권한을 분리하고, `devlop`의 설치/회귀 검증 경계를 개발 기본값으로 만든다.

### 포함 범위

#### FIX-01 — 개발판 설치 기준 명시

개발판 설치 문서는 `devlop`을 명시한다.

```sh
git clone --branch devlop --single-branch https://github.com/kjg8619/pi.git weavra
```

문서에서 다음 관계를 분명히 한다.

```text
main                 upstream/base Pi 계열

devlop               current Weavra development

weavra-v0.1-rc1      immutable historical RC baseline
```

checkout/source 변경 후 fork-local Pi rebuild가 필요하다는 기존 계약을 유지한다.

#### FIX-02 — devlop CI + non-mutating check

현재 `main` 중심 CI에서 `devlop` 핵심 회귀가 자동 실행되도록 보강한다.

CI에서는 코드 수정형 검사와 검증을 분리한다.

예시 목표:

```text
npm run check          local developer format/fix 포함 가능
npm run check:ci       tracked source를 수정하지 않는 CI gate
```

`check:ci`는 적어도 다음을 포함한다.

- Biome non-write 검사
- TypeScript/type import/entry graph 검사
- shrinkwrap/install-lock 검사
- Weavra Runtime targeted tests
- coding-agent Weavra integration tests
- launcher shell syntax
- 종료 후 tracked diff 0 확인

실제 Provider 호출은 일반 CI에 넣지 않는다.

#### FIX-04 — Execution Contract

기존 분류:

```text
intent
complexity
risk
```

와 별도로 실행 권한 계약을 둔다.

최소 후보:

```ts
type ExecutionMode = "READ_ONLY" | "EDIT";
```

READ_ONLY는 두 겹으로 강제한다.

```text
READ_ONLY
   ├─ Worker mutation tool 미노출
   └─ Policy mutation DENY
```

자연어 분류기나 모델은 execution mode를 제안할 수 있으나 권한 원본이 될 수 없다.

### 대표 부정 테스트

- `오류 원인을 설명해줘`
- `삭제하지 말고 삭제 로직을 설명해줘`
- 위험 단어를 인용한 설명 요청
- QUICK/R0 direct mutation call
- STANDARD/R0 direct mutation call
- Korean/English negation
- 공백/한글 경로 + 문장부호

READ_ONLY에서는 `write/edit/delete`가 실제 mutation 전에 거부되어야 한다.

### DoD

- `devlop` 개발판 설치 절차가 재현된다.
- `devlop` push/PR에서 핵심 CI가 실행된다.
- CI 검증 후 tracked diff가 없다.
- READ_ONLY는 QUICK/STANDARD 양쪽에서 mutation tool 미노출 + Policy DENY를 만족한다.
- R2/R3 minimum risk/approval 의미가 약화되지 않는다.
- 기존 V0.3A/V0.3B regression을 유지한다.
- `weavra-v0.1-rc1`은 불변이다.

---

# 5. V0.3D — Project Context

## 목표

Agent가 프로젝트의 명시적 규칙과 관련 파일을 더 정확하게 찾도록 하되 자동 resource discovery로 권한 경계를 넓히지 않는다.

### FIX-03 — Project Instructions Snapshot

기존 `projectInstructions` seam을 실제 Host composition에 연결한다.

초기 범위는 사용자가 명시한 파일 하나다.

```yaml
project:
  instructions: AGENTS.md
```

Run 시작 시 다음을 고정한다.

```text
path
bytes/content digest
size
selected-at-run-start
```

Developer와 Reviewer는 동일 instruction snapshot을 받는다.

금지:

- 자동 AGENTS/SYSTEM/Skill/Extension 전체 탐색
- instruction 내용으로 Policy 완화
- stale instruction을 현재 규칙으로 재사용

### FEAT-02 일부 — runtime_list_files

현재 `runtime_search`는 이미 파일 목록을 알아야 한다. 따라서 bounded read-only discovery를 추가한다.

후보:

```text
runtime_list_files
```

경계:

- allowed paths 내부
- protected path 제외
- symlink traversal 금지
- result count/depth/bytes 제한
- deterministic ordering
- shell/find 호출 없음

V0.3B LSP와 조합한다.

```text
list files
   ↓
read/search
   ↓
LSP definition/references/symbols
```

Repo-wide semantic index/vector DB는 아직 만들지 않는다.

### FIX-06 — JVM dependency/build risk

우선 다음 계열을 dependency/build 변경으로 다룬다.

```text
pom.xml
build.gradle
build.gradle.kts
settings.gradle
settings.gradle.kts
gradle.properties
gradle/libs.versions.toml
gradle/wrapper/*
```

R1 run이 R2 최소 위험 파일을 만나면 현재 run을 자동 승격하지 않고 새 적절한 run을 요구한다.

### DoD

- selected instruction이 Developer/Reviewer에 동일하게 전달된다.
- instruction 변경은 다음 Run에서 새 snapshot을 사용한다.
- `runtime_list_files`가 protected/outside/symlink 결과를 노출하지 않는다.
- Java/Spring/Gradle/Maven fixture에서 dependency risk가 정확히 동작한다.
- LSP와 file discovery가 mutation authority를 갖지 않는다.

---

# 6. V0.3E — Task Contract

## 목표

`requirements: [goal]` 한 항목으로 처리하던 복합 요청을 검증 가능한 Acceptance Criteria로 분해한다.

### FIX-05 — Acceptance Criteria

후보 모델:

```text
Task
  ├─ AC-001
  │   ├─ statement
  │   ├─ verification method
  │   └─ scope
  ├─ AC-002
  └─ ...
```

완료 시:

```text
AC ID
→ MET / UNMET / UNVERIFIED
→ evidenceRef
→ revision / diffDigest
```

를 연결한다.

Developer/Reviewer가 AC 목록을 실행 중 임의로 축소/교체하지 못하게 한다.

### FEAT-01 — Plan Preview

초기 버전은 별도 Planner agent 없이 Host 구조화 preview로 시작한다.

```text
User goal
   ↓
Host interpretation
   ↓
ExecutionMode / Risk / Scope
   ↓
Acceptance Criteria
   ↓
planned checks / roles
   ↓
user confirmation if required
   ↓
frozen Task Contract
```

Plan 확인은 R3 Human Approval과 별개다.

### DoD

- AC 하나만 미충족인 fixture가 COMPLETED되지 않는다.
- duplicate/missing/unknown AC evidence를 거부한다.
- 과거 revision의 stale evidence 재사용을 거부한다.
- 독립 acceptance oracle을 구현 agent가 변경하지 못한다.
- 작은 QUICK 작업에 불필요한 Planner model call을 강제하지 않는다.

---

# 7. V0.3F — Measurement & Evidence

## 목표

"Weavra가 실제로 더 나은가?"를 성공/비용/지연/실패 기준으로 측정할 수 있게 한다.

새 observability framework를 만드는 대신 기존 repository 자산을 우선 재사용한다.

```text
packages/evals
packages/telemetry
```

### FEAT-03 — Usage / Budget

관측 후보:

- provider/model/thinking
- role/attempt/revision
- input/output/cache/reasoning usage
- latency
- tool call count
- result/status

누락된 usage는 `0`이 아니라 `UNKNOWN`이다.

BudgetController는 telemetry exporter와 분리한다.

### FEAT-04 — Weavra Eval Adapter

동일 fixture에서 다음을 비교한다.

```text
Plain Pi
Weavra QUICK
Weavra STANDARD
```

동일 조건을 기록한다.

```text
baseline commit
provider/model/thinking
checks
feature flags
budget
```

초기 내부 eval set은 약 20개 fixture부터 시작할 수 있다.

### FEAT-05 — Evidence Pack

기존 state의 파생 projection으로 다음을 묶는다.

```text
goal / AC results
changed files / diff digest
process checks
LSP evidence
Reviewer result
approval consumption
partial changes / cleanup
usage / latency
known limitations
```

Evidence Pack은 새로운 execution authority가 아니다.

### FIX-09 — Provenance

관측 가능한 범위에서 다음을 표시한다.

```text
Runtime source commit
fork-local CLI build provenance
config digest
worker provider/model/thinking
```

알 수 없으면 `UNKNOWN`으로 표시한다.

### DoD

- Pi/QUICK/STANDARD 비교를 동일 fixture에서 재현할 수 있다.
- false completion을 독립 oracle로 측정할 수 있다.
- token/latency가 중복 합산되지 않는다.
- telemetry 실패가 무제한 budget을 허용하지 않는다.
- 공개 evidence에 credential/전체 reasoning/raw secret env를 넣지 않는다.

---

# 8. V0.4A — Mutation Hardening

## 목표

V0.3A의 optional anchored edit를 기존 파일 mutation의 opt-in strict contract로 확장한다.

### FIX-07

strict mode 후보:

```text
existing file edit
→ latest read receipt / digest required

new file
→ must-not-exist precondition

replace
→ explicit replacement contract
```

strict mode에서는 `runtime_write`로 stale guard를 우회할 수 없어야 한다.

호환 모드는 당장 제거하지 않는다.

### 추가 실제 smoke

V0.3A에서 남긴 미검증 항목을 확인한다.

```text
anchored read
→ external change
→ STALE
→ actual Provider re-read
→ new anchor
→ successful bounded edit
```

---

# 9. V0.4B — Verifier Trust

## 목표

검증 프로그램이 존재한다는 사실과 검증 기준 자체가 신뢰 가능하다는 사실을 구분한다.

### FIX-08

고정 후보:

```text
entrypoint
argv
cwd
config/source digest
Host-owned acceptance test
```

구현 agent가 완료 기준 테스트나 verifier entrypoint를 바꿔 거짓 PASS를 만드는 부정 fixture를 둔다.

등록 check를 shell-free라고 해서 sandboxed라고 표현하지 않는다.

---

# 10. V0.4C — Verifier Sandbox

## 목표

등록된 검증 프로그램의 파일/네트워크/process 접근을 OS 수준에서 제한한다.

초기 sandbox 대상은 Worker가 아니라 **Verifier**다.

후보 조사:

- existing Pi sandbox examples
- Anthropic sandbox-runtime 계열
- POSIX/macOS/Linux 지원 차이

필수 원칙:

- sandbox unavailable 시 silent host fallback 금지
- host auth 비노출
- network default deny 후보
- child process cleanup 확인
- sandbox가 Policy/Approval을 대체하지 않음

---

# 11. 이후 선택 단계

## Project Facts

자동 장기기억이나 vector DB보다 검토된 작은 Facts Pack부터 시작한다.

```text
statement
source ref
related digest
reviewedAt
valid / stale
```

Facts는 Policy나 이전 PASS를 대체하지 않는다.

## Browser QA

자유 브라우저 agent보다 등록된 Playwright QA와 evidence 생성부터 검토한다.

Verifier trust/sandbox가 선행 조건이다.

## Capability Broker / MCP

도구 수가 실제로 증가해 discovery가 필요할 때 도입한다.

MCP annotation(`readOnlyHint` 등)은 권한 보증으로 사용하지 않는다.

## COMPLEX / Parallel Agents

다음 조건이 갖춰진 이후에만 본격 진행한다.

```text
Execution Contract
Acceptance Criteria
Budget
Eval baseline
Task/file ownership
Integration verification
```

그 전에는 현재 순차 QUICK/STANDARD를 유지한다.

---

## 12. 단계 의존 관계

```text
V0.3B Read-only LSP  ✅
        │
        ▼
V0.3C Trust Baseline
        │
        ▼
V0.3D Project Context
        │
        ▼
V0.3E Task Contract
        │
        ▼
V0.3F Measurement & Evidence
        │
        ├──────────────┐
        ▼              ▼
V0.4A Strict Edit   eval baseline
        │
        ▼
V0.4B Verifier Trust
        │
        ▼
V0.4C Verifier Sandbox
        │
        ▼
Facts / Browser / MCP / COMPLEX
```

이 순서는 절대적 기능 의존성이라기보다 **안전성·측정 가능성·실사용 효과를 우선하는 개발 순서**다. 실제 측정 결과에 따라 후속 단계는 조정할 수 있다.

---

## 13. 공통 완료 규칙

모든 단계에서 다음을 유지한다.

- 시작 시 실제 `devlop` HEAD 기록
- 관련 regression을 현재 HEAD에서 재실행
- 수행하지 않은 Provider/build/platform 검증을 PASS라고 기록하지 않음
- Runtime source와 build source를 구분
- real Provider와 faux/mock 결과를 구분
- cleanup 불확실 시 성공을 과장하지 않음
- evidence를 run/revision/attempt/digest에 연결
- secret/raw reasoning/credential을 WORK_LOG 및 evidence에 저장하지 않음
- 일반 push 사용, force push 지양
- 안정 태그 `weavra-v0.1-rc1` 불변

기본 검증:

```sh
npm run check
git diff --check
bash -n packages/company-runtime/bin/weavra
```

CI 단계 도입 이후에는 non-mutating `check:ci`를 기본 자동 gate로 추가한다.

---

## 14. 즉시 다음 작업

다음 구현 단계는 **V0.3C — Trust Baseline**으로 고정한다.

범위:

```text
FIX-01  devlop 설치 기준 명확화
FIX-02  devlop CI + non-mutating check
FIX-04  READ_ONLY / EDIT Execution Contract
```

이번 단계에서는 다음을 함께 구현하지 않는다.

```text
Project Instructions
runtime_list_files
Acceptance Criteria / Planner
Telemetry / Evals
Strict Edit
Verifier Sandbox
MCP
COMPLEX / Parallel Agents
```

V0.3C가 완료된 뒤 실제 regression/evidence를 보고 V0.3D 착수를 결정한다.
