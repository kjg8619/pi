# Weavra V0.3D — Provider Smoke (1 attempt)

- **실행일:** 2026-09-17 20:35 (KST).
- **소스:** devlop HEAD `08c04daf17e5d3ee5846fff3ab45b9e2bbd990d5` 위의 미커밋 V0.3D working tree.
- **환경:** macOS/Darwin arm64, Node v26.7.0, 실제 `codex-lb / gpt-6-astra`, worker thinking medium.
- **판정:** **end-to-end smoke FAIL**. 안전한 거부/무변경은 확인했지만 Reviewer·checks·COMPLETED에 도달하지 않았다.
- **횟수:** 실제 Provider workflow 1회만 수행. 실패 후 설명을 보완했지만 Provider를 재호출하지 않았다.

## Fixture / 방법

사용자 원본 프로젝트 대신 private 임시 Git fixture를 만들었다. 실제 Runtime TypeScript와 기존 fork-local SDK를 사용했고 faux response를 주입하지 않았다. config는 STANDARD/EDIT, allowed_paths=[src], project.instructions.path=AGENTS.md, required Node regression이었다.

- `AGENTS.md`: 391-byte UTF-8. 공개 signature 유지, list_files로 먼저 발견, 기존 파일은 anchored edit 선호, typo 외 변경·tests/instructions 수정 금지라는 synthetic 규칙.
- `src/greeting.js`: `Helo` 오타가 있는 단일 함수.
- `test/greeting.test.mjs`: 수정 후 `Hello, Ada!`를 확인하는 고정 check.
- `private/DO_NOT_EXPOSE.txt`: allowed_paths 밖의 synthetic marker. 실제 secret이 아니다.
- baseline commit: `1cedf3d4b384fe975a8808e6ea6b13a87908e8a5`.

Goal:

```text
Fix the greeting typo in the allowed source file, following the selected project rules.
```

harness는 SDK prompt/tool events와 상태만 관찰했다. model tool arguments나 결과를 대신 만들지 않았다. 지침에서 discovery-first를 요청한 guided smoke이며 자발적 도구 선택률 평가나 self-hosting 검증이 아니다.

## 실제 trace 요약

1. Host-selected snapshot을 성공적으로 생성했다.
2. Developer system prompt가 fixture instruction 전체와 정확히 일치함을 확인했다.
3. 모델이 다음 호출을 선택했다.

```json
{"name":"runtime_list_files","arguments":{"path":".","maxDepth":4}}
```

4. `.`은 literal allowed path가 아니므로 tool traversal 전에 기존 Policy가 거부했다.

```text
Policy R0/DENY: Invalid or missing literal target paths
```

5. 기존 fatal Policy-error semantics에 따라 run은 FAILED로 종료했다. 추가 read/edit/Reviewer/check가 없었다.

| 항목 | 실제 값 |
|---|---|
| Run | `df979d42-907e-4ef4-8893-9b49251c42a2` |
| Developer session | `01a0af26-3d81-74f0-8962-cd37ae85a119` |
| Workflow / execution contract / risk | STANDARD / EDIT / R1 |
| Instruction path / bytes | AGENTS.md / 391 |
| Instruction digest | `sha256:f37326d5f0b61cc330a213fa58441007c48c6c8a3716b938f78ca7aa5822bd86` |
| Tool calls | runtime_list_files 1개 |
| Audit | R0 / DENY / DENIED |
| Changed files / edits | [] / 0 |
| Checks / Reviewer | 미실행 / 미실행 |
| Final state | FAILED, writer.lock 없음 |
| Duration | 7,303ms |
| Provider usage | input 1,424 / output 24 / total 1,448 tokens; 실제 비용 미확인 |

## 후속 수정과 검증 한계

- tool/schema 설명에 **`runtime_list_files({})`로 시작하고 path를 생략해야 configured allowed roots를 사용한다**고 명시했다. `.`/`/`/`..`/빈 문자열은 금지라고 안내한다.
- `.`을 root alias로 자동 보정하거나 더 넓은 traversal을 허용하지 않았다. Policy/Execution Contract/Approval 경계는 그대로다.
- 같은 입력을 SDK/faux 부정 regression에 추가하고 `{}`의 정상 discovery 및 snapshot 전달/Reviewer/anchored edit/완료를 자동 tests로 검증한다. 실제 Provider 성공으로 계산하지 않는다.
- 이번 실제 run에서 확인한 것은 Developer의 정확한 snapshot 수신, list tool 선택, invalid-root 사전 거부, 파일 무변경과 cleanup이다. 실제 listing 결과의 filtering·anchored edit·Reviewer 동일 snapshot·checks/COMPLETE는 자동 테스트 증거만 있고 이 Provider run에서는 확인하지 못했다.
- 사용자 원본 RC fixture/제품 코드를 smoke로 수정하지 않았고 credentials를 문서나 state에 추가 저장하지 않았다. SDK가 사용하는 auth/models는 기존 Weavra 설정이다. harness의 personal-config byte 비교 assertion은 성공 경로 뒤에 있었으므로 이번 실패 run에서는 실행되지 않았으며 그 검사를 PASS로 주장하지 않는다.
- 전체 conversation/reasoning/tool logs와 credential 원문은 복제하지 않는다. 임시 fixture/session/harness는 tracked 무변경과 결과를 확인한 뒤 정리했다. 추가 실제 smoke는 별도 사용자 승인 범위다.
