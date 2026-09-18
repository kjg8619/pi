# Weavra V0.3F — Measurement & Evidence Smoke

- 작성일: 2026-09-18 (KST), 실행 11:40–11:42 KST.
- 소스: devlop `6c81b21de9548306bd37982b32bcb55c7ec3598c` + 미커밋 V0.3F working tree.
- 환경: macOS/arm64, Node 26.7.0. Weavra worker: `commandcode / deepseek/deepseek-v4.1-flash`; 교차: `codex-lb / gpt-6-astra`.
- fixture: V0.3E 2 AC greeting fixture(`Fix the greeting typo.` / `Preserve the existing exported greet(name) API and punctuation.`), STANDARD/EDIT, required regression check, `budget.max_worker_invocations=4`.

## 결과

| run | 판정 | measurement | budget | 비고 |
|---|---|---|---|---|
| DeepSeek 1차 | FAILED(provider transport, 모델 상호작용 중) | Developer 16,409 tokens, 10.9s, 6 turns, 6 tools(usage source=provider) | 1/4 | partial change(2줄) 보존·rollback 없음, failure category PROVIDER, AC 결과 UNKNOWN |
| DeepSeek 2차(재시도) | **COMPLETED** | Developer 13,466 / Reviewer 7,357 tokens; 8.4s + 5.7s; 5+2 turns; 6+3 tools | 2/4, 20,823 reported tokens | AC-001/AC-002 MET, Reviewer PASS(독립), checks PASS×2, cleanup confirmed |
| GPT 교차 | **COMPLETED** | 2 workers, 11,824 reported tokens, 6 tools | 2/4 | 동일 Evidence Pack shape, instrumentation 회귀 없음 |

- Evidence Pack(2차)에 담긴 provenance: runtime commit `6c81b21de`, CLI bundle sha256 `08e7f984…`(mtime 2026-09-16, version 0.85.1), target HEAD `048ef3bb…`, config digest, contract digest `sha256:985e45b7…`, capturedAt.
- UNKNOWN 처리 확인: `providerThinkingLevel`은 provider가 echo하지 않아 `thinking UNKNOWN`, cost는 `Estimated cost: UNKNOWN`(0 표시 없음), CLI build commit은 관측 불가라 표시하지 않았다(mtime을 commit으로 부르지 않음).
- 1차 실패 run은 §12/§18 semantics(측정 실패·provider 실패가 기존 결과나 partial changes를 왜곡하지 않음)를 그대로 보여준다.

## NOT VERIFIED

- Plain Pi vs Weavra 실제 비교 실행(adapter는 deterministic test로만 검증), 20개 corpus 확장, repetition 반복, telemetry 외부 exporter, 실제 가격/비용.
- R2/R3 run의 measurement·evidence pack은 이번에 실행하지 않았다(자동 fixture로만 검증).
