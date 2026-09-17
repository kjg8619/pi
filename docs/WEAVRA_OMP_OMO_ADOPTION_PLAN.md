# Weavra — OMP / OMO Native(Senpi) Adoption Plan

- 작성일: 2026-09-17 (KST)
- 대상: Weavra `devlop`
- 목적: OMP와 OMO Native(Senpi)에서 검증된 아이디어를 조사하고, Weavra의 현재 안전성·상태·검증 철학을 유지하면서 가져올 가치가 있는 기능을 우선순위화한다.
- 성격: **기능 도입 설계 후보 문서**. 이 문서에 적힌 항목은 구현 완료를 의미하지 않는다.
- 현재 Weavra 기준선: V0.1 Runtime/RC, fork-local launcher, worktree create/open/list, Status Projection, V0.2A read-only DAG Projection까지 완료된 상태를 기준으로 한다. V0.2B TUI DAG Viewer는 별도 작업 범위다.

> 핵심 원칙: OMP/OMO의 기능을 그대로 복제하지 않는다. Weavra가 이미 가진 `Kernel → Policy → Verification → Review/Approval → State` 경계를 유지하면서, 필요한 개념만 작은 Port/Adapter 또는 read-only projection으로 흡수한다.

---

## 1. 조사 대상

### OMP

- 저장소: https://github.com/YanwuZeng/omp
- Pi 계열의 coding-first harness로, hash-anchored edits, LSP, DAP, browser/web, subagents, Hindsight memory, hidden tool discovery 등을 제공한다.
- 특히 **편집 안정성**, **IDE 수준 code intelligence**, **도구 표면 확장**, **프로젝트 메모리** 측면에서 참고 가치가 높다.

### OMO / OmO Native(Senpi)

- 저장소: https://github.com/code-yeongyu/oh-my-openagent
- Senpi 저장소: https://github.com/code-yeongyu/senpi
- OMO는 OpenCode/Codex/standalone Native 변형을 갖고 있으며, Team Mode, category/model routing, skills, MCP, background agents, goal/todo continuation, setup/agent-dir 관리 등 orchestration과 product packaging 측면이 강하다.
- OMO Native 계열은 독립 agent directory와 setup/doctor 같은 **제품화 UX** 관점에서 특히 참고 가치가 높다.

### 조사 시점 주의

위 프로젝트들은 빠르게 변한다. 이 문서는 2026-09-17 시점 공개 문서/저장소의 개념을 기준으로 하며, 실제 코드 이식 전에는 최신 소스·라이선스·의존성·API를 다시 확인한다.

---

## 2. Weavra 현재 철학과 도입 기준

Weavra는 이미 다음 경계를 의도적으로 강하게 유지한다.

```text
User request
    ↓
Classification / Risk
    ↓
Kernel-owned Workflow
    ↓
Role-specific Agent Adapter
    ↓
Policy gate
    ↓
Mutation / Verification
    ↓
Independent Review / Human Approval
    ↓
Freshness / Completion guard
    ↓
Durable State + Read-only Observation
```

따라서 외부 기능을 평가할 때 다음 기준을 사용한다.

1. **Kernel authority를 우회하지 않는가?**
2. **새 mutation이 Policy/Approval을 건너뛰지 않는가?**
3. **검증 결과가 PASS처럼 과장되지 않는가?**
4. **stale state/evidence를 재사용하지 않는가?**
5. **Worker tool surface를 무제한으로 넓히지 않는가?**
6. **Pi Host/TUI와 Runtime core를 다시 강하게 결합하지 않는가?**
7. **실제 사용성이 늘어나는가, 단순 기능 수만 늘어나는가?**

---

## 3. 우선순위 요약

| 후보 | 적합도 | 권장 시점 | 도입 방식 |
|---|---:|---|---|
| Weavra 전용 setup / agent-dir 분리 | ★★★★★ | V0.2B 이후 | 제품/Host 레이어 |
| Hash-Anchored Edit | ★★★★★ | V0.3A | 제한 mutation primitive |
| LSP Diagnostics / Navigation | ★★★★★ | V0.3B | read-only Verification/Code Intelligence |
| QA Evidence / Doctor | ★★★★★ | V0.3C | 검증/제품 운영 레이어 |
| AST Edit Preview → Apply | ★★★★☆ | V0.4 전후 | R2 proposal + apply |
| Bounded Goal / Todo Continuation | ★★★★☆ | COMPLEX 전 | Kernel budget 내부 |
| Capability / Tool Discovery | ★★★★☆ | 도구 증가 후 | CapabilityBroker |
| Project Memory / Facts | ★★★☆☆ | 안정화 후 | 명시적 facts 우선 |
| Team Mode / Parallel Subagents | ★★★☆☆ 지금 / ★★★★★ 나중 | COMPLEX 단계 | DAG + worktree + typed handoff |
| Rules 자동 import | ★★☆☆☆ | 선택적 후순위 | explicit allowlist만 |
| DAP / Browser / persistent eval | ★★☆☆☆ 지금 | 장기 | governed adapter만 |
| Auto commit / merge / cleanup | ★☆☆☆☆ | 비권장 | 현재 철학과 충돌 |

---

# 4. 최우선 후보 1 — Weavra Setup / 전용 Agent Directory

## 참고점

OMO Native 계열은 하나의 canonical agent directory를 두고 setup/doctor/launcher가 모두 같은 위치를 바라보도록 관리한다. 이 방식은 업데이트 후 설정이 사라져 보이거나 서로 다른 entry point가 다른 설정을 읽는 문제를 줄이는 데 유용하다.

현재 Weavra는 실행 파일은 이미 분리됐다.

```text
pi      → 기존 Pi
weavra  → fork-local Pi + Weavra Runtime
```

하지만 기본 설정/인증/session은 아직 Pi 경로를 공유한다.

## 제안

장기적으로:

```text
~/.pi/
  ... 기존 Pi ...

~/.weavra/
  agent/
    settings.json
    auth.json
    models.json
    sessions/
```

형태를 검토한다.

명령 후보:

```bash
weavra setup
weavra doctor
```

`setup` 책임:

- 기존 Pi/환경의 사용 가능한 credential/model 설정을 **read-only 탐색**
- 사용자에게 import 여부 확인
- 기존 Weavra 값을 자동 overwrite하지 않음
- canonical Weavra agent dir 생성
- 실제 적용 경로 출력

`doctor` 책임:

- fork-local CLI build 존재
- Extension 경로
- agent-dir
- model/auth readiness
- Git version
- Node version
- optional LSP availability
- stale lock/unsafe project 상태는 진단만 하고 자동 수정하지 않음

## 도입 조건

- auth/session migration은 명시적 사용자 승인
- credential 원문을 WORK_LOG/evidence에 기록 금지
- 기존 Pi 설치를 수정하지 않음
- launcher가 여러 default 경로를 독자적으로 조합하지 않고 단일 helper 사용

## 평가

**V0.2B 이후 가장 먼저 해도 좋은 제품화 작업.** 기능 자체보다 Weavra를 독립된 개인 coding assistant로 만드는 의미가 크다.

---

# 5. 최우선 후보 2 — Hash-Anchored Edit

## 참고점

OMP는 hash-anchored edit 계열을 중심 기능으로 사용한다. 핵심 아이디어는 단순 문자열 치환보다 **읽었던 특정 line/content anchor의 최신성**을 검증하고, 그 anchor가 stale이면 mutation을 거부하는 것이다.

Weavra의 현재 stale 보호는 주로 다음 단계에 강하다.

```text
Developer result
    ↓
Diff digest
    ↓
Reviewer PASS
    ↓
Final verification
    ↓
Digest mismatch → BLOCK
```

여기에 mutation 직전 stale guard를 추가할 수 있다.

## 제안 구조

```text
read
  ↓
line/content anchor + hash
  ↓
AnchoredEdit request
  ↓
current file re-read
  ↓
anchor/hash verify
  ├─ match → Policy → mutation
  └─ stale → DENY / re-read required
```

Port 후보:

```ts
interface AnchoredEditPort {
  propose(...): AnchoredEditProposal;
  apply(proposal, currentEvidence): MutationResult;
}
```

## 적용 순서

1. QUICK/R1 단일 파일 small edit에만 적용
2. exact edit와 병행 비교
3. stale anchor / duplicate anchor / moved text / line ending 변화 테스트
4. 안정화 후 STANDARD Developer에 확대

## 안전 조건

- hash match 자체가 권한이 아니다. Policy는 계속 별도 적용
- anchor 자동 fuzzy 보정으로 다른 위치를 수정하지 않음
- mismatch 시 모델에게 재-read/re-propose 요구
- Reviewer/final digest guard는 그대로 유지

## 평가

**코딩 정확도와 Weavra 철학이 가장 잘 맞는 기능 중 하나.** 단순 편의 기능이 아니라 mutation integrity를 강화한다.

---

# 6. 최우선 후보 3 — LSP Diagnostics / Navigation

## 참고점

OMP는 LSP를 diagnostics/navigation/symbol/rename/code action까지 폭넓게 사용한다. OMO/Senpi 계열도 LSP를 coding harness capability로 활용한다.

Weavra에는 우선 **read-only LSP**가 적합하다.

## V1 범위

```text
LspPort
├─ diagnostics(file/workspace)
├─ definition(symbol/location)
├─ references(symbol/location)
└─ symbols(file/workspace)
```

### Verification 연계

```text
SELF_CHECK
├─ registered process checks
└─ LSP diagnostics snapshot

TEST
├─ registered test checks
└─ final LSP diagnostics snapshot
```

가능한 상태:

```text
PASS
FAIL
UNAVAILABLE
PARTIAL
STALE
```

`UNAVAILABLE`을 PASS로 취급하지 않는다.

## V1에서 제외

- rename
- codeAction apply
- formatter/autofix
- organize imports mutation

이 항목들은 실제 파일 변경이므로 이후 R2 mutation backend로 별도 설계한다.

## 추가 가치

Reviewer 입력에 다음을 evidence로 제공할 수 있다.

```text
changed files
actual diff
registered checks
LSP diagnostics delta
```

예: 변경 전 error 2개 → 변경 후 0개.

## 평가

**Verification 신뢰도를 높이는 가장 직접적인 다음 단계.** Hash-Anchored Edit와 함께 V0.3 핵심 후보.

---

# 7. 최우선 후보 4 — QA Evidence / Doctor

## 참고점

OMO 개발 문화는 실제 harness QA와 evidence를 강하게 남기는 편이다. Weavra도 이미 개발 과정에서:

```text
unit/integration tests
→ npm run check
→ real TUI smoke
→ GPT RC
→ WORK_LOG
```

를 반복하고 있다.

이 과정을 제품 기능으로 정리할 가치가 있다.

## 제안

```bash
weavra qa
weavra doctor
```

Evidence 예:

```text
.ai/evidence/
  2026-09-17T103000/
    manifest.json
    environment.json
    checks.json
    git.json
    summary.md
```

포함 후보:

- Weavra source commit
- project HEAD
- OS / Node / Git
- workflow/risk
- check IDs
- exit code / duration
- state revision
- workspace digest
- graph digest
- final status

포함하지 않을 것:

- 전체 LLM reasoning/transcript
- API key/credential
- 환경변수 전체 dump
- 민감한 check stdout의 무검토 공개

## Evidence 소유권

`.ai/state.json`은 계속 Runtime source of truth이고, evidence bundle은 **파생 산출물**이다.

기존 `/state export` 철학처럼:

- source state를 변경하지 않음
- generated marker/checksum
- 사용자 수정 파일 overwrite 금지
- 전체 transaction이라고 과장하지 않음

## 평가

Weavra 개발/배포가 커질수록 가치가 증가한다. 특히 실제 프로젝트에서 "왜 이 run을 신뢰했는가"를 재확인하기 좋다.

---

# 8. 후보 — AST Edit Preview → Apply

## 참고점

OMP의 preview/resolve 패턴처럼 구조적 변경을 즉시 쓰지 않고 제안 상태로 만들 수 있다.

## Weavra식 제안

```text
AST transformation request
        ↓
Proposal
        ↓
Derived diff preview
        ↓
Policy / risk
        ↓
Reviewer (R2)
        ↓
Apply
        ↓
Verification
```

Proposal 예:

```ts
interface MutationProposal {
  id: string;
  targetFiles: string[];
  beforeDigest: string;
  proposedDiff: ...;
  operation: "rename" | "structured-edit" | ...;
}
```

## 주의

- proposal 생성과 apply를 분리
- apply 직전 beforeDigest 재검증
- 자동 apply 금지
- AST engine이 지원하지 않는 언어에서 text fallback으로 몰래 전환하지 않음

## 평가

대규모 rename/refactor가 필요해질 때 유용하지만 현재 exact/small mutation보다 후순위다.

---

# 9. 후보 — Bounded Goal / Todo Continuation

## 참고점

OMO/Senpi의 goal/todo continuation은 agent가 미완료 작업을 이어가게 하는 UX가 강하다.

Weavra에는 그대로 가져오면 안 된다. 이미 Kernel이 완료 조건을 소유한다.

## Weavra식 해석

```text
Incomplete
   ↓
Continuation allowed?
   ↓
Budget check
   ├─ revision cycles
   ├─ attempt cap
   ├─ wall-clock cap
   ├─ optional token/cost cap
   └─ risk unchanged
   ↓
new attempt
```

무한 Ralph loop 형태가 아니라 **bounded continuation**만 허용한다.

## Task/Todo의 위치

- 사용자 계획/표시용 task는 가능
- 완료 authority는 todo checkbox가 아니라 Kernel
- todo 완료가 Review/Verification/Approval을 대체하지 않음

## 평가

STANDARD보다 복잡한 작업과 COMPLEX 도입 전에 유용하다.

---

# 10. 후보 — Capability / Tool Discovery

## 참고점

OMP는 hidden tool index와 BM25 검색으로 필요한 tool을 동적으로 찾는 패턴을 제공한다. OMO는 skill과 scoped capability/MCP를 연결한다.

현재 Weavra는 도구가 적어서 지금 도입할 필요가 없다.

향후 도구가 늘면:

```text
read/search
anchored edit
LSP
AST
web
browser
GitHub
MCP
debug
```

모든 schema를 항상 worker context에 넣는 비용과 안전 문제가 생긴다.

## 제안 구조

```text
Agent intent
    ↓
CapabilityBroker.search(query)
    ↓
Candidate capabilities
    ↓
Policy + role + risk
    ↓
Scoped activation
```

예:

```ts
interface CapabilityDescriptor {
  id: string;
  kind: "read" | "mutation" | "process" | "network";
  riskFloor: "R0" | "R1" | "R2" | "R3";
  roles: Role[];
  provider: string;
}
```

## 핵심

**tool discovery 결과가 곧 실행 권한은 아니다.** 활성화 전에 Policy가 최종 authority를 가진다.

## 평가

V0.4 이후 ToolBroker/MCP 도입 전 기반으로 적합하다.

---

# 11. 후보 — Project Memory / Facts

## 참고점

OMP의 Hindsight는 프로젝트별 durable memory를 유지한다.

Weavra에도 장기적으로 유용하지만 자동 기억은 stale/잘못된 가정 위험이 있다.

## 첫 단계 권장

자동 memory보다 **명시적 Project Facts**부터 시작한다.

```text
/state facts
/fact add "This project uses pnpm"
/fact add "DB migration requires manual approval"
/fact remove <id>
```

저장 예:

```json
{
  "id": "fact-...",
  "text": "DB migration requires manual approval",
  "source": "user",
  "createdAt": "...",
  "scope": "project"
}
```

## 사용 규칙

- Worker prompt 자동 주입은 allowlist/size cap
- 사실마다 source/createdAt 유지
- code evidence와 충돌 시 memory를 authority로 사용하지 않음
- 자동 추론 facts는 별도 status(`suggested`)로 저장하고 사용자 승인 전 사용 제한

## 평가

유용하지만 code intelligence/verification보다 후순위.

---

# 12. 장기 후보 — Team Mode / Parallel Subagents

## 참고점

OMO Team Mode는 lead/member, message/task, max parallel, wall-clock/member turn/message cap을 가진다. OMP도 parallel subagent와 workspace isolation 개념이 강하다.

Weavra에는 **COMPLEX workflow 단계**에서 참고할 가치가 매우 높다.

현재 이미 다음 기반이 있다.

```text
GraphProjection
Worktree isolation
Typed Handoff
Independent Reviewer
Policy / Approval
Durable State
```

## 장기 구조 예

```text
Planner
   ↓
Execution DAG
   ├─ Worker A → worktree A
   ├─ Worker B → worktree B
   └─ Researcher → read-only
          ↓
      typed handoff
          ↓
Integrator
   ↓
Reviewer
   ↓
Verification
```

## 필수 budget

- max parallel agents
- max total agents
- max member turns
- max wall-clock
- max inter-agent messages/bytes
- max revision cycles
- cancellation propagation

## 중요

현재 V0.2 DAG는 **projection**이다. 향후 execution DAG를 만들더라도 기존 GraphProjection을 scheduler state로 오용하지 않는다.

```text
Execution Plan / Scheduler State
           ↓
         Kernel
           ↓
     Runtime State
           ↓
   GraphProjection
```

방향을 유지한다.

## 평가

지금 구현하면 너무 이르다. COMPLEX 진입 시 최우선 참고 대상으로 유지한다.

---

# 13. 당장 가져오지 않을 것

## 13.1 AGENTS.md / CLAUDE.md / rules 자동 import

OMP/OMO는 다른 도구의 rules/skills를 적극적으로 발견·재사용한다. 편리하지만 Weavra의 worker resource isolation과 충돌할 수 있다.

필요하면 나중에:

```yaml
context:
  allow:
    - AGENTS.md
    - .weavra/rules/*.md
```

같은 explicit allowlist만 검토한다.

자동 recursive discovery를 기본값으로 두지 않는다.

## 13.2 Persistent Python/Bun eval

현재 Weavra는 arbitrary execution을 제한한다. persistent REPL을 Developer에게 바로 주면 Policy 경계가 사실상 무력화될 수 있다.

필요하면 registered process/sandbox 기반으로 별도 설계한다.

## 13.3 DAP Debugger

가치가 높지만 process control + runtime mutation + long-lived resource 관리가 필요하다. LSP read-only 이후 별도 단계로 둔다.

## 13.4 Browser / Web automation

Researcher 역할이 생기면 유용하지만 네트워크 content trust, credential, browser process, download/file write 정책이 먼저 필요하다.

## 13.5 Auto commit / merge / worktree cleanup

현재 Weavra의 핵심 철학과 맞지 않는다.

```text
no automatic commit
no automatic merge
no automatic rollback
no automatic destructive cleanup
```

사용자 검토 후 명시적 별도 명령으로만 검토할 수 있다.

---

# 14. 권장 로드맵

현재 V0.2B Viewer 이후의 제안 순서:

```text
V0.2B
Read-only TUI DAG Viewer
    ↓
V0.2C
Weavra Setup / ~/.weavra isolation / Doctor
    ↓
V0.3A
Hash-Anchored Edit
    ↓
V0.3B
LSP Diagnostics / Navigation
    ↓
V0.3C
QA Evidence / Doctor 강화
    ↓
V0.4A
AST Proposal / Preview / Apply
    ↓
V0.4B
Capability Broker / Tool Discovery
    ↓
V0.4C
Explicit Project Facts
    ↓
V0.5
COMPLEX / Planner / Execution DAG / Parallel Agents
```

이 순서는 고정 계약이 아니다. 실제 사용에서 pain point가 먼저 발견되면 작은 범위로 순서를 바꿀 수 있다.

---

# 15. 추천 구현 단위

## V0.2C — Product Isolation

DoD 후보:

- `weavra setup`
- `weavra doctor`
- canonical `~/.weavra/agent`
- 기존 Pi와 session/auth/settings 충돌 없음
- import는 explicit consent
- launcher/session smoke

## V0.3A — Anchored Edit

DoD 후보:

- QUICK/R1 single-file only
- stale anchor fail-closed
- duplicate/ambiguous anchor 거부
- Policy 유지
- old exact edit regression 유지
- real provider small-edit smoke

## V0.3B — LSP

DoD 후보:

- diagnostics/definition/references/symbols read-only
- unavailable != pass
- bounded output
- no LSP autofix
- Verification evidence 연결
- TS/JS 기준 실제 프로젝트 smoke

## V0.3C — QA Evidence

DoD 후보:

- evidence bundle 생성
- credential/transcript 제외
- source state 불변
- generated ownership/checksum
- `weavra doctor`와 연결

---

# 16. 피해야 할 아키텍처 회귀

외부 harness를 참고하면서도 다음은 피한다.

### 1. Tool이 Kernel authority가 되는 구조

잘못된 예:

```text
Agent → tool → 직접 approve / complete
```

유지할 구조:

```text
Agent → tool request → Policy/Approval → Kernel completion
```

### 2. Graph가 Scheduler가 되는 암묵적 전환

현재 `GraphProjection`은 display DTO다. execution DAG가 필요해지면 별도 schema/authority를 만든다.

### 3. 편의를 위해 stale evidence 자동 보정

anchor/hash/digest mismatch는 자동 fuzzy repair보다 재-read/re-plan을 우선한다.

### 4. 외부 설정 자동 import

"발견"과 "적용"을 분리하고 적용은 사용자 승인 후 진행한다.

### 5. 모든 capability를 모든 Agent에 제공

역할별 최소 tool surface를 유지하고 CapabilityBroker 도입 후에도 scoped activation만 허용한다.

---

# 17. 소스/참고 링크

- OMP: https://github.com/YanwuZeng/omp
- OMO / oh-my-openagent: https://github.com/code-yeongyu/oh-my-openagent
- OMO Team Mode/설치 문서: https://github.com/code-yeongyu/oh-my-openagent/tree/dev/docs/guide
- OMO configuration: https://github.com/code-yeongyu/oh-my-openagent/tree/dev/docs/reference
- Senpi: https://github.com/code-yeongyu/senpi
- 기존 Weavra Pi extension 조사: [WEAVRA_EXTENSION_ADOPTION_PLAN.md](WEAVRA_EXTENSION_ADOPTION_PLAN.md)
- Weavra architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Weavra decisions: [DECISIONS.md](DECISIONS.md)
- 작업 이력: [WORK_LOG.md](WORK_LOG.md)

---

# 18. 결론

OMP/OMO에서 Weavra가 가장 먼저 배워야 할 것은 "기능 개수"가 아니다.

```text
OMP
→ edit precision / code intelligence / capability surface

OMO Native
→ product setup / bounded orchestration / team budgets / operational UX

Weavra
→ fail-closed workflow / policy / independent review / evidence / human approval
```

세 방향을 합치되 Weavra의 authority 구조를 유지하는 것이 핵심이다.

가장 가까운 실전 우선순위는 다음 세 가지다.

1. **Weavra Setup + 독립 agent directory** — 제품 경계 완성
2. **Hash-Anchored Edit** — mutation integrity 강화
3. **LSP Diagnostics/Navigation** — coding/verification 품질 강화

그 뒤 QA Evidence와 Capability Broker를 쌓고, 충분히 안정된 다음에만 OMO Team Mode/OMP subagent 스타일의 COMPLEX/parallel execution으로 확장한다.
