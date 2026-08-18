/**
 * `@testing-library/jest-dom` 매처 타입을 **전역으로** 물린다.
 *
 * 🔴 `jest.setup.js` 가 런타임에는 매처를 등록하지만, 그 파일이 `.js` 라 TypeScript 는 모른다.
 *    그래서 `toBeInTheDocument()` 같은 매처가 jest 는 통과하는데 `tsc` 만 깨졌다
 *    (2026-08-18 실측 — 어드민 드로어 테스트 한 파일에서 12건).
 *    테스트마다 import 를 넣는 대신 여기서 한 번만 물린다.
 */
import '@testing-library/jest-dom'
