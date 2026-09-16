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
- [GPT RC-01~08 수동 validation](docs/GPT_RC_VALIDATION_2026-09-16.md)에서 핵심 시나리오 PASS. 환경과 evidence 한계는 해당 문서 및 [readiness](docs/V0.1_READINESS.md)를 따른다. **DeepSeek는 NOT VERIFIED**다.

## Installation

현재는 checkout을 유지하는 개발/개인 설치다. Node.js `>=22.19.0`, npm, Git, Bash와 **별도로 설치된 `pi` executable**이 필요하다. 실제 Runtime 검증 환경은 macOS/POSIX, Node `26.7.0`이다. 다른 OS/Node 조합은 NOT VERIFIED이며 Windows는 지원하지 않는다.

```sh
git clone https://github.com/kjg8619/pi.git weavra
cd weavra
npm install --ignore-scripts
# 현재 설치된 Pi를 재사용한다. 아직 없다면:
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.85.1
pi --version
npm link --workspace packages/company-runtime --ignore-scripts

cd /absolute/path/to/my-project
weavra
```

`npm link`는 npm global prefix의 `bin/weavra`를 checkout에 연결한다. 해당 `bin` 디렉터리가 PATH에 있어야 한다. Pi 설정·인증을 재사용하며 launcher가 trust/approval을 자동 허용하지 않는다. checkout 이동/삭제 후에는 다시 link해야 한다. 이 흐름에는 build나 publish가 필요 없다.

```text
weavra <args>
  → PATH에서 기존 pi 선택
  → exec pi -e <checkout의 절대경로>/packages/company-runtime/src/extension.ts <args>
```

cwd, 환경, 인수 경계를 유지하며 shell alias나 별도 fork CLI가 아니다. `weavra --help`는 **Pi 도움말**, `weavra --version`은 **Pi 버전**을 그대로 출력한다. Weavra 버전/기능 도움말은 시작 알림과 `/workflow help`에서 확인한다. `weavra --model ...`은 부모 Pi 모델을 선택하며 worker profile은 `.ai/config.yaml`이 결정한다. `--no-extensions`는 자동 탐색을 끄지만 명시적 `-e`의 Weavra는 로드된다.

Pi가 없으면 PATH/설치 오류, checkout이 불완전하면 Extension 경로 오류를 표시한다. checkout의 소스 테스트에는 모델 데이터가 없는 경우 `npm run hydrate:model-data`가 별도로 필요하다(공개 카탈로그 다운로드, 추론 아님).

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
