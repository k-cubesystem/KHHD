import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/", ".next/", "out/", "build/", "dist/"],
  },
  {
    rules: {
      "no-console": ["warn", { allow: ["error", "warn", "log"] }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
      "no-var": "error",
      // null: "ignore" — `x != null` 은 null·undefined 를 한 번에 걸러내는 의도적 관용구다.
      // `!==` 로 바꾸면 undefined 가 통과해 동작이 달라진다(예: playbackRate = undefined).
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-duplicate-imports": "error",
    },
  },

  // ── 아래는 파일 성격상 규칙이 성립하지 않는 곳만 좁게 끄는 예외다.
  //    lint 대상에서 빼는 ignores 가 아니라 "해당 규칙만" 해제이므로 나머지 검사는 계속 적용된다.

  {
    // package.json 에 type:"module" 이 없어 .js 는 CommonJS 다. 진단/배포점검용 스크립트와
    // jest.config.js 는 node 로 직접 실행되므로 require() 가 정상 문법이다.
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // logger 자체가 console 래퍼다 — 여기서 console 을 막으면 구현이 불가능하다.
    files: ["lib/utils/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // CLI 스크립트는 stdout 이 출력 수단이다.
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Playwright 픽스처의 use(page) 콜백을 react-hooks 가 React 의 use() 훅으로 오탐한다.
    // e2e/ 에는 React 컴포넌트가 없다.
    files: ["e2e/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    // 파티클 엔진의 spawn/spawnAura 는 Math.random() 으로 입자를 흩뿌리는 게 존재 이유다.
    // 두 함수는 useImperativeHandle 메서드와 rAF 루프에서만 호출되고 렌더 중엔 실행되지 않는데,
    // 컴파일러가 그걸 증명하지 못해 38건을 purity 위반으로 오탐한다.
    files: ["components/shrine/scene/EffectsCanvas.tsx"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  {
    // 데이터 적재 이펙트 — 「적재 시작」과 「로딩 표시」가 같은 프레임이어야 이전 결과가
    // 남아 있는 것처럼 보이지 않는다. 컴파일러 규칙은 그 한 번의 추가 렌더를 지적하는
    // 성능 권고이지 정확성 결함이 아니고, 이 다섯은 결제 복귀·어드민 지표·보상 시트라
    // 재작성 위험이 이득보다 크다(2026-08-26 게이트 승격 시 유예).
    //
    // 🔴 새 코드는 이 목록에 추가하지 말 것. 클라이언트 전용 값을 하이드레이션 뒤에 읽는
    //    경우라면 `hooks/use-hydrated.ts` 의 useHydrated() 를 쓴다 — 그 목적으로 만든 훅이다.
    //    (React Compiler 규칙은 eslint-disable 주석을 무시하므로 예외는 여기에만 적을 수 있다.)
    files: [
      "app/protected/membership/success/page.tsx",
      "components/admin/recent-activity-live.tsx",
      "components/admin/traffic-chart.tsx",
      "components/analysis/journey-reward-sheet.tsx",
      "components/shared/SajuLoadingOverlay.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // 신위 편집 드래그 핸들러(onPointerDown) — ref 변형과 포인터 캡처가 얽혀 컴파일러가
    // 수동 메모이제이션을 보존하지 못한다. 이 파일은 드래그·접지에서 여러 번 사고가 났던
    // 자리라 규칙을 맞추려는 재작성이 이득보다 위험하다(2026-08-26).
    files: ["components/shrine/scene/ShrineRoomClient.tsx"],
    rules: {
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    // next/image 가 다룰 수 없거나 다뤄선 안 되는 소스만 <img> 로 그린다(2026-08-26).
    //  · wallpaper-card — 프리미엄 원본은 **1시간 만료 서명 URL** 이다. next/image 가
    //    최적화 캐시에 넣으면 만료된 URL 을 계속 내주거나 사설 자산이 캐시에 남는다.
    //  · viral-share-button — /api/og 가 그 자리에서 만들어 주는 이미지다. 이미 최종 산출물이라
    //    한 번 더 최적화할 이유가 없고 URL 이 매번 다르다.
    //  · image-capture — 사용자가 방금 찍은 사진의 blob:/data: URL. next/image 가 처리하지 못한다.
    //  · AmbientVideo — 모션 최소화일 때의 포스터 폴백. 영상 대체 경로라 같은 소스를 그대로 쓴다.
    files: [
      "components/analysis/wallpaper-card.tsx",
      "components/share/viral-share-button.tsx",
      "components/studio/image-capture.tsx",
      "components/shared/AmbientVideo.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
