const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // next.config.js와 .env 파일을 로드하기 위한 경로
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // 워크트리(.claude/worktrees/**)는 저장소 전체 복제본이라 같은 테스트가 두 번 잡히고,
  // e2e는 Playwright 전용이라 jest에서 import부터 실패한다.
  // 두 경로를 빼지 않으면 게이트가 858개 실패로 항상 빨간불이 되어 아무것도 못 잡는다.
  testPathIgnorePatterns: ['/node_modules/', '/\.claude/', '/e2e/', '/\.next/'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
