# Weavra — AI 코딩 에이전트 유형별 조사 및 도입 제안

- 조사일: **2026-09-18 KST**
- 대상: `kjg8619/pi`, `devlop`
- 검토 기준: **`971d4c30daf20ee6e92cf3d840098eb68fffd05f`**
- 기준 커밋 시간: 2026-09-18 14:23:41 KST
- 성격: 소스·공식 문서 기반 조사와 설계 제안. 구현·설치·성능 비교 실행 결과가 아니다.
- 결정 반영: **UI는 T3 Code 우선**, **Jev는 TypeSafe / browser-use/jev-ultrafast**. Cerebras와 혼동하지 않는다.
- 게시일: **2026-09-18 KST**. 사용자 요청에 따라 `devlop`의 `docs/`에 연구 문서로 게시한다. 제품 코드·설정·기존 로드맵·안정 태그는 변경하지 않는다.
- 게시 전 확인한 HEAD: **`656fc19fe575eab324f4d12ce968bf7a8cd984e2`**. 원래 조사 기준과 구분하며, 해당 HEAD 전체를 재감사하거나 테스트한 것은 아니다.

## 게시 시점 보정

원래 조사는 V0.4A 기준 `971d4c3`에서 수행했고, 최초 게시 전에는 V0.4B 구현까지만 반영돼 있었다. 이후 LOG-067에서 V0.4B Verifier Trust의 최종 contract closure와 실제 DeepSeek strict-trust **COMPLETED**를 확인했다. registration digest의 filtered env binding, executable identity real SHA-256, Host-frozen expected registration digest Kernel guard, Reviewer/Worker protected-oracle guidance까지 닫혔다.

따라서 이 문서를 현재 작업 계획에 반영할 때 V0.4B는 **CLOSED**로 읽는다. C02의 Verifier Trust 선행조건은 충족됐고, 다음 선행 작업은 기존 로드맵의 **V0.4C Verifier Sandbox**다. 특히 C02의 bounded repair와 C08의 브라우저 행동 범위를 넓히기 전에 verifier/file/network/process 격리 경계를 먼저 확보한다.

2026-09-18 후속 채택 순서는 **V0.4C → V0.5A C01 → V0.5B C03 → V0.5C C02 → V0.5D C04+C05 → V0.6A C07 → V0.6B C06 → V0.6C C08 → Facts/Capability Broker → COMPLEX/Parallel**로 정리한다. C06은 일회성 모델 순위가 아니라 이후에도 계속 누적하는 Provider Fitness 평가 track으로 본다.

제안한 C01~C08이 이미 구현됐다는 뜻은 아니며, 각 단계 착수 전 실제 HEAD와 기존 authority 계약을 다시 확인한다.

이 문서는 기존 [로드맵](WEAVRA_ROADMAP_2026-09-17.md), [보완 계획](WEAVRA_IMPROVEMENT_AND_FEATURE_RESEARCH_2026-09-17.md), [OMP/OMO 도입 계획](WEAVRA_OMP_OMO_ADOPTION_PLAN.md)을 대체하지 않는다. 제안한 명칭·자료 구조는 현재 명령이나 설정이 아니다.

## 목차

1. [결론](#1-결론)
2. [현재 Weavra와 중복되는 제안 제거](#2-현재-weavra와-중복되는-제안-제거)
3. [유형별 조사](#3-유형별-조사)
4. [후보별 적용 설계](#4-후보별-적용-설계)
5. [지금 넣지 않을 기능](#5-지금-넣지-않을-기능)
6. [추천 진행 순서](#6-추천-진행-순서)
7. [평가 계획](#7-평가-계획)
8. [설계 요약](#8-설계-요약)
9. [근거 자료](#9-근거-자료)

## 1. 결론

Weavra에 외부 코딩 에이전트들을 중첩 실행하는 방식보다, 각 제품에서 효과적인 실행·문맥·검증 패턴을 작은 모듈로 흡수하는 방식을 권한다. 현재 Runtime은 이미 실행 통제 기반을 갖고 있으므로 다음 목표는 **필요한 코드를 잘 찾기, 검증 실패를 제한적으로 수습하기, 반복 작업을 일관되게 수행하기, T3에서 정확한 상태를 보여 주기**다.

우선 후보는 다음과 같다. 우선순위는 Weavra의 상황에 대한 설계 판단이지 제품 성능 순위가 아니다.

| ID | 후보 | 우선도 | 새로 추가할 부분 |
|---|---|---|---|
| C01 | Task Context Pack / Repo Map | 높음 | 기존 list/LSP 결과를 작업별로 선별·압축·출처 고정 |
| C02 | Bounded Verification Repair | 높음, 선행 보호 필요 | 테스트 assertion 실패를 제한된 새 attempt로 되돌리는 경로 |
| C03 | Task Recipes / Reviewed Skill Packs | 높음 | 반복 절차를 기존 Task Contract로 변환하는 템플릿 |
| C04 | Impact-aware Review Pack | 중간~높음 | 변경 함수의 호출자·계약·관련 테스트까지 리뷰 문맥 확장 |
| C05 | Versioned Documentation Pack | 중간 | 실제 의존성 버전에 맞는 공식 문서·예제의 제한된 검색 |
| C06 | Provider Contract/Fitness Matrix | 중간~높음 | Provider별 구조화 도구·strict 편집·AC 제출의 재현 가능한 적합성 평가 |
| C07 | T3 Code Host Bridge | 제품 방향상 높음 | 구조화 명령·이벤트·승인·취소·재연결 계약 |
| C08 | Jev Browser Explorer → Regression Evidence | 조건부 후속 | 통제된 브라우저 탐색과 독립 결과 검증 |

V0.4B Verifier Trust는 LOG-067에서 CLOSED됐고, 기존 로드맵의 **V0.4C Verifier Sandbox**를 다음 단계로 유지한다. 특히 C02와 외부 실행을 넓히는 C08은 V0.4C 격리 경계를 먼저 확보한다.[W2]

## 2. 현재 Weavra와 중복되는 제안 제거

[README][W1]와 [로드맵][W2]의 조사 당시 후속 기록을 함께 확인했다. 게시 시점의 V0.4B 보정은 위 항목과 [작업 이력][W4]을 따른다. 역사 문서의 첫 제목이나 과거 답변만으로 현재 지원 범위를 판단하지 않았다.

| 영역 | 확인된 기준 상태 | 이번 조사에서의 처리 |
|---|---|---|
| 역할·검증 | QUICK/STANDARD, 독립 Reviewer, required checks, 제한된 revision | 새 팀 프레임워크로 교체하지 않음 |
| 권한·작업 범위 | READ_ONLY/EDIT, scoped R3 승인 | 외부 agent의 권한 설정을 그대로 수입하지 않음 |
| 프로젝트 문맥 | 명시적 instruction snapshot, bounded file list, 읽기 전용 LSP | C01/C04는 이 기반 위에 작업별 선별을 추가 |
| 작업 계약 | AC ID, Plan Preview, frozen contract digest | C03은 계약 생성 템플릿이지 별도 완료 엔진이 아님 |
| 측정 | usage/budget/provenance/Evidence Pack/eval adapter | C06과 비교 평가에서 재사용 |
| 편집 | V0.4A compatible 기본 + opt-in strict receipt/identity, create/replace 분리 | hashline/strict edit를 새 기능으로 다시 제안하지 않음 |
| 제품 기반 | setup/doctor, 전용 agent dir, worktree, 상태·그래프 projection | T3에 연결하되 원본 권한은 Runtime 유지 |

로드맵은 실제 Plain Pi vs Weavra 비교와 20개 corpus 확장을 NOT VERIFIED로 기록한다. 따라서 실제 효율 개선은 아직 측정해야 한다. 기록된 개별 smoke를 모든 프로젝트·모델의 신뢰성으로 확대하지 않는다.[W2]

DeepSeek 공식 API와 CommandCode 경유 DeepSeek를 구분한다. 현재 문서에는 후자의 제한된 실제 smoke가 있으므로, 모든 DeepSeek 사용이 미검증이라고 반복하지 않는다. 반대로 중개 Provider에서의 결과를 공식 API의 결과로 옮기지 않는다.[W1]

## 3. 유형별 조사

제품은 여러 유형에 걸칠 수 있다. 아래 분류는 비교 목적이며, 모든 항목이 독립 코딩 에이전트인 것은 아니다. Spec Kit/OpenSpec/Superpowers는 방법론·스킬 계층, T3는 제어 화면, Jev는 브라우저 행동 선택 계층으로 구분한다.

| 유형 | 조사 대상 | 참고한 실제 기능/설계 | Weavra 도입 판단 |
|---|---|---|---|
| CLI | Claude Code | 별도 문맥과 도구 범위를 가진 subagent, 탐색 결과 요약 반환 [A1] | 탐색 분리·문맥 절약 개념. 전체 Claude 런타임 중첩은 불필요 |
| CLI/통합 API | Codex | App Server의 명령/응답/이벤트/승인 프로토콜 [A2] | C07의 경계 참고. Codex 프로토콜 위장 구현은 하지 않음 |
| CLI | Gemini CLI | 정책 엔진과 도구 실행 판단 [A3] | 기존 Policy의 설명 가능성과 테스트에 참고 |
| CLI | OpenCode | 주/보조 agent 설정, 역할별 모델·도구·권한 [A4] | 모델과 역할 설정 UX 참고. 자동 상속 규칙은 별도 검토 |
| CLI | Aider | Repo Map, architect/editor, lint/test 피드백 [A5][A6][A7] | C01/C02의 주요 참고. architect는 독립 Reviewer와 다름 |
| IDE/통합 개발 | Cursor | 코드 탐색·계획·디버깅·리뷰 및 rules/skills [A8] | 문맥 선택과 diff 기반 피드백 UX 참고 |
| IDE/문맥 | Windsurf/Cascade 계열 | Fast Context, 반복 Workflow [A9][A10] | 검색 전담 문맥과 재사용 절차. 현재 공식 링크는 Devin Desktop 문서로 연결됨 |
| IDE/CLI | Cline | Plan/Act, 프로젝트 rules [A11][A12] | C03의 사용성 참고. 현재 Weavra Plan Preview는 유지 |
| IDE/CLI | Kilo Code | VS Code·JetBrains·CLI·Cloud 접근, 모델 선택 [A13] | 환경별 동일 작업 경험 참고. 제품 전체를 이식할 이유는 적음 |
| IDE/맞춤화 | Continue | 모델·규칙·도구를 조합하는 맞춤 개발 환경 [A14] | 기존 Runtime config를 활용하는 작은 preset 참고 |
| IDE/역사 참고 | Roo Code | Code/Architect/Ask/Debug/Custom modes [A15] | README에 종료 안내가 있으므로 신규 운영 의존성보다 설계 참고 |
| Pi 파생 | OMP / oh-my-pi | LSP/DAP, AST preview, typed subagents, 지연 도구 검색 [A16] | 기존 LSP/anchor는 중복. AST·도구 검색·debugger는 선택적 후속 |
| 오케스트레이션/Pi 파생 | OMO / Senpi 계열 | explore/librarian, 작업 category, 모델별 설정 [A17] | C01/C05/C06 참고. OpenCode/Codex/Native 판본을 혼동하지 않음 |
| 명세 기반 | Kiro | Feature/Bugfix specs, 현재/기대/유지할 동작의 분리 [A18] | C03의 bugfix recipe와 회귀 조건에 적합 |
| 명세 방법론 | GitHub Spec Kit | 의도→명세→계획→작업 산출물 [A19] | 문서 전체 체계 대신 필요한 템플릿만 흡수 |
| 명세 방법론 | OpenSpec | 변경 단위 proposal/spec/design/tasks [A20] | 기존 프로젝트의 변경 범위·비목표 표현에 참고 |
| 개발 스킬 | Superpowers | 계획, TDD, 단계별 구현·검토 스킬 [A21] | 검토한 스킬을 recipe로 변환. 자동 hook 전체 로드 금지 |
| 클라우드 위임 | Devin | 반복 작업용 Playbooks [A22] | C03 참고. 새 클라우드 플랫폼 구축은 불필요 |
| 런타임/SDK | OpenHands | local/remote 실행 경계, Agent Server, context condenser [A23] | sandbox 및 문맥 관리 패턴. 기존 Kernel 교체는 하지 않음 |
| 클라우드 위임 | GitHub Copilot cloud agent | 일회성 환경에서 조사·수정·검증, 필요 시 PR [A24] | 격리 환경과 결과 패키지. 자동 push/PR는 현재 범위에 추가하지 않음 |
| 리뷰 전담 | CodeRabbit | 경로별 규칙, CI 분석, 문맥 기반 코드 리뷰 [A25] | C04의 검토 항목·증거 연결 패턴 |
| 리뷰 전담 | Greptile | 코드 관계 그래프를 활용한 영향 분석 [A26] | C04 참고. 외부 SaaS 도입과 기능 참고는 별개 |
| 경량/평가 | mini-SWE-agent | 작은 agent/environment/model 경계와 실행 trajectory [A27] | 단순 baseline·실패 분석에 참고. unrestricted shell을 복제하지 않음 |
| 제어 화면 | T3 Code | UI/실행 서버 분리, adapter, 이벤트·명령 처리 [A28] | C07 우선 Host로 유지 |
| 브라우저 | Jev Ultrafast | 관찰한 요소 중 행동·대상 선택, 문구 생성 별도, freshness 확인 [A29] | C08 opt-in. 일반 Browser Use 설정 하나로 치환되는 기능은 아님 |

### 유지보수·비교 시 주의

Roo Code의 종료 안내처럼 프로젝트 상태는 바뀐다. 제품명만 보고 활성 프로젝트라고 단정하지 않는다. OMP 참고 저장소의 README는 can1357/oh-my-pi를 가리키고, OMO는 배포판별 구성이 다르므로 실제 이식 대상 revision을 별도로 고정한다.[A15][A16][A17]

홍보 문구의 ‘몇 배 빠름’이나 서로 다른 benchmark 점수를 제품 순위로 재구성하지 않았다. 실제 코드 이식 시 license, NOTICE, 직접·전이 의존성을 선택 revision 기준으로 다시 확인해야 한다. 공개 소스라는 사실과 Weavra에 적합한 의존성이라는 판단은 다르다.

## 4. 후보별 적용 설계

### C01 — Task Context Pack / Repo Map

**출발점:** Aider의 심볼·관계 요약과 Claude/Windsurf의 탐색 문맥 분리.[A1][A5][A9]

**현재와 차이:** Weavra에는 파일 목록과 LSP 질의가 있다. 추가할 것은 그 결과 중 이번 AC를 해결하는 데 필요한 것만 모아 Developer/Reviewer에게 전달하는 계층이다. 기존 `/graph`의 workflow DAG와 소스 코드 의존 그래프는 다른 자료다.

예시:

```text
TaskContextPack
  targetSymbols: 이번 수정의 함수·클래스
  relatedFiles: 정의·직접 호출자·관련 테스트
  reusablePatterns: 이미 존재하는 공통 구현
  projectRules: 적용되는 instruction snapshot 참조
  snippets: 원문 일부 + 상대경로 + 행 + content digest
  unknowns: 찾지 못한 연결·지원하지 않는 언어 요소
```

위 구조는 제안이며 현재 schema가 아니다. 첫 구현은 별도 LLM 탐색 agent 없이 list/LSP와 제한된 literal search를 묶어 시작한다. 문맥 예산과 파일/결과 개수에 상한을 두고, 필요할 때만 작은 읽기 전용 탐색 worker를 검토한다.

정책 필터를 인덱싱 전에 적용한다. 한 번 읽어 둔 secret을 나중에 가리는 방식에 기대지 않는다. 캐시는 HEAD뿐 아니라 변경 파일 digest, 정책/설정, 언어 서버 상태에 영향을 받는다. 코드를 편집할 때는 pack의 오래된 snippet이 아니라 현재 파일을 다시 읽고 strict receipt를 받는다. Reviewer는 Developer의 해석만 신뢰하지 않고 원문으로 추적할 수 있어야 한다.

**후보 위치:** 기존 `lsp/`, `agent-tools.ts`, `agent-runner.ts` 위의 새 context 조합 모듈.

**평가:** 같은 과제의 관련 파일 발견률, 중복 read, 입력 토큰, 누락 회귀, 성공률. 토큰 감소만으로 채택하지 않는다.

### C02 — Bounded Verification Repair

**정적 관찰:** 현재 kernel의 SELF_CHECK/TEST는 검증 결과를 저장한 뒤 `assertVerification`을 적용하며 실패는 terminal 처리로 이어진다. 명시적인 재작업 전이는 Reviewer의 REVISE에 있다. 따라서 이 후보는 ‘이미 있는 review revision’과 다른 기능이다.[W3]

Aider는 lint/test 오류를 수정 피드백으로 사용하는 흐름을 제공한다. Weavra에는 무제한 반복이 아닌 다음 경로를 제안한다.[A6]

```text
Developer → SELF_CHECK
               ├─ PASS → Reviewer → TEST → 완료 guard
               └─ 허용된 assertion 실패
                    → 실패 증거 보존
                    → 예산·범위 확인
                    → 새 Developer attempt
                    → SELF_CHECK → 새 Reviewer → TEST
```

처음에는 **opt-in STANDARD/EDIT R1, 최대 1회**를 제안한다. 이는 현재 기능이 아니며 Task Contract와 별도 복구 예산을 실행 전에 확인해야 한다. 이미 종료된 run을 자동 resume하지 않고, 정책이 허용한 live run에서만 다음 attempt를 만들도록 상태 전이를 설계한다.

인증/Provider 오류, 정책 거절, 취소, cleanup 미확인, 저장 실패, 승인 거부, 범위 초과, 불명확한 외부 변경은 이 경로로 재시도하지 않는다. 단순 nonzero exit 전부를 수정 가능한 assertion으로 취급하지 않는다. 모르는 실패는 종료한다.

V0.4B의 보호된 검증 기준이 선행되어야 한다. 모델이 테스트를 지워 PASS를 만들지 못해야 한다. 이전 실패와 비용을 보존하고 새 attempt에서는 이전 리뷰·검증·receipt를 재사용하지 않는다. worker에 임의 shell을 주는 대신 Runtime이 등록된 verifier를 실행해 결과를 전달한다. R3와 READ_ONLY는 초기 지원에서 제외한다.

**후보 위치:** `kernel.ts`, `ports.ts`, `contracts.ts`, `workflow.ts`, 관련 hardening tests.

**평가:** 첫 테스트가 실패하고 한번 수정하면 통과하는 fixture, 원래 코드 밖의 수정 필요, 재실패, 취소, 오래된 PASS, 보호 테스트 훼손 시도를 각각 확인한다.

### C03 — Task Recipes / Reviewed Skill Packs

**출발점:** Kiro bugfix specs, Superpowers의 TDD·디버깅 절차, OpenSpec의 변경 단위 문서, Devin Playbooks.[A18][A20][A21][A22]

추가할 것은 ‘또 다른 Planner’가 아니라 반복 작업을 기존 Task Contract로 바꾸는 입력 템플릿이다.

초기 recipe 후보:

- bugfix: 재현 조건 → 기대 결과 → 유지할 기존 동작 → 회귀 검사
- safe refactor: 외부 API/동작 불변 → 수정 허용 범위 → 회귀 검증
- test addition: 결함/경계 조건 → 테스트 대상 → 기존 기준 유지
- read-only investigation: 관찰 사실 → 가능한 원인 → 미확인 사항 → 수정 제안만

운영 전용 제품으로 좁히지 말고 개인 프로젝트에도 같은 recipe를 사용한다. Java/Spring, SQL, Unity 같은 기술별 규칙은 별도 선택 팩으로 붙일 수 있다.

```text
사용자가 선택한 recipe + 입력
   → schema 검사
   → AC/check ID/scope/instruction 제안
   → 기존 Plan Preview에서 사용자 확인
   → frozen Task Contract
   → 기존 QUICK/STANDARD
```

recipe는 실행 코드가 아닌 데이터로 시작한다. 임의 shell, npm install, 자동 extensions/hooks, 새로운 권한 부여는 포함하지 않는다. 필요한 check는 이미 등록된 ID만 참조한다. 선택 recipe의 버전과 digest를 Run provenance에 연결한다.

TDD를 지원할 때는 ‘결함 재현을 위해 기대한 실패’와 일반 SELF_CHECK 실패를 구분해 기록한다. 기존 FAIL을 PASS로 바꾸지 않고 별도 기대 결과 계약을 추가해야 한다. 구현 agent가 고칠 테스트와 Host 소유 oracle도 분리한다.

**평가:** 사용자 설정 시간, AC 누락, 반복 작업 성공률. 거대한 통합 지침을 매번 넣는 비용을 줄이되 핵심 안전 규칙은 생략하지 않는다.

### C04 — Impact-aware Review Pack

**출발점:** Greptile의 코드 관계 문맥, CodeRabbit의 경로별 규칙 및 CI 문맥.[A25][A26]

기존 Reviewer를 더 늘리는 대신 다음 정보를 제공한다.

```text
changed symbol
  → 직접 호출자 / 사용하는 화면·API
  → 반환값·예외·권한·데이터 계약
  → 관련 테스트
  → 이번 AC와 수정하지 말아야 할 동작
```

예를 들어 함수 한 줄만 바뀌어도 호출자의 null 처리나 반환 형식이 달라질 수 있다. C01의 구조 정보를 Reviewer용으로 다시 선별하는 방식이 좋다. 문맥 밖의 호출자는 허용된 읽기 정책 안에서만 조회한다.

처음에는 기존 Reviewer 한 세션에 더 좋은 입력을 준다. 데이터·보안·성능 전문가를 매번 여러 명 실행하지 않는다. 별도 분석이 필요해도 결과는 advisory finding이며 최종 완료 권한이 아니다. diff 밖의 위험은 구체적인 경로·조건·증거와 연결해 불필요한 경고를 줄인다.

**평가:** 수정 파일 밖에 영향을 주는 planted regression을 찾는지, 기존 기준 대비 오탐·토큰·시간이 어떻게 달라지는지.

### C05 — Versioned Documentation Pack

**출발점:** OMO의 librarian, OMP의 URL/문서 접근 패턴.[A16][A17]

문서 검색 결과를 무제한으로 주입하는 대신 실제 프로젝트의 의존성 버전에 맞는 자료를 모은다. 첫 구현은 사용자가 지정한 로컬 문서나 검토한 공식 문서만 대상으로 한다. 원격 검색은 별도 opt-in capability로 추가한다.

각 조각에 라이브러리/버전, 원문 위치, 수집일, 필요한 발췌, 미확인 호환성을 남긴다. runtime으로 외부 웹페이지의 명령을 실행하지 않는다. 문서 조회를 이유로 auth 파일이나 비공개 소스 전체를 검색 서비스로 보내지 않는다. 문서는 코드 검증을 대신하는 증거가 아니다.

**평가:** 구버전 API를 최신 API로 잘못 바꾸는 fixture, 로컬 문서와 웹 문서가 충돌하는 사례, 출처가 없는 답변을 확인한다.

### C06 — Provider Contract/Fitness Matrix

**출발점:** OMO의 category/model 분리, Aider의 모델별 edit 설정 및 역할 분리. 모델 상품 순위가 아니라 Weavra 계약과의 적합성을 측정한다.[A7][A17]

기존 측정/예산을 재사용하며 Provider + model + 실제 요청 설정 + tool schema revision을 한 조합으로 기록한다. CommandCode 경유 DeepSeek와 다른 endpoint를 같은 검증 결과로 합치지 않는다.

대표 과제는 tool call 유효성, strict stale 후 재읽기, AC ID 제출, read-only 거부, cancellation, usage 누락 처리다. transport 오류, auth 오류, schema 오류, 작업 오답을 분리한다. 형식 오류를 줄이는 prompt/tool 설명 개선은 가능하지만 required field를 빼거나 자연어 성공을 PASS로 받아들이지는 않는다.

처음에는 자동 모델 교체가 아니라 ‘이 역할에 검증한 조합’을 사용자에게 보여 주는 매트릭스로 시작한다. 예산이 부족하다고 Reviewer를 없애거나 run 중에 무통보 fallback하지 않는다. 교체가 필요하면 별도 명시적 선택과 새 attempt/run의 provenance·evidence 경계를 설계한다.

**평가:** 동일 fixture 반복에서의 실제 성공률·잘못된 완료·비용·지연. 미측정은 UNKNOWN이며 단순 token 0으로 보정하지 않는다.

### C07 — T3 Code Host Bridge

**출발점:** Codex App Server의 양방향 통신 패턴과 T3의 환경 소유 실행·adapter 경계.[A2][A28]

T3를 UI 우선안으로 유지한다. 기존 Pi Extension의 알림 문자열을 파싱하는 대신 Weavra에 필요한 작은 구조화 계약을 설계한다.

```text
UI 요청: 실행 제안 확인, Run 시작, 상태 구독, 승인 응답, 취소
Runtime 응답: 접수 ID, Run ID, 단계, 역할, 증거, 사용량, 종료/정리 상태
```

필수 사항은 protocol version/capabilities, project/session/run 매핑, request idempotency, snapshot + sequence 기반 재연결, 승인 expiry와 일회성 소비, 취소 완료와 프로세스 종료의 구분이다. 소켓을 인증했다고 모든 작업을 승인하지 않는다.

Weavra 상태의 원본은 Runtime에 남긴다. T3의 event log를 Weavra 완료 권한으로 취급하지 않는다. 지원하지 않는 rollback/revert/자동 commit 기능은 UI와 backend 양쪽에서 거절한다. 단순 모델 응답 종료를 Run 완료로 표시하지 않는다. T3의 실제 adapter 계약에 맞춰 연결하되, Codex인 척하는 구현이나 두 개의 Kernel은 만들지 않는다.

처음에는 로컬 연결부터 검증한다. 원격·모바일 확장은 인증·재연결·중복 요청·승인 재생 방지까지 통과한 뒤 추가한다. Codex의 실험적 전송 방식을 그대로 안정성 보장으로 수입하지 않는다.

### C08 — Jev Browser Explorer → Regression Evidence

**출발점:** Jev Ultrafast는 관찰한 element table에서 행동과 대상을 선택하고, 입력 문자열은 별도 작은 모델이 생성한다. DONE에는 독립 확인이 필요하며 현재 MVP에는 iframe/shadow roots/canvas/uploads 등 제한이 있다.[A29]

초기 목표는 로컬 테스트 앱의 탐색·재현이다. 고정된 시나리오는 등록된 테스트로 검증하고, 알려지지 않은 UI 문제를 Jev가 찾아낸 뒤 재현 절차를 회귀 테스트 후보로 남긴다. 화면 탐색 결과를 검증 없이 executable test로 자동 신뢰하지 않는다.

Browser adapter는 navigation/action/target/final text/계정 범위/제출 동작을 통제해야 한다. 페이지 fingerprint는 최신성 근거이지 실행 권한이 아니다. 텍스트가 act 내부에서 생성되는 경로라면 최종 값이 실제 입력되기 전 검사할 수 있는 seam이 필요하다.

기존 Chrome 프로필을 기본으로 공유하지 않는다. 격리 프로필 연결 가능 여부부터 확인하고 불가능하면 통합을 보류한다. 운영 서비스·개인 계정·업로드·삭제는 초기 범위에서 제외한다. URL 허용만으로 iframe/redirect/subresource/데이터 유출을 모두 통제했다고 주장하지 않는다.

Jev는 T3에 직결하지 않고 Weavra 소유 adapter 뒤에 둔다. 브라우저 작업이 자체적으로 COMPLETE를 선언하거나 파일 삭제용 R3 승인을 재사용하지 않는다.

## 5. 지금 넣지 않을 기능

| 후보 | 보류하는 이유 | 재검토 조건 |
|---|---|---|
| 병렬 팀·상시 PM/Architect/QA 다수 | single-writer와 수명주기·증거 의미가 복잡해짐 | 순차 baseline과 충돌·통합 검증 설계 확보 |
| 무제한 goal continuation | 실패·비용·종료 경계를 흐림 | 제한된 복구 루프의 실제 효과부터 확인 |
| 외부 CLI 전체를 worker로 위임 | 내부 tool/hooks/자격증명이 Runtime 정책 밖에서 동작할 수 있음 | OS 격리·adapter 계약·개별 행동 통제 검증 |
| 임의 MCP·Skill 자동 설치 | 설치/실행/데이터 전송 권한이 추가됨 | 좁은 필요 기능과 reviewed registry 확보 |
| 대규모 장기 기억·벡터 DB | stale 사실과 정책 오염, 운영 복잡성 | 작은 출처 기반 facts pack이 효과가 있을 때 |
| AST rewrite·LSP rename | 여러 파일 mutation과 partial apply 계약이 필요 | preview → scoped apply → fresh evidence 설계 후 |
| DAP debugger·persistent eval | 평가식·프로세스 실행이 읽기 전용이 아닐 수 있음 | debug 대상·명령·자격증명·cleanup을 제한한 sandbox |
| 자동 commit/merge/reset/rollback | 현재 명시적 운영 방향과 충돌 | 본 제안에는 포함하지 않음 |

## 6. 추천 진행 순서

현재 Weavra의 확정 상태와 이 조사 문서를 함께 반영한 실행 순서는 다음과 같다.

```text
V0.4C  Verifier Sandbox
   ↓
V0.5A  C01 Task Context Pack / Repo Map
   ↓
V0.5B  C03 Task Recipes / Reviewed Skill Packs
   ↓
V0.5C  C02 Bounded Verification Repair
   ↓
V0.5D  C04 Impact-aware Review Pack
        + C05 Versioned Documentation Pack
   ↓
V0.6A  C07 T3 Code Host Bridge
   ↓
V0.6B  C06 Provider Contract/Fitness Matrix
   ↓
V0.6C  C08 Jev Browser Explorer → Regression Evidence
   ↓
Facts / Capability Broker
   ↓
COMPLEX / Parallel
```

### V0.4C — 기존 안전 경계 우선

V0.4B는 LOG-067에서 CLOSED됐으므로 재구현하지 않는다. 다음은 Verifier Sandbox다. 등록 verifier의 source integrity와 registration trust는 확보했지만, verifier process의 network/filesystem/process 접근을 OS 수준으로 제한했다고 아직 주장할 수 없다. sandbox unavailable 시 silent host fallback을 허용하지 않고, credential 비노출·cleanup·지원 OS 차이를 명시적으로 다룬다.

### V0.5A — C01 Task Context Pack / Repo Map

새 explore agent보다 먼저 기존 `runtime_list_files`, read/search, LSP, instruction snapshot 결과를 작업별 bounded pack으로 조합한다. 관련 파일 발견률·중복 read·입력 token·성공률을 함께 측정하고, pack의 오래된 snippet을 mutation authority로 사용하지 않는다.

### V0.5B — C03 Task Recipes / Reviewed Skill Packs

bugfix, safe refactor, test addition, read-only investigation을 우선 recipe로 둔다. recipe는 실행 엔진이 아니라 기존 Plan Preview와 frozen Task Contract를 만드는 reviewed data template이며, 임의 shell·설치·hook·권한 부여를 포함하지 않는다.

### V0.5C — C02 Bounded Verification Repair

초기 범위는 **opt-in STANDARD/EDIT/R1, 최대 1회 repair**다. 허용된 assertion failure만 새 Developer attempt로 되돌리고 Provider/Auth/Policy/Storage/Cleanup/Cancel/R3/READ_ONLY/unknown failure는 종료한다. 이전 failure evidence와 budget은 보존하고 stale review/check/receipt는 재사용하지 않는다.

### V0.5D — C04 Impact-aware Review + C05 Versioned Documentation

C01의 symbol/caller/related-test 문맥을 Reviewer 입력으로 재선별하고, 필요할 때 실제 dependency version에 맞는 reviewed local/official docs를 붙인다. 추가 evidence는 advisory이며 Reviewer나 문서 자체가 completion authority가 되지 않는다.

### V0.6A — C07 T3 Code Host Bridge

T3 Code를 우선 Host/UI로 유지한다. UI 요청은 Plan 확인, Run 시작, 상태 구독, 승인 응답, 취소, evidence/usage 조회, 재연결로 제한하고, Runtime이 Run/Policy/Approval/Completion authority를 계속 소유한다. protocolVersion, capabilities, request idempotency, snapshot+sequence 재연결을 먼저 고정한다.

### V0.6B — C06 Provider Contract/Fitness Matrix

일회성 모델 티어표가 아니라 지속 평가 track으로 만든다. Provider + model + endpoint + thinking + tool schema revision을 같은 fixture/budget/policy 조건으로 비교하고 tool schema, stale recovery, AC 제출, read-only 거부, cancellation, usage reporting을 분리 측정한다. 자동 fallback은 아직 도입하지 않는다.

### V0.6C — C08 Jev Browser Explorer → Regression Evidence

초기는 local test app, isolated browser profile, no personal account/upload/delete/production으로 제한한다. Jev의 탐색/DONE은 완료 권한이 아니며, 재현 절차를 registered regression evidence 후보로 변환한 뒤 독립 Verifier가 판정한다. Browser action policy와 V0.4C 격리 경계가 선행 조건이다.

### 이후

Facts Pack과 Capability Broker는 실제 context/tool 규모가 커졌을 때 도입한다. COMPLEX/Parallel은 Task/file ownership, integration verification, budget/eval baseline이 충분히 쌓인 뒤 마지막에 연다. T3 protocol 설계와 Provider fixture 축적은 앞 단계와 병행 조사할 수 있지만, 이 순서의 authority/완료 조건을 건너뛰는 근거가 되지 않는다.

## 7. 평가 계획

현재 eval adapter와 deterministic fixture를 출발점으로 쓴다. baseline이 없는 상태에서 병렬 agent나 새 모델을 동시에 추가하면 원인을 구분하기 어렵다.[W1][W2]

- 같은 baseline commit, 모델/provider/thinking, fixture, 정책, 등록 check, 예산을 고정한다.
- 기능 하나만 바꾼 대조 실행을 한다. 모델과 harness를 동시에 바꾸지 않는다.
- 정상 지원 과제와 기대 거부/취소 과제를 별도 집계한다.
- 최종 정답 oracle은 구현 agent가 수정할 수 없는 위치에 둔다.
- 실제 Provider 평가는 opt-in으로 실행하며 유료 호출을 일반 CI에 묵시적으로 붙이지 않는다.

핵심 지표는 지원 과제 성공률, 잘못된 완료 판정, 실제 재작업, token/latency, 관련 파일 발견률, 리뷰 오탐, cancellation/cleanup이다. 토큰 절감이 있어도 성공률이 떨어지면 이득이라고 단정하지 않는다. 관측된 false completion 0은 모든 입력에서의 보장을 뜻하지 않는다.

## 8. 설계 요약

```text
T3 Code
   ↓ 구조화된 Host Bridge
Weavra Kernel / Policy / State / Approval / Budget
   ├─ Task Recipe → 기존 frozen Task Contract
   ├─ Task Context Pack ← 기존 list/search/LSP
   ├─ Developer
   ├─ Registered Verifier ← 보호된 oracle / sandbox
   │      └─ 허용된 경우에만 bounded repair → 새 attempt
   ├─ Independent Reviewer ← Impact Review Pack
   ├─ Evidence Pack / 실제 비교 평가
   └─ 선택적 Browser Adapter → Jev → 독립 결과 검증
```

**최종 권고: 에이전트 수보다 ‘문맥 품질 + 제한된 실패 복구 + 반복 절차 + 명확한 제어 화면’을 먼저 강화한다.**

## 9. 근거 자료

공식 문서·저장소를 2026-09-18에 확인했다. 외부 프로젝트 링크는 실시간 문서이며 코드 이식 때 선택 revision을 고정해야 한다. 기능 개념을 참고한 것이며 전체 코드 감사·보안성·성능·현재 계정 사용 가능 여부를 검증한 것은 아니다.

### Weavra 기준 소스

[W0]: https://github.com/kjg8619/pi/commit/971d4c30daf20ee6e92cf3d840098eb68fffd05f
[W1]: https://github.com/kjg8619/pi/blob/971d4c30daf20ee6e92cf3d840098eb68fffd05f/README.md
[W2]: https://github.com/kjg8619/pi/blob/971d4c30daf20ee6e92cf3d840098eb68fffd05f/docs/WEAVRA_ROADMAP_2026-09-17.md
[W3]: https://github.com/kjg8619/pi/blob/971d4c30daf20ee6e92cf3d840098eb68fffd05f/packages/company-runtime/src/kernel.ts#L855-L1120
[W4]: https://github.com/kjg8619/pi/blob/656fc19fe575eab324f4d12ce968bf7a8cd984e2/docs/WORK_LOG.md#현재-요약

- [검토 커밋][W0]
- [현재 capability와 설치·검증 경계][W1]
- [조사 기준의 단계별 로드맵][W2]
- [검증 실패와 REVISE 상태 전이][W3]
- [게시 시점의 V0.4B 상태와 남은 검증][W4]

### 외부 1차 자료

[A1]: https://code.claude.com/docs/en/sub-agents
[A2]: https://developers.openai.com/codex/app-server/
[A3]: https://geminicli.com/docs/reference/policy-engine/
[A4]: https://opencode.ai/docs/agents/
[A5]: https://aider.chat/docs/repomap.html
[A6]: https://aider.chat/docs/usage/lint-test.html
[A7]: https://aider.chat/docs/usage/modes.html
[A8]: https://cursor.com/docs
[A9]: https://docs.devin.ai/desktop/context-awareness/fast-context
[A10]: https://docs.devin.ai/desktop/cascade/workflows
[A11]: https://docs.cline.bot/core-workflows/plan-and-act
[A12]: https://docs.cline.bot/customization/cline-rules
[A13]: https://github.com/Kilo-Org/kilocode
[A14]: https://docs.continue.dev/
[A15]: https://github.com/RooCodeInc/Roo-Code
[A16]: https://github.com/YanwuZeng/omp
[A17]: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/overview.md
[A18]: https://kiro.dev/docs/specs/
[A19]: https://github.github.io/spec-kit/
[A20]: https://github.com/Fission-AI/OpenSpec
[A21]: https://github.com/obra/superpowers
[A22]: https://docs.devin.ai/product-guides/creating-playbooks
[A23]: https://docs.openhands.dev/sdk
[A24]: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent
[A25]: https://docs.coderabbit.ai/
[A26]: https://www.greptile.com/docs/introduction
[A27]: https://mini-swe-agent.com/latest/
[A28]: https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md
[A29]: https://github.com/browser-use/jev-ultrafast

| 자료 | 공식 출처 |
|---|---|
| 역할별 문맥 | [Claude Code][A1] |
| Host 프로토콜 | [Codex App Server][A2], [T3 Architecture][A28] |
| 정책·역할 설정 | [Gemini CLI][A3], [OpenCode][A4] |
| 문맥·복구 | [Aider Repo Map][A5], [Lint/Test][A6], [Modes][A7] |
| IDE UX | [Cursor][A8], [Fast Context][A9], [Workflows][A10] |
| IDE 설정 | [Cline Plan/Act][A11], [Cline Rules][A12], [Kilo][A13], [Continue][A14], [Roo][A15] |
| Pi 생태계 | [OMP][A16], [OMO Native/Senpi][A17] |
| 명세·스킬 | [Kiro][A18], [Spec Kit][A19], [OpenSpec][A20], [Superpowers][A21] |
| 클라우드·환경 | [Devin Playbooks][A22], [OpenHands][A23], [Copilot cloud agent][A24] |
| 리뷰·평가 | [CodeRabbit][A25], [Greptile][A26], [mini-SWE-agent][A27] |
| 브라우저 | [Jev Ultrafast][A29] |
