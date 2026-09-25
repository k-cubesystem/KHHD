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
  testPathIgnorePatterns: ['[/\\\\]node_modules[/\\\\]', '[/\\\\]e2e[/\\\\]'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

// react-markdown 과 그 unified 생태계는 ESM-only 라 node_modules 안이라도 변환해야 실제 마크다운 산출물을 검증할 수 있다.
// next/jest 는 사용자 transformIgnorePatterns 를 «덧붙이기»만 하므로(패턴은 OR) 해석된 설정 위에서 교체한다.
const ESM_PACKAGES = [
  'react-markdown',
  'remark-[^/]+',
  'unified',
  'bail',
  'trough',
  'is-plain-obj',
  'devlop',
  'zwitch',
  'ccount',
  'longest-streak',
  'trim-lines',
  'vfile(-message)?',
  'unist-util-[^/]+',
  'mdast-util-[^/]+',
  'hast-util-[^/]+',
  'micromark(-[^/]+)?',
  'decode-named-character-reference',
  'character-entities(-[^/]+)?',
  'character-reference-invalid',
  'parse-entities',
  'stringify-entities',
  'is-(alphabetical|alphanumerical|decimal|hexadecimal)',
  'property-information',
  '(space|comma)-separated-tokens',
  'html-url-attributes',
  'estree-util-[^/]+',
]

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)()
  return {
    ...config,
    transformIgnorePatterns: [
      `/node_modules/(?!(${ESM_PACKAGES.join('|')})/)`,
      ...config.transformIgnorePatterns.filter((pattern) => !pattern.startsWith('/node_modules/')),
    ],
  }
}
