# ADR 0001: Paint 경계 감지 — frame 마커 rAF + 커밋 microtask 하이브리드

- Status: Accepted
- Date: 2026-07-10

## Context and Problem Statement

recorder 에서 paint 를 나누는 기준은 실제 browser paint 가 아니라 **React 가 작업을 끝내고 메인 스레드를
양보한 시점(task 경계)** 이다

기존 구현은 전역 `MessageChannel` 을 monkey-patching(상속 클래스로 덮어쓰기)해
React 스케줄러 메시지의 **배달 시점**에 경계를 기록했다.

이 방식을 택했던 근거는 React 의 업데이트 실행 구조다. React 는 업데이트를 두 경로로
처리한다:

- **discrete 이벤트(click 등)의 setState** — 그 이벤트 task 안에서 **즉시 동기 렌더+커밋**
- **나머지(타이머·Promise·continuous 등)의 setState** — 스케줄러에 예약해두고,
  스케줄러가 `MessageChannel` 로 만든 **별도 task 에서 나중에 배치 실행**.
  커밋 후의 후속 작업(passive effect flush)도 같은 채널로 예약된다.

즉 어느 경로든 커밋이 일어나면 그 뒤에 스케줄러 메시지가 따라오므로, 메시지 **배달**
시점은 "React 가 작업을 끝내고 양보했다가 재개한 순간 = 그 사이에 브라우저가 paint 할
기회를 가진 뒤"로 읽혔다. 채널이 비공개라 관찰 수단은 전역 패치뿐이었다.
그러나 다음 이유로 실패한다:

1. **우선순위 역전 레이스** — Blink 는 input task 와 discrete 입력 직후의 rendering task 를
   `kHighestPriority(1)` 로 승격하고, message task 는 `kNormalPriority(7)` 다. 경계 신호가
   후속 task 의 커밋에 추월당해 서로 다른 렌더주기가 한 그룹으로 병합된다.
   (`click → rAF flushSync → message 배달` 순서를 e2e 로 재현·검증)
2. **전역 패치의 오염** — 누가 만든 채널이든 메시지가 경계를 발화시켜 가짜 경계가 생긴다.
3. **설치 순서 의존** — React 스케줄러의 채널 생성(모듈 로드 시점)보다 먼저 패치돼야 한다.

## Decision Drivers

- 경계가 큐 순서(스케줄링 운)에 의존하지 않고 실행 순서 불변식으로 보장될 것
- 한 input task 가 여러 이벤트를 연쇄 디스패치하는 경우(pointerdown→mousedown,
  pointerup→mouseup→click — discrete setState 는 디스패치마다 동기 커밋됨)를 한 그룹으로 묶을 것
- 전역 패치·React 내부 구현 의존 없음
- 엔진 독립적일 것 (Blink·WebKit 소스로 전제 검증)

## Considered Options

1. **MessageChannel 배달 감지** (기존) — 위 1~3 으로 기각.
2. **커밋 시점 coalesced microtask 단독** — 레이스는 해결(microtask 는 다음 task 전에 반드시
   drain). 그러나 microtask checkpoint 는 task 단위가 아니라 **리스너 호출 단위**로 돌아,
   같은 input task 의 연쇄 디스패치 커밋들이 쪼개진다(오버스플릿).
3. **마커 선등록 rAF 단독** — frame 단위 경계. 같은 frame 안의 서로 다른 task
   (스케줄러 연쇄 커밋 등)가 전부 병합된다(정밀도 손실). 상시 루프는 브라우저의
   rendering 스킵 최적화(HTML spec "Unnecessary rendering")도 무력화한다.
4. **timeStamp task-signature 병합** — 같은 WebInputEvent 파생 이벤트들이 원본 timeStamp 를
   상속함(Blink `mouse_event_manager.cc`, WebKit `MouseEvent.cpp`)을 이용해 task 단위로
   잠정 경계를 병합. task 정밀도가 가장 높지만 구성 요소가 많다.
   → task 단위 정밀도가 필요해지면 재검토할 대안으로 보존.
5. **하이브리드: 커밋 문맥별로 2·3 을 분업** ← 채택

## Decision Outcome

**Option 5.** 커밋 시점의 문맥(`window.event`)으로 경로를 나눈다:

- **input dispatch 중 커밋** (`window.event` 가 MessageEvent 아닌 이벤트)
  → **frame 마커 rAF** 가 그룹을 닫는다. 마커는 녹화 시작 시 등록되고 각 rendering task
  안에서 자기 재등록하므로, 나중 task 에서 등록되는 앱 rAF 보다 항상 먼저 실행된다
  (rAF 콜백은 등록 순서 실행). 같은 task 의 연쇄 디스패치 커밋들이 자연히 병합된다.
- **그 외 커밋** (스케줄러/타이머/rAF — `window.event` 없거나 MessageEvent)
  → **coalesced microtask** 가 커밋한 task 끝에서 즉시 닫는다. 이 부류는 React 가
  task 당 한 번에 배치 커밋하므로 microtask 의 약점(연쇄 디스패치)이 구조적으로 없고,
  frame 대기보다 task 단위로 정밀하다.

판별에 legacy API 인 `window.event` 를 사용한다. DOM spec §2.3 이 legacy 로 명시하지만
호환성 때문에 표준화된 API 라 제거 위험은 사실상 없고, React 자신도 자기 이벤트 시스템 밖
업데이트의 우선순위 판별에 같은 방법을 쓴다(`ReactDOMUpdatePriority.js`). 마커 루프는
store 구독으로 녹화 중에만 돌려 관찰자 효과를 녹화 시간으로 한정한다. 마지막 그룹은
`endRecording` 의 trailing flush 가 닫는다.

### Consequences

Positive:

- 경계 보장이 큐 순서가 아니라 동기 실행 순서(커밋→microtask drain, rAF 등록 순서)에
  의존 — 레이스가 구조적으로 없음
- 전역 패치 제거: 가짜 경계·설치 순서 문제 소멸
- production/dev 빌드 차이(passive effect 스케줄 조건)와 무관

Negative (수용한 트레이드오프):

- 같은 frame 안의 다중 discrete 입력은 병합 (frame 단위 정밀도) — 자동화 입력(Playwright)
  에서 발생 가능, 테스트는 클릭 사이 frame 대기로 대응
- 한 rendering task 안에서 여러 rAF 콜백이 각각 커밋하면 쪼개짐 (checkpoint 가 콜백마다
  돌기 때문) — 오버스플릿 방향
- shadow tree 안에서 디스패치된 이벤트는 `window.event` 가 세팅되지 않아(스펙 명시)
  non-dispatch 로 오분류 — 역시 오버스플릿 방향, 잘못 병합되지는 않음
- 녹화 중에는 rAF map 이 비어있지 않아 브라우저의 rendering 스킵 최적화가 무력화됨

## More Information

- 검증: 유닛(fake rAF·microtask 경로), e2e `paint-boundary-race.test.ts`
  (기존 방식은 병합·현 방식은 분리를 재현하는 판별 테스트)
- 근거 소스: Blink `task_priority.h`(우선순위 사다리),
  `main_thread_scheduler_impl.cc`(`kDiscreteInputResponse` rendering 부스트),
  `mouse_event_manager.cc`/WebKit `MouseEvent.cpp`(timeStamp 상속),
  DOM spec §2.3(window.event legacy), HTML spec event loop processing model
  (update the rendering 순서, Unnecessary rendering)
