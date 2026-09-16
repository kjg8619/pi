# Weavra

Adaptive Agent Workflow Runtime

**Weavra v0.1 RC1 기반 development build.** 안정 기준점은 [`weavra-v0.1-rc1`](https://github.com/kjg8619/pi/tree/weavra-v0.1-rc1)이며 launcher/branding 작업은 그 이후 변경이다. Pi CLI/SDK `v0.85.1`은 별도 버전이다. 정식 release나 패키지 발행을 뜻하지 않는다.

## What is Weavra?

Weavra는 Pi 위에서 작업 범위와 위험에 따라 QUICK 또는 STANDARD 순차 workflow를 실행하는 Runtime이다. 구현, 독립 리뷰, 실제 검증, 인간 승인을 구분하고 최신 증거를 확인한 Kernel만 완료를 결정한다. 일반 Pi 대화를 자동으로 workflow로 바꾸지 않으며 `/workflow run <goal>`로 시작한다.

## Current capabilities

- QUICK/R0 읽기 전용 설명과 QUICK/R1 작은 단일 파일 수정.
- STANDARD/R0–R2: Developer → SELF_CHECK → 독립 Reviewer → TEST → COMPLETE.
- Scoped R3: Git 추적 텍스트 파일 한 개 삭제에 한정한 1회 Human Approval.
- 실제 Git diff/digest, 등록 checks, 부분 변경 보고, 명시적 취소와 읽기 전용 상태 조회.
- Pi 기본 footer에 로컬 workflow/risk/phase·active role 및 마지막 종료 결과를 표시하는 Status Projection.
- [GPT RC-01~08 수동 validation](docs/GPT_RC_VALIDATION_2026-09-16.md)에서 핵심 시나리오 PASS. 환경과 evidence 한계는 해당 문서 및 [readiness](docs/V0.1_READINESS.md)를 따른다. **DeepSeek는 NOT VERIFIED**다.

## Installation

현재는 checkout을 유지하는 개발/개인 설치다. Node.js `>=22.19.0`, npm, Git, Bash와 **이 checkout에서 빌드한 coding-agent CLI**가 필요하다. global Pi 설치는 필요 없다. 실제 Runtime 검증 환경은 macOS/POSIX, Node `26.7.0`이다. 다른 OS/Node 조합은 NOT VERIFIED이며 Windows는 지원하지 않는다.

```sh
git clone https://github.com/kjg8619/pi.git weavra
cd weavra
npm install --ignore-scripts
npm run build  # workspace 의존성과 fork-local Pi CLI 빌드
npm link --workspace packages/company-runtime --ignore-scripts

cd /absolute/path/to/my-project
weavra
```

위의 workspace 한정 `npm link`는 npm global prefix에 **`weavra`만** 연결한다. 해당 `bin` 디렉터리가 PATH에 있어야 한다. `packages/coding-agent`를 global link하거나 기존 `pi`를 덮어쓰지 않는다. checkout 이동/삭제 후에는 다시 link해야 한다. publish는 필요 없다.

```text
pi               → 사용자가 기존에 설치한 Pi (변경 없음)
weavra <args>    → exec <checkout>/packages/coding-agent/dist/bundle/cli.js
                       -e <checkout>/packages/company-runtime/src/extension.ts <args>
```

두 명령을 같은 시스템에서 함께 사용할 수 있다. launcher 자신의 symlink/npm-link 실제 위치에서 checkout을 찾고 두 경로를 절대경로로 전달한다. PATH의 `pi`는 검색하거나 fallback으로 실행하지 않으므로 global Pi의 업데이트/버전 차이가 Weavra의 CLI 선택에 영향을 주지 않는다.

기본 `weavra`는 cwd·환경·인수·stdio·exit code·signal을 유지한다. `weavra --help`는 **fork-local Pi 도움말**, `weavra --version`은 **fork-local Pi 버전**을 그대로 출력한다. Weavra 버전/기능 도움말은 시작 알림과 `/workflow help`에서 확인한다. `weavra --model ...`은 부모 Pi 모델을 선택하며 worker profile은 `.ai/config.yaml`이 결정한다. `--no-extensions`는 자동 탐색을 끄지만 명시적 `-e`의 Weavra는 로드된다.

Pi를 실행하는 명령은 local CLI build가 없거나 실행할 수 없으면 checkout 경로와 `npm install --ignore-scripts && npm run build` 안내를 출력하고 즉시 실패한다. `--help`/`--version`도 예외가 아니며 global Pi로 대체하지 않는다. Extension이 없으면 checkout/link 복구 안내를 표시한다.

CLI와 Extension은 같은 checkout에서 관리한다. **checkout/Pi 소스·의존성 갱신 후에는 다시 build해야 한다.** launcher는 자동 build/update나 build freshness 검사를 하지 않는다. 기존 모델 데이터가 준비되어 있으면 `npm run build:offline`을 사용할 수 있다. 데이터가 없는 경우 `npm run hydrate:model-data`로 공개 모델 카탈로그를 준비할 수 있으며 추론 요청은 보내지 않는다.

**설정·인증·session 디렉터리는 아직 분리하지 않는다.** 기본 `~/.pi`와 기존 `PI_CODING_AGENT_DIR` 등 환경변수를 그대로 사용한다. 실행 파일은 독립적이지만 기본 설정/리소스는 공유하며 launcher가 trust/approval을 자동 허용하지 않는다. Weavra 전용 설정/session 경로는 별도 설계 항목이다.

## Isolated Git worktree

```sh
cd /path/to/project
# 현재 workspace에서 실행
weavra

# 격리된 Git worktree 생성 후 실행
weavra --worktree fix-login

# --worktree <name>만 소비하고 나머지 Pi 인수는 그대로 전달
weavra --worktree fix-login --model provider/model
```

현재 위치가 속한 Git repository의 canonical root와 HEAD를 확인하고 다음을 생성한다. 하위 디렉터리에서 실행해도 새 worktree의 루트에서 Pi가 시작한다.

- Branch: `weavra/<name>` (예: `weavra/fix-login`).
- Path: `<repo-parent>/.weavra-worktrees/<repo-name>/<name>`.
- 예: `/Users/me/Workspace/game` → `/Users/me/Workspace/.weavra-worktrees/game/fix-login`.
- Base: 생성 전에 고정한 source HEAD commit. 원본 branch/HEAD는 전후로 재검증한다.

이름은 필수이며 `[A-Za-z0-9._-]+`와 Git branch validity를 모두 만족해야 한다. 기존 branch 또는 target 경로(빈 디렉터리·파일·symlink 포함)가 있으면 재사용하지 않고 실패한다. 줄바꿈이 포함된 repository 경로와 source 안으로 들어가는 target은 거부한다. `--` 뒤 인수는 Pi에 그대로 전달하며 launcher 옵션으로 해석하지 않는다.

**생성 시 source는 clean이어야 한다.** staged/tracked/untracked 변경, Git/HEAD/status 검사 실패는 생성 거부다. ignored 파일이나 uncommitted 변경은 복사하지 않는다. `.ai/config.yaml`과 검증 script 등 worktree에서 필요한 파일은 먼저 직접 commit해야 한다. 생성 worktree가 프로젝트 cwd가 되므로 `.ai` state도 그곳에서 동작한다. 기존 설정·의존성·ignored 파일을 자동 준비하거나 trust를 승인하지 않는다.

Weavra **소스 checkout**의 fork-local CLI/Extension 경로는 바뀌지 않는다. 사용자 **프로젝트 worktree**만 실행 cwd가 된다. global Pi fallback은 없으며 local build가 없으면 생성 전에 실패한다. 생성 안내는 Pi stdout/JSON을 오염시키지 않도록 stderr에 출력하고, 이후 Pi argv/env/stdio·종료 코드/시그널은 기존 exec 계약을 따른다.

**--worktree does not merge, commit, stash, reset, or remove anything automatically.**

성공·BLOCKED·CANCELLED·오류·시그널 종료 후에도 worktree와 branch를 남긴다. 생성 도중 실패하면 예약된 빈 디렉터리나 Git의 부분 생성 결과도 남을 수 있다. 자동 rollback·강제 재사용·충돌 해결·PR 생성은 없다. 결과 확인과 이후 처리는 사용자가 직접 한다.

이 기능은 launcher convenience이며 Runtime/Policy/Approval/Status Projection의 의미나 worker 도구를 바꾸지 않는다. Worktree는 별도 파일 checkout이지 **OS sandbox나 독립 Git repository가 아니다**. Git object/ref 저장소는 공유한다. Launcher Git 명령은 optional index writes와 checkout/fsmonitor hooks를 끄고, worktree 부모 symlink 및 repository를 바꾸는 `GIT_DIR`/`GIT_WORK_TREE` 등의 환경 override는 거부한다. 외부 프로세스의 검사/생성 사이 경합이나 trusted Git filter·Pi/검증 프로그램 내부 부작용까지 격리하지 않는다.

### 기존 worktree 다시 열기와 조회

```sh
# 최초 생성: 이미 존재하면 실패 (create only)
weavra --worktree test-1

# 종료 후 같은 repository에서 다시 열기 (open existing only)
weavra --worktree-open test-1
weavra --worktree-open test-1 --continue  # 마지막 Pi 대화 계속; -c도 가능
weavra --worktree-open test-1 --resume    # Pi session picker; -r도 가능
weavra --worktree-open test-1 --session <path-or-id>

# 현재 repository의 Weavra branch에 연결된 worktree 조회 (read-only)
weavra --worktree-list
```

- **`--worktree`는 계속 생성 전용이다.** 기존 branch/path를 재사용하지 않는다. create/open/list는 동시에 지정하거나 반복할 수 없다.
- **`--worktree-open`은 기존 등록만 연다.** 생성과 같은 이름 검증 후 `git worktree list --porcelain -z`에서 정확한 `refs/heads/weavra/<name>`을 찾는다. 별도 registry 없이 정확히 하나의 등록, 실제 디렉터리, 동일 Git common repository, 일치하는 HEAD/branch, linked metadata의 역참조 경로와 index를 확인한다. Git common repository는 worktree들이 공유하는 Git 저장소다.
- branch만 있거나 경로가 누락/손상/prunable이면 실패한다. 조회 중 등록이 바뀌어도 중단한다. 자동 create/prune/repair/recreate/move/delete는 없다. 사용자가 정상적으로 옮긴 worktree는 **현재 Git 등록 경로**를 사용한다. 이 기능은 경로를 이동시키지 않으며 이전 Pi 세션 경로를 이관하지도 않는다.
- **Open에서는 source와 대상 worktree가 dirty여도 허용한다.** staged/unstaged/untracked 변경과 `.ai` 파일을 그대로 보존한다. 단, 이것이 새 `/workflow run`의 기존 clean baseline·Policy·Approval 조건을 완화하는 것은 아니다.
- launcher는 `--worktree-open <name>`만 소비하고 `--continue`/`--resume`/`--session`을 포함한 Pi 인수를 그대로 전달한다. 같은 canonical worktree cwd에서 Pi의 기존 SessionManager가 대화를 선택한다. session registry 복제나 `.ai` 기반 worktree 검색은 없다. **Pi 대화 재개는 Weavra workflow 자동 재개가 아니다.** `/state`로 결과를 확인하고 새 workflow는 명시적으로 시작한다.

`--worktree-list`는 `refs/heads/weavra/*`에 연결된 등록만 `NAME`, `BRANCH`, `PATH`, `STATUS`로 출력한다. `.ai`/session/config를 로드하거나 Pi를 시작하지 않으므로 **fork-local Pi build 없이도 조회 가능**하다. Node와 Git 및 checkout의 launcher helper는 필요하다. 목록 전용 명령이므로 추가 Pi 인수는 거부한다.

`OK`는 조회 시점의 Git metadata가 정상이라는 뜻이며 clean 상태나 Runtime 성공을 뜻하지 않는다. `LOCKED`도 metadata가 정상인 등록이며 open 가능하다. `PRUNABLE`, `MISSING/BROKEN`, `BROKEN`, `AMBIGUOUS`는 사용자 점검 대상이다. 상태 표시 자체가 자동 수정을 수행하지 않는다. 외부에서 등록한 경로의 탭/줄바꿈/제어 문자는 escape해서 표시하며, 줄바꿈 경로나 최종 디렉터리 symlink는 open에서 거부한다.

Open 성공 시 기존 fork-local CLI/Extension을 `exec`하므로 argv/env/stdio/exit/signal 계약과 global Pi 미사용은 그대로다. 안내는 stderr에 출력한다. 등록 검사는 OS sandbox나 Git lock이 아니므로 외부 프로세스의 검사/exec 사이 변경까지 완전히 방지하지는 않는다.

## Quick Start

1. 작업할 **Git 프로젝트 루트**에서 `.ai/config.yaml`을 직접 작성한다. 아래 예제를 수정하고 `scripts/check.mjs`에 실제 프로젝트 검증을 연결한다. 실행 파일과 간접 실행 코드까지 검토한다.
2. Pi `/login` 또는 기존 인증/`models.json`으로 지정한 provider/model을 준비한다. YAML에 API key를 넣지 않는다.
3. 설정·검증 script를 포함한 사용자 변경을 직접 검토하고 commit하여 clean Git baseline과 기존 HEAD를 준비한다. Runtime은 이를 대신하지 않는다. `.ai/state.json`, `tasks.json`, `writer.lock` 및 generated export는 Git 추적하지 않는다.
4. `weavra`에서 다음 명령을 사용한다. `src/calculator.js`는 프로젝트의 실제 허용 파일로 바꾼다.

```text
/workflow help
/workflow config
/workflow run Explain src/calculator.js
/workflow status
/state
/team
/risk
```

Run 확인 창에서 등록 check 실행을 확인한다. 취소는 `/workflow cancel`을 사용한다. 부모 Pi의 Esc가 worker를 취소한다고 가정하지 않는다. 파일 변경이 남았다면 다음 run 전에 사용자가 보존·정리해야 한다.

## Configuration

최소 실행 예제: [config.yaml](packages/company-runtime/examples/config.yaml). **provider/model ID는 예시이며 실제 설치·인증한 ID로 교체해야 한다.** `scripts/check.mjs`도 제공된 범용 검증기가 아니라 프로젝트가 작성해야 하는 trusted check다.

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
files:
  allowed_paths: [src, test]
verification:
  checks:
    - id: regression
      kind: test
      executable: node
      args: [scripts/check.mjs]
```

실제 [schema/parser](packages/company-runtime/src/config.ts)는 알 수 없는 필드와 정책 완화를 거부한다. 위 예제의 기본값은 `runtime.workflow: adaptive`, `agents.max_parallel: 1`, `agents.max_revision_cycles: 1`, `agents.worker_timeout_ms: 180000`, review/state 활성, `.ai` 저장, R3 승인 필수다. check 기본값은 `cwd: .`, `timeout_ms: 60000`, `required: true`다.

- STANDARD 재작업은 0–3회(기본 1), QUICK/scoped R3는 0회다.
- Worker timeout은 역할별 호출의 총 예산(10,000–600,000ms)이며 cleanup 완료 기한은 아니다.
- `allowed_paths`는 literal 상대 파일/디렉터리이며 glob이 아니다. 필수 check는 최소 1개 필요하다.
- QUICK은 coding만 사용하지만 schema에는 coding/reasoning mapping 모두 필요하다. STANDARD는 둘 다 사전 검사한다. 자동 model fallback은 없다.
- 전체 필드·제한: [Runtime 설정 문서](packages/company-runtime/README.md#설정-schema-1).

## Commands

모든 명령은 project trust를 요구한다. 각 명령 뒤 `help`를 붙이면 문법을 확인할 수 있다.

| 명령 | 용도 |
|---|---|
| `/workflow help` | workflow, risk, Reviewer, Human Approval, 안전 한계 |
| `/workflow run <goal>` | QUICK/STANDARD 시작 |
| `/workflow [status [runId]]` | 현재 또는 저장된 상태 |
| `/workflow history [page]`, `/workflow config` | 이력 / 현재 설정 |
| `/workflow cancel` | 명시적 취소 및 정리 대기; rollback 없음 |
| `/state [runId]` | 결과·요구사항·검증·부분 변경 |
| `/state checks [runId] [page]`, `/state check <number> [runId]` | check 목록 / 출력·exit·evidence |
| `/state review [runId]`, `/state decisions [runId] [page]` | 리뷰 / 운영 결정 |
| `/state export` | idle/terminal 상태에서 파생 결정·check 파일 생성 |
| `/team [runId]` | 역할·profile·독립 세션 참조 |
| `/risk [runId]` | 분류·Policy·Approval 상태 |

runId 생략 또는 `latest`는 최신 run이다. 조회는 worker/check를 재실행하지 않는다. 저장된 PASS는 기록 시점의 증거이며 현재 파일 상태나 프로세스 생존을 보장하지 않는다.

### Persistent status

로컬 workflow를 실행하면 Pi 기본 footer에 짧은 상태가 표시된다.

```text
Weavra · QUICK · R1 · IMPLEMENT · Executor
Weavra · STANDARD · R2 · REVIEW · Reviewer
Weavra · STANDARD · R3 · APPROVAL · Developer
Weavra · COMPLETED
Weavra · BLOCKED
Weavra · CANCELLED
```

기존 Kernel snapshot을 RuntimeEvent 발생 시 읽고, 문자열이 바뀔 때만 공식 `ctx.ui.setStatus("weavra.runtime", text)`를 호출한다. 실행 정리 완료 시 final snapshot/report도 확인한다. 타이머·파일 polling·별도 실행 상태 저장은 없다.

- 실행 전에는 비어 있고 종료 후에는 **이 Pi에서 실행한 마지막 결과**를 남긴다. 현재 Git 상태에 대한 보장이 아니다.
- 새 run의 preflight, reload·세션 전환·종료에서는 이전 표시를 지운다. `/workflow cancel` 후에는 실제 `CANCELLED` 등 종료 결과로 대체한다.
- 저장된 run·다른 Pi의 writer/active 기록은 footer의 live 근거로 사용하지 않는다. 재시작이나 `/state` 조회로 과거 RUNNING을 복원하지 않는다.
- 실행 소유권이 끝났는데 snapshot이 active라면 `Weavra · UNCONFIRMED · /state`, final report에 별도 저장/정리 오류가 있으면 `Weavra · ATTENTION · /state`로 표시한다.
- 다른 extension의 status 키를 건드리지 않고 footer를 교체하지 않는다. 외부 footer도 Pi의 extension statuses를 표시하면 공존할 수 있다. `pi-footer` 설치는 필요 없다.
- TUI에만 표시한다. 표시/clear 실패는 best-effort이며 실행 결과·취소·cleanup을 바꾸지 않는다. UI API 자체가 고장 난 경우 실제 화면의 stale 문자 제거까지 보장할 수는 없다.

## Workflow & Risk

| 범위 | 실행과 완료 조건 |
|---|---|
| QUICK/R0 | read-only Executor, Reviewer 없음. finding은 보존하며 실제 파일 변경은 없어야 함 |
| QUICK/R1 | 고정 파일 1개·최대 100 changed-line span, Executor와 필수 checks. 잔여 위험은 STANDARD 필요 |
| STANDARD/R0–R1 | Developer, 독립 read-only Reviewer PASS, SELF_CHECK/TEST와 최신 diff |
| STANDARD/R2 | 제한된 파일 변경(허용된 manifest 포함), 독립 Reviewer 필수. 설치 도구 없음 |
| Scoped R3 | 허용된 Git tracked UTF-8 파일 1개(256 KiB 이하) 삭제만. 기본 Deny, 만료되는 Approve once, 독립 리뷰와 checks 필수 |

R3 요청 문법은 `Delete file src/obsolete.ts`, `Remove file src/obsolete.ts`, `파일 삭제 src/obsolete.ts`다. 일반 run 확인/Pi `--approve`는 별도 삭제 승인이 아니다. 분류는 보수적 규칙이며 불명확/혼합 unsafe 요청은 거부할 수 있다. 실행 중 권한 상승이나 자동 workflow 전환은 하지 않는다.

## Safety Model

- **자동 commit/rollback 없음.** 실패·취소 후 이미 발생한 변경은 남을 수 있다.
- Policy는 역할·허용/보호 경로·action을 검사하고 완료는 독립 리뷰/필수 checks/최신 digest와 저장 성공을 요구한다. stale PASS를 재사용하지 않는다.
- 프로젝트당 단일 writer. cleanup 미확인 시 lock을 보존하며 자동 탈취하지 않는다.
- Human Approval은 exact action에 대한 1회 동의이지 완료나 범용 권한이 아니다.
- **OS sandbox가 아니다.** 등록 check는 trusted code이고 내부 I/O/네트워크를 격리하지 않는다. 외부 파일 교체 경합과 악성 같은-process 코드를 완전히 막지 못한다.
- 정책은 Runtime worker/check 경로에 적용된다. **idle 상태의 일반 Pi 대화·기본 도구 전체를 sandbox하지 않는다.** launcher는 기존 Pi 리소스/설정을 끄거나 재작성하지 않는다.
- `.ai/state.json`은 운영 상태 원본이다. Pi JSONL은 Pi 소유이며 export는 실행/승인 authority가 아니다.

## Current Limitations

COMPLEX 실행, Planner/Lead 실행, 병렬 Agent, DAG scheduler, T3Code, Windows, 범용 R3, arbitrary shell/install/deploy 도구, 자동 resume/checkpoint/rollback은 지원하지 않는다. 전체 Runtime RPC 실행도 검증된 지원 범위가 아니다. Print/JSON 모드에서는 Runtime 명령의 UI가 없어 명시적으로 실패한다.

DeepSeek/다른 Provider, Linux/다른 OS·Node 조합, 전체 upstream e2e 및 배포물 검증은 NOT VERIFIED다. GPT validation의 한정된 PASS를 모든 환경/모델의 보장으로 확대하지 않는다.

## Roadmap

다음 후보는 기존 state/event를 **읽기 전용 DAG Projection으로 시각화**하는 단계다. 아직 구현되지 않았다. 실행 scheduler나 workflow semantics 변경과 분리하여 설계·검증한다. COMPLEX/Planner/Lead/병렬화/T3Code는 별도 향후 범위이며 이번 제품 기능이 아니다.

내부 `CompanyKernel`, `CompanyExtensionOptions`, `registerCompanyRuntime`, `packages/company-runtime`, 세션 경로와 package `0.85.1` 메타데이터는 유지한다. 이는 Weavra 제품 버전이 아니다. 안정된 worker prompt와 역사적 설계/validation 기록의 기존 명칭도 보존한다. 상세 구현은 [Runtime 문서](packages/company-runtime/README.md), 작업 기록은 [WORK_LOG](docs/WORK_LOG.md)를 참고한다.

---

## Upstream Pi

아래는 재사용하는 Pi harness의 안내다. Pi 자체 기능·버전·배포 절차는 Weavra와 별개다.

<p align="center">
  <a href="https://pi.dev">
    <img alt="pi logo" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://www.npmjs.com/package/@earendil-works/pi-coding-agent"><img alt="npm" src="https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square" /></a>
</p>

> New issues and PRs from new contributors are auto-closed by default. Maintainers review auto-closed issues daily. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Pi Agent Harness

This is the home of the Pi agent harness project including our self extensible coding agent.

* **[@earendil-works/pi-coding-agent](packages/coding-agent)**: Interactive coding agent CLI
* **[@earendil-works/pi-agent-core](packages/agent)**: Agent runtime with tool calling and state management
* **[@earendil-works/pi-ai](packages/ai)**: Unified multi-provider LLM API (OpenAI, Anthropic, Google, …)

To learn more about Pi:

* [Visit pi.dev](https://pi.dev), the project website with demos
* [Read the documentation](https://pi.dev/docs/latest), but you can also ask the agent to explain itself

## All Packages

| Package | Description |
|---------|-------------|
| **[@earendil-works/chord](packages/chord)** | Standalone application-composition runtime for services, replicated state, RPC, and plugins |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | Vendor-neutral telemetry contracts, reference adapter, conformance tests, and typed schemas |
| **[@earendil-works/pi-ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.) |
| **[@earendil-works/pi-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | Interactive coding agent CLI |
| **[@earendil-works/pi-tui](packages/tui)** | Terminal UI library with differential rendering |

For Slack/chat automation and workflows see [earendil-works/pi-chat](https://github.com/earendil-works/pi-chat).

## Permissions & Containerization

Pi does not include a built-in permission system for restricting filesystem, process, network, or credential access. By default, it runs with the permissions of the user and process that launched it.

If you need stronger boundaries, containerize or sandbox Pi. See [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) for three patterns:

- **Gondolin extension**: keep `pi` and provider auth on the host while routing built-in tools and `!` commands into a local Linux micro-VM.
- **Plain Docker**: run the whole `pi` process in a local container for simple isolation.
- **OpenShell**: run the whole `pi` process in a policy-controlled sandbox.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [AGENTS.md](AGENTS.md) for project-specific rules (for both humans and agents).  Longer term plans for Pi can also be found in [RFCs](https://rfc.earendil.com/keyword/pi/).

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build         # Refresh model data, then build all packages
npm run build:offline # Rebuild using existing model data without network access
npm run check         # Lint, format, and type check
./test.sh            # Run tests (skips LLM-dependent tests without API keys)
./pi-test.sh         # Run pi from sources (can be run from any directory)
```

## Building standalone binaries from release source

GitHub releases include a versioned source archive covered by the release's `SHA256SUMS` file. Extract it and run the same build script used for the official standalone binaries:

```bash
VERSION="<release-version>"
tar -xzf "pi-${VERSION}-source.tar.gz"
cd "pi-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

The archive includes release model data and native prebuilds. `--offline-model-data` uses that model data without refreshing provider catalogs. The script installs dependencies and builds the executable with its runtime assets; pass `--skip-install` if dependencies are already provided.

## Supply-chain hardening

We treat npm dependency changes as reviewed code changes.

- Direct external dependencies are pinned to exact versions. Internal workspace packages remain version-ranged.
- `.npmrc` sets `save-exact=true` and `min-release-age=2` to avoid same-day dependency releases during npm resolution.
- `package-lock.json` is the dependency ground truth. Pre-commit blocks accidental lockfile commits unless `PI_ALLOW_LOCKFILE_CHANGE=1` is set.
- `npm run check` verifies pinned direct deps, native TypeScript import compatibility, and the generated coding-agent shrinkwrap.
- The published CLI package includes `packages/coding-agent/npm-shrinkwrap.json`, generated from the root lockfile, to pin transitive deps for npm users.
- Release smoke tests use `npm run release:local` to build, pack, and create isolated npm and Bun installs outside the repo before tagging a release.
- Local release installs, documented npm installs, and `pi update --self` use `--ignore-scripts` where supported.
- CI installs with `npm ci --ignore-scripts`, and a scheduled GitHub workflow runs `npm audit --omit=dev` plus `npm audit signatures --omit=dev`.
- Shrinkwrap generation has an explicit allowlist for dependency lifecycle scripts; new lifecycle-script deps fail checks until reviewed.

## Share your OSS coding agent sessions

If you use Pi or other coding agents for open source work, please share your sessions.

Public OSS session data helps improve coding agents with real-world tasks, tool use, failures, and fixes instead of toy benchmarks.

For the full explanation, see [this post on X](https://x.com/badlogicgames/status/2037811643774652911).

To publish sessions, use [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf). Read its README.md for setup instructions. All you need is a Hugging Face account, the Hugging Face CLI, and `pi-share-hf`.

You can also watch [this video](https://x.com/badlogicgames/status/2041151967695634619), where I show how I publish my `pi-mono` sessions.

I regularly publish my own `pi-mono` work sessions here:

- [badlogicgames/pi-mono on Hugging Face](https://huggingface.co/datasets/badlogicgames/pi-mono)

## License

MIT

<p align="center">
  <a href="https://pi.dev">pi.dev</a> domain graciously donated by
  <br /><br />
  <a href="https://exe.dev"><img src="packages/coding-agent/docs/images/exy.png" alt="Exy mascot" width="48" /><br />exe.dev</a>
</p>
