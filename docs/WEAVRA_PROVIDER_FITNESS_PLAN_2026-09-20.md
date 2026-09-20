# V0.6B — Provider Fitness Matrix 조사·평가 계획

- 작성: 2026-09-20, Asia/Seoul.
- 상태: **조사·계획 완료 / matrix 구현·새 유료 평가 미착수**.
- 선행 조건: V0.6A/C07 bounded closure 후 시작했다. Pi 구현 `fd0f93d58e187d3c83f77424cb4cbf3f7ae8a2a3`의 [exact CI](https://github.com/kjg8619/pi/actions/runs/35491863295) PASS, T3 `09de732fe8b02821ab150fe013f9acf9e93f99bc`의 로컬 전체 gate PASS·devlop CI 미실행은 [WORK_LOG LOG-105](WORK_LOG.md#log-105--2026-09-20-1440-asiaseoul--v06ac07-bounded-closure)에 기록했다.
- 이번 조사에서는 source·기존 evidence·공식 문서를 읽고 secret-free model identity inventory만 실행했다. inference/model-list API, auth 파일/credential 값 조회, 설정 변경, 설치, 자동 모델 선택·fallback은 하지 않았다.

## 1. 문제와 결정

같은 모델 이름이어도 endpoint·API adapter·tool schema·thinking 설정이 다르면 같은 실행 계약이 아니다. 예를 들어 과거 CommandCode DeepSeek는 schema-valid tool을 만들었지만 `task`에 ID 대신 goal을 제출했다. schema 통과를 Task Contract 준수로 계산하면 실제 실패를 숨긴다. 반대로 tool 호출 전 gateway timeout을 모델의 작업 오답으로 계산해도 잘못이다.

**평가 단위는 모델 상품이 아니라 고정된 Provider/model/endpoint/harness 조합이다.** 형식, 의미, 권한, oracle 결과, 가용성, 자원 사용을 분리한다. 모든 판정은 원래 Runtime/Kernel/독립 verifier/oracle을 따른다. 모델의 자연어 완료, JSON 형식, Reviewer PASS만으로 eval PASS를 만들지 않는다. 이 원칙은 기존 [C06 설계](WEAVRA_AGENT_LANDSCAPE_AND_ADOPTION_2026-09-18.md#c06--provider-contractfitness-matrix)를 재사용한다.

## 2. 후보와 현재 근거

2026-09-20 안전한 로컬 inventory는 user `models.json`에서 **provider ID·API·model ID·reasoning boolean만** 출력했다. auth와 endpoint 값은 출력하지 않았고 파일을 변경하지 않았다. 설정 존재는 인증 유효성·현재 가용성·실제 backend identity의 proof가 아니다.

| 별도 cell | 현재 지원/설정 근거 | 실제 Weavra evidence와 미확인 사항 |
|---|---|---|
| Astra relay: `codex-lb / gpt-6-astra / openai-responses` | 현재 custom entry 있음, reasoning=true | 과거 STANDARD·strict/trust/sandbox·bounded repair·Reviewer context 성공 기록 있음. response-model echo/relay upstream identity와 반복 fitness는 UNKNOWN. 개발 하네스의 `openai-codex`와 합치지 않음 |
| CommandCode: `commandcode / deepseek/deepseek-v4.1-flash / openai-completions` | 현재 custom entry 있음, reasoning=true. 역사적 endpoint는 `https://api.commandcode.ai/provider/v1` | 과거 streaming/tools/수정/review 성공과 실패 기록 있음. direct DeepSeek·다른 gateway route의 strict/reasoning 보장을 승계하지 않음 |
| Public OpenAI: `openai / gpt-6-astra / openai-responses` | 현재 hydrated catalog와 public Responses adapter 지원, 공식 문서에 해당 모델 명시 [S1–S3] | 위 custom relay와 별도 후보. 이 조사에서 공식 endpoint의 인증·새 Weavra 실행·반복 fitness를 확인하지 않음 |
| OpenAI Codex: `openai-codex / 명시한 model / openai-codex-responses` | 기존 subscription backend adapter, public API와 다른 endpoint/transport/auth 계약 | 필요 시 별도 cell. 기존 SSE/WebSocket 선택·transport retry와 모델 fallback을 혼동하지 않음. 개발 agent 사용은 Weavra worker proof가 아님 |
| Gemini: `google / 정확한 versioned model / google-generative-ai` | SDK/catalog 지원. `gemini-3.8-flash`, `gemini-3.1-pro-preview`, `gemini-2.5-flash` 등의 지원과 실제 인증은 별개 | custom inventory에 Google entry는 없었으나 built-in auth 부재를 뜻하지 않음. auth·실제 Weavra 품질은 미확인. 이미 준비된 인증과 사용자 실행 승인 시에만 조건부 포함 |
| Vertex / direct DeepSeek / local omlx | 각각 별도 endpoint/API cell. `omlx / Qwen3.8-27B-MLX-4bit / openai-completions` custom entry는 확인됨 | 현재 주 비교에서 제외. 설정된 로컬 모델도 실제 fitness는 UNKNOWN. direct DeepSeek는 기존 문서상 NOT VERIFIED이며 gateway 결과로 채우지 않음 |

Astra의 public model 이름이 현재 공식 문서에 존재해도 역사적 custom alias의 backend를 소급 식별할 수 없다. region, endpoint route, model revision이나 alias mapping이 바뀌면 새 cohort로 남긴다.

### 역사적 실행은 비교 표본이 아니라 출발 근거

- [2026-09-18 CommandCode smoke](WEAVRA_COMMANDCODE_DEEPSEEK_SMOKE_2026-09-18.md): hardening 전 STANDARD **1/5**, QUICK **0/3** 완료. 형식은 유효했지만 identity/protected instruction/unresolved 오류가 있었다. 이후 hardening은 모델 정정을 허용하되 Host가 identity를 고치거나 권한을 완화하지 않았다.
- 같은 문서의 후속 실행: STANDARD **2/3**, QUICK **1/3** 완료. 나머지 3회는 모델 도구 상호작용 전 Provider timeout이었다. 성공 sample에서 identity correction은 **0회**였으므로 실제 correction recovery 성능을 측정했다고 할 수 없다. warm-up 뒤 성공의 인과관계도 입증되지 않았다.
- Astra cross sample은 35,236ms/9,751 tokens, 후속 sample은 32.7s/10,292 tokens로 완료했다. 서로 다른 revision·warm-up 조건의 작은 표본을 순위나 안정적인 성공률로 합산하지 않는다.
- WORK_LOG LOG-084: Astra의 통제된 초기 defect → SELF_CHECK 실패 → fresh bounded repair → 독립 review/test → oracle PASS 1회. **자연 발생 오류 복구율이 아니다.** LOG-091은 actual Reviewer context 성공 1회이며 actual pack on/off 반복 비교가 아니다.
- C07의 새 T3 통합은 **로컬 faux Provider** proof다. Provider fitness sample에 포함하지 않는다. gateway의 configured cost=0도 무료 청구가 아니라 **비용 UNKNOWN**이었다.

## 3. Adapter별 조사 결과

### 서로 다른 세 가지 strict

1. Runtime tool schema/identity 검증.
2. Provider의 constrained JSON sampling.
3. Weavra mutation의 fresh read receipt·digest·anchor 검증.

이 셋은 서로 대체하지 않는다. 현재 Weavra tools의 구조화 제출 성공을 Provider-enforced strict decoding으로 표시하지 않는다. Provider strict 옵션의 `prefer`는 지원하지 않는 schema/model에서 완화될 수 있고 `require`는 로컬에서 거부될 수 있다. Pi의 [strict converter](../packages/ai/src/api/constrained-sampling.ts)는 Provider의 전체 JSON Schema 지원보다 좁고 optional 필드를 required+nullable로 변환한다. emitted schema와 실효 mode를 따로 기록하고, 의미를 바꾼 schema를 같은 조건의 결과로 비교하지 않는다.

### OpenAI / Astra [S1–S5]

- Public Responses, subscription Codex, custom relay는 별도 경로다. 공개 strict schema나 reasoning 지원 문서를 custom relay의 보장으로 사용하지 않는다.
- function calling의 구조화 인자와 structured text 출력은 다른 기능이다. 올바른 JSON에도 잘못된 AC ID, evidence reference, path 또는 답이 들어갈 수 있다. refusal·length truncation·incomplete response는 schema 성공으로 처리하지 않는다.
- reasoning/tool continuation에는 관련 reasoning item과 call/result identity 보존이 필요하다. 현재 generic [message transformation](../packages/ai/src/api/transform-messages.ts)은 errored/aborted assistant turn을 replay에서 제외한다. README의 partial continuation 설명을 중단 지점 그대로의 resume로 해석하지 않는다.
- client abort, upstream generation 중지, 최종 billing, Runtime writer release는 서로 다른 관측이다. interrupted stream은 마지막 usage를 받지 못할 수 있다. 새로운 background response/cancel API를 matrix 때문에 도입하지 않는다.

### CommandCode / DeepSeek [S6–S8]

- gateway는 Chat Completions·Responses·Anthropic route와 model별 endpoint eligibility를 문서화한다. 현재 Weavra 설정은 **Chat Completions**이며 다른 route의 tool/strict 보장을 승계하지 않는다.
- [Chat adapter](../packages/ai/src/api/openai-completions.ts)의 direct-DeepSeek compatibility 감지는 provider/base URL에 의존한다. model 이름만 DeepSeek인 gateway는 같은 thinking/max-token/strict 동작으로 가정하지 않는다.
- direct DeepSeek의 beta strict tool, thinking/tool-choice 제한은 직접 endpoint의 계약이다. 현재 gateway exact alias의 strict enforcement·effective thinking·상한·cancel billing은 별도 검증 전 UNKNOWN이다.
- tool 인자를 Host가 수정해서 성공률을 높이거나 gateway 문제를 숨기는 warm-up/재시도/fallback을 추가하지 않는다. 기존 adapter retry가 있다면 실제 횟수와 시간·usage를 구분해 보고한다.

### Gemini / Vertex [S9–S11]

- Pi의 [Google shared adapter](../packages/ai/src/api/google-shared.ts)는 versioned Gemini major >=3과 schema에 따라 strict tool을 허용한다. `VALIDATED`는 텍스트도 허용할 수 있고 `ANY`는 tool 선택을 강제하므로 서로 다른 실험이다. Gemini 2.5나 unversioned alias의 결과를 같은 strict cell에 합치지 않는다.
- 현재 adapter는 `generateContentStream`을 사용한다. 공식 문서의 Interactions API 기능을 현 Pi 구현으로 표시하지 않는다. generic payload hook이 있다는 것과 first-class structured-text 옵션이 있다는 것도 구분한다.
- Google SDK는 **AbortSignal이 client-only이고 service 작업/과금을 취소하지 않는다**고 명시한다 [S11]. local cancellation의 PASS를 provider-side compute/billing 종료로 표현하면 안 된다.
- reasoning은 output의 일부이고, cache 사용량은 분리된다. thinking disabled 요청도 모델별로 LOW/MINIMAL로 매핑될 수 있으므로 requested/effective 값을 구분한다. 동일 provider/model의 valid signature continuation과 cross-model 전달도 따로 평가한다.

## 4. 기존 구성요소 재사용과 필요한 차이

새 Runtime/Policy/완료 엔진을 만들지 않는다.

- [runWeavraFixture](../packages/evals/src/weavra-harness.ts): 격리 Git fixture, frozen Task Contract, 실제 StandardWorkflow/Kernel/checks, Host-owned oracle, Evidence Pack, cleanup 경로를 재사용한다. oracle은 agent가 편집할 수 없고 Runtime COMPLETED와 독립이다.
- [기존 여섯 fixture](../packages/evals/src/weavra-fixtures.ts): `read-explain`, `read-discover`, `quick-read`, `quick-edit`, `standard-2ac`, `standard-incomplete`. 앞의 read-only oracle은 주로 **파일 불변**을 검사하므로 설명의 의미 정확도 점수가 아니다. 마지막은 약한 check/요구사항 불일치에 대한 **negative false-completion probe**이며 정상 성공률 분모와 분리한다. 유료 비교 전 각 oracle/AC의 의미 적합성을 다시 고정해야 한다.
- [WorkerMeasurement](../packages/company-runtime/src/measurement-types.ts): requested/actual provider/model, optional responseModel, role/attempt, duration, modelTurns, toolCalls/byName, usage provenance, context/reviewer summaries를 재사용한다. reasoning을 total에 두 번 더하지 않고 usage 누락/부분 값은 UNKNOWN으로 남긴다.
- 현재 eval은 두 role에 같은 provider/model을 넣는다. 역할별 교차 모델 비교는 현재 API가 이미 지원하는 것처럼 주장하지 않는다. 우선 동일 조합·독립 session을 기본 cohort로 한다.
- TTFT, 실제 HTTP attempt 수, schema 첫 제출/정정 구분, cancel 단계별 timestamp, per-run 외부 비용은 현 `WeavraEvalResult`가 모두 제공하지 않는다. 후속 구현에서 **eval 결과의 bounded 추가 관측**으로 설계할 항목이지 이미 존재하는 기능이 아니다. 원문 prompt/reasoning/credential을 수집하는 telemetry를 만들지 않는다.

## 5. 필수 평가축 10개

아래는 **실행할 계획**이며 이번에 새로운 fitness 점수를 측정하지 않았다.

| 축 | 과제·관측값 | 판정과 실패 분리 |
|---|---|---|
| 1. Tool schema adherence | 실제 Worker tools의 name/JSON/required/extra fields/enum을 검사. 첫 완성 call과 정정 후 제출을 분리하고 rejected 수·denominator 기록 | 완성된 call 중 schema-valid 비율. malformed/incomplete transport와 의미상 잘못된 identity를 다른 항목으로 기록. unsupported strict schema는 UNSUPPORTED, 조용한 완화 금지 |
| 2. Strict edit 성공 | R1 source read → anchored mutation → 실제 byte oracle. 통제된 stale change 후 재읽기, consumed receipt, protected source 시도 포함 | 첫 수정 성공·소모성 stale 복구·최종 oracle/무권한 무변경을 분리. strict를 compatible로 내리거나 receipt를 Host가 만들어 주지 않음 |
| 3. Task Contract 준수 | 두 개 이상의 frozen AC, ID/중복/누락/정확한 task identity, scope·check mapping과 실제 결과 확인 | 각 AC의 semantic oracle와 contract digest 불변. 자연어 완료·임의 ID·다른 task 결과는 거부. read-only는 불변성과 설명 정확도를 따로 측정 |
| 4. Reviewer format/판정 | 정상/의도된 defect diff, exact run/revision/task/diffDigest, AC별 trusted evidence refs, 독립 session | 첫 valid submit·모델 correction·false PASS/false REVISE·false COMPLETE를 분리. schema-valid review는 정확한 defect detection의 증거가 아님 |
| 5. Cancellation | idle/pre-Run, active model stream, tool 대기, registered check 진행의 취소를 구분. cancel 요청→client abort→agent/check 종료→canonical terminal→writer release 시간 기록 | C07의 pre-Run wire cancel 미지원은 N/A. 지원 경로에서 partial 변경 보존과 cleanup 확인. provider compute/billing 종료는 별도 근거 없으면 UNKNOWN; abort 후 자동 replay/resume 금지 |
| 6. Structured output | tool arguments, handoff/review semantic submit, provider structured text를 서로 다른 subcase로 구분. nullable/optional·중첩·unsupported/refusal/truncation 경계 | SDK에서 노출하지 않는 기능은 UNSUPPORTED/NOT EVALUATED. JSON parse 성공을 schema/semantic/Workflow 성공으로 승격하지 않음 |
| 7. Context pack 효과 | 같은 fixture/contract에서 disabled vs bounded paired runs. context digest/bytes/freshness, 탐색 calls, oracle와 role별 tokens/latency | 품질·authority 불변 조건 아래 차이 보고. truncated/UNKNOWN/stale를 보존. scripted faux A/B를 실제 token 절감이나 모델 개선으로 쓰지 않음 |
| 8. Bounded repair 효과 | STANDARD/EDIT/R1의 통제된 SELF_CHECK 실패에서 disabled vs 1회 bounded repair. 같은 defect·budget·oracle | fresh attempt/session/receipt, failed parent 보존, checks+독립 review+oracle를 확인. 자연 오류 cohort는 별도. R2/R3·일반 retry/resume로 확대하지 않음 |
| 9. Token/call 사용량 | 모든 role/attempt의 provider input/output/cache/reasoning, modelTurns/toolCalls, 가능한 HTTP attempts, 외부 비용 provenance | provider usage 없는 값은 UNKNOWN. reasoning 이중 합산·modelTurns=network requests·configured cost 0=free 금지. 실패/정정/repair 사용량도 누적 |
| 10. Latency | preflight, first provider event/첫 가시 token/첫 tool, worker, check/review, 전체 run, cancel cleanup을 각각 관측 | cold/warm/cache·실패/성공을 분리. timeout도 버리지 않음. 작은 n은 개별 값/median/range를 보고하고 안정적인 p95를 주장하지 않음 |

## 6. 재현 가능한 실행 설계

### 고정 manifest

각 cell/실행은 다음 메타데이터를 묶어 기록한다. 비밀과 raw endpoint query/userinfo는 포함하지 않는다.

- Runtime/SDK commit·package lock digest, OS/Node, fixture·oracle revision/digest, tool schema revision와 실제 emitted schema digest.
- provider, requested/actual/response model(미반환은 UNKNOWN), API adapter, 안전한 endpoint 식별자/route, region, catalog capture date, transport, 기존 retry 정책.
- coding/reasoning profile과 thinking requested/effective, sampling 옵션, tool-choice와 constrained-sampling mode, strict mutation/trust/sandbox, context/repair mode.
- frozen config/Task Contract/registered check digest, risk/workflow, role/attempt/session identity, max revision·worker/run timeout·usage/call 예산, 승인된 외부 비용 상한.
- 실행 시각, 명시한 cold/warm/cache 조건, 모든 scheduled attempt와 종료/실패 단계. auth는 방식/가용 여부만 기록하고 credential을 저장하지 않는다.

### 제안 순서

1. **오프라인 manifest/계약 회귀:** 기존 eval/measurement를 연결하고 malformed schema, stale receipt, 위조 identity/evidence, missing usage, aborted stream과 oracle false-completion 탐지를 deterministic fixture로 확인한다. model ranking용 faux 점수는 만들지 않는다.
2. **명시적 opt-in capability probe:** 승인된 endpoint별 exact model·schema·reasoning/tool continuation·usage/cancel 의미만 작은 상한으로 확인한다. auth/route/schema가 지원되지 않으면 그 cell을 중단하고 UNKNOWN/UNSUPPORTED로 남긴다. 다른 모델로 대신하지 않는다.
3. **기본 actual cohort:** 준비된 Astra relay·CommandCode·public OpenAI 조합을 우선한다. 제안 pilot은 기존 6 fixture × cell당 5회이며, false-completion negative는 별도 표다. 각 실행은 새 격리 checkout/session을 사용하고 cell 순서를 번갈아 배치한다. 5회는 탐색용 수량이지 신뢰할 수 있는 모집단 성공률이 아니다.
4. **별도 paired cohort:** context disabled/bounded 및 repair disabled/1회를 각각 한 변수만 바꿔 비교한다. 기존 frozen Task Contract·검증·oracle·budget은 유지하고 효과값과 실패까지 모두 보고한다. 모드를 한꺼번에 켜고 어느 기능의 효과인지 주장하지 않는다.
5. **조건부 확장:** 이미 인증된 Gemini/Vertex 또는 local omlx를 사용자가 선택한 경우 같은 manifest로 추가한다. 20 fixture corpus·다른 OS·서로 다른 Reviewer model은 독립 후속 범위이며 이번 계획이 자동 실행 승인은 아니다.

현재 Runtime의 worker timeout·revision·budget 설정을 그대로 명시하여 고정한다. 모델별로 같은 이름의 thinking 값을 같은 계산량이라고 가정하지 않는다. Provider별 의미가 다르면 별도 cohort로 나눈다. token/call/금액 상한을 실행 전 승인하고 소진·usage UNKNOWN 때 더 저렴한 모델로 자동 전환하지 않는다. 일반 CI에는 실제 Provider credentials나 paid eval을 넣지 않는다.

### 분모와 결과 표현

- availability: 모델 상호작용에 도달한 runs / 전체 scheduled runs. auth·preflight·rate limit·transport timeout도 전체 결과표에 남긴다.
- behavioral metrics: 해당 관측이 가능한 call/run 수를 분모로 표시한다. 도달하지 못한 단계는 0점이 아니라 NOT REACHED다.
- valid-positive completion: canonical COMPLETED **그리고** independent oracle PASS. falseCompletion은 COMPLETED이면서 oracle FAIL인 별도 치명 항목이다. 의도된 negative probe는 정상 작업의 완료율과 합산하지 않는다.
- 결과 상태는 VERIFIED/PARTIAL/UNKNOWN/UNSUPPORTED/NOT EVALUATED와 evidence 종류(official claim/source contract/faux/historical actual/current actual)를 같이 표시한다. 현재 후보별 새로운 fitness 값은 전부 NOT EVALUATED다.
- 성공 사례만 재시도·선별하지 않는다. 실패 원인을 auth/transport/schema/semantic identity/Policy/task oracle/cancel cleanup/usage unavailable로 나누고 sample 수·날짜·revision을 표시한다. 작은 표본은 모델 순위나 general compatibility 판정이 아니다.

## 7. 구현 착수 조건과 이번 종료선

계획은 구현 착수 판단에 사용할 수 있다. 후속 착수 시 exact endpoint/model·인증·비용 상한, fixture oracle의 의미 적합성, 현재 adapter 계측의 누락을 먼저 고정해야 한다. 아직 새 matrix runner/schema/report UI나 paid cohort는 구현·실행하지 않았다.

후속 matrix의 완료 조건은 (1) 재현 가능한 manifest와 UNKNOWN 보존, (2) 최소 하나의 실제 false-completion 탐지 negative, (3) 10축별 근거/미측정 구분, (4) 명시적으로 승인된 actual sample, (5) 모든 실패·취소·cleanup·비용 제한 기록이다. 필요하지 않은 장기 storage/telemetry/자동 scheduler는 도입하지 않는다.

**자동 Provider fallback, retry/resume 확대, Policy 완화, Reviewer 제거, 새 COMPLETE authority, T3의 모델 자동 교체, Browser product는 이 계획의 구현 범위도 아니다.** 이번 요청은 이 문서에서 멈춘다.

## 8. 출처와 조사 한계

공식 문서는 **2026-09-20 조회한 공개 계약 주장**이다. 실제 endpoint가 이를 이행하는지 이번에 호출하지 않았다. Pi adapter 계약·기존 실험과 구분한다.

- [S1] [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [S2] [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [S3] [OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning)
- [S4] [OpenAI background/cancellation](https://developers.openai.com/api/docs/guides/background)
- [S5] [OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat)
- [S6] [CommandCode Provider API](https://commandcode.ai/docs/provider)
- [S7] [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)
- [S8] [DeepSeek tool calls/strict mode](https://api-docs.deepseek.com/guides/tool_calls)
- [S9] [Google function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [S10] [Google structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [S11] [Google SDK GenerateContentConfig / abortSignal](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html#abortsignal)

로컬 근거는 [Pi AI 계약](../packages/ai/README.md), `packages/ai/src/api/{openai-responses,openai-responses-shared,openai-codex-responses,openai-completions,google-generative-ai,google-vertex,google-shared,constrained-sampling,transform-messages}.ts`, 기존 smoke와 WORK_LOG LOG-081~093, 위 eval/measurement source다. 하네스 README의 aborted-message continuation 설명과 실제 replay 처리의 차이는 계획의 제한으로 기록했고 이 조사에서 무관한 SDK 동작이나 문구를 수정하지 않았다.
