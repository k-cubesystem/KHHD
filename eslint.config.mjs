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
];

export default eslintConfig;
