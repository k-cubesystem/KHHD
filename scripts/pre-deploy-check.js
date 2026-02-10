#!/usr/bin/env node

/**
 * 배포 전 체크리스트 자동화 스크립트
 *
 * 실행: node scripts/pre-deploy-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function checkItem(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 메인 체크 함수
async function main() {
  log('\n🚀 해화당 프로젝트 배포 전 체크리스트\n', 'blue');

  let allPassed = true;

  // 1. 환경변수 확인
  checkSection('1. 환경변수 설정 확인');

  const envLocalExists = fs.existsSync('.env.local');
  checkItem('.env.local 파일 존재', envLocalExists);
  if (!envLocalExists) {
    log('   .env.example을 .env.local로 복사하고 값을 설정하세요.', 'yellow');
    allPassed = false;
  }

  const envExampleExists = fs.existsSync('.env.example');
  checkItem('.env.example 파일 존재', envExampleExists);

  // 2. 의존성 설치 확인
  checkSection('2. 의존성 확인');

  const nodeModulesExists = fs.existsSync('node_modules');
  checkItem('node_modules 존재', nodeModulesExists);
  if (!nodeModulesExists) {
    log('   npm install을 실행하세요.', 'yellow');
    allPassed = false;
  }

  // 3. TypeScript 컴파일
  checkSection('3. TypeScript 컴파일 검사');

  log('TypeScript 검사 실행 중...', 'yellow');
  const tscResult = runCommand('npx tsc --noEmit', true);
  checkItem('TypeScript 컴파일', tscResult.success);
  if (!tscResult.success) {
    log('   TypeScript 에러를 수정하세요.', 'yellow');
    allPassed = false;
  }

  // 4. ESLint
  checkSection('4. ESLint 검사');

  log('ESLint 검사 실행 중...', 'yellow');
  const lintResult = runCommand('npm run lint', true);
  checkItem('ESLint 검사', lintResult.success,
    lintResult.success ? '통과' : '경고 있음 (배포 가능)');

  // ESLint 실패는 배포를 막지 않음 (경고만)
  if (!lintResult.success) {
    log('   일부 Lint 경고가 있지만 배포는 가능합니다.', 'yellow');
  }

  // 5. 프로덕션 빌드
  checkSection('5. 프로덕션 빌드 테스트');

  log('프로덕션 빌드 실행 중... (시간이 걸릴 수 있습니다)', 'yellow');
  const buildResult = runCommand('npm run build', true);
  checkItem('프로덕션 빌드', buildResult.success);
  if (!buildResult.success) {
    log('   빌드 에러를 수정하세요.', 'yellow');
    allPassed = false;
  }

  // 6. Git 상태
  checkSection('6. Git 상태 확인');

  const gitStatusResult = runCommand('git status --porcelain', true);
  const hasUncommitted = gitStatusResult.output.trim().length > 0;
  checkItem('미커밋 변경사항 없음', !hasUncommitted,
    hasUncommitted ? '변경사항을 커밋하는 것을 권장합니다' : '');

  // Git 상태는 배포를 막지 않음
  if (hasUncommitted) {
    log('   변경사항이 있지만 배포는 가능합니다.', 'yellow');
  }

  // 7. 중요 파일 확인
  checkSection('7. 중요 파일 확인');

  const importantFiles = [
    'package.json',
    'next.config.ts',
    'vercel.json',
    '.gitignore',
    'README.md',
    'DEPLOYMENT_GUIDE.md',
  ];

  importantFiles.forEach(file => {
    const exists = fs.existsSync(file);
    checkItem(file, exists);
    if (!exists && file !== 'DEPLOYMENT_GUIDE.md') {
      allPassed = false;
    }
  });

  // 8. Supabase 마이그레이션
  checkSection('8. Supabase 마이그레이션 확인');

  const migrationsDir = 'supabase/migrations';
  const migrationsExist = fs.existsSync(migrationsDir);
  checkItem('마이그레이션 디렉토리 존재', migrationsExist);

  if (migrationsExist) {
    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    checkItem(`마이그레이션 파일 (${migrations.length}개)`, migrations.length > 0);
  }

  // 9. 보안 검사
  checkSection('9. 보안 검사');

  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  const protectsEnv = gitignoreContent.includes('.env');
  const protectsVercel = gitignoreContent.includes('.vercel');

  checkItem('.env 파일 보호', protectsEnv);
  checkItem('.vercel 디렉토리 보호', protectsVercel);

  if (!protectsEnv || !protectsVercel) {
    log('   .gitignore 파일을 확인하세요.', 'yellow');
    allPassed = false;
  }

  // 최종 결과
  checkSection('최종 결과');

  if (allPassed) {
    log('✅ 모든 필수 체크 항목을 통과했습니다!', 'green');
    log('\n배포를 진행하세요:', 'cyan');
    log('  vercel --prod', 'yellow');
    process.exit(0);
  } else {
    log('❌ 일부 필수 체크 항목이 실패했습니다.', 'red');
    log('\n위의 문제를 해결한 후 다시 시도하세요.', 'yellow');
    process.exit(1);
  }
}

// 실행
main().catch(error => {
  log(`\n❌ 체크 스크립트 실행 중 에러 발생: ${error.message}`, 'red');
  process.exit(1);
});
