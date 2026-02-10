# 해화당 프로젝트 배포 가이드

> 생성일: 2026-02-10
> 프로젝트: 해화당 (海華堂) - AI 사주 명리 플랫폼
> 배포 플랫폼: Vercel (권장)

---

## 목차

1. [환경변수 설정 체크리스트](#1-환경변수-설정-체크리스트)
2. [배포 전 준비사항](#2-배포-전-준비사항)
3. [Vercel 배포 가이드](#3-vercel-배포-가이드)
4. [배포 후 확인사항](#4-배포-후-확인사항)
5. [모니터링 및 운영](#5-모니터링-및-운영)
6. [롤백 및 장애 대응](#6-롤백-및-장애-대응)
7. [성능 최적화](#7-성능-최적화)

---

## 1. 환경변수 설정 체크리스트

### 필수 환경변수 (Supabase)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - 발급처: [Supabase Dashboard](https://app.supabase.com) > Settings > API
  - 설명: Supabase 프로젝트 URL
  - 예시: `https://xxxxx.supabase.co`

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 발급처: Supabase Dashboard > Settings > API
  - 설명: Public Anon Key (클라이언트 사용)
  - 보안: 클라이언트 노출 가능

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - 발급처: Supabase Dashboard > Settings > API
  - 설명: Service Role Key (서버 전용, RLS 우회)
  - 보안: **절대 클라이언트에 노출하지 마세요**

### 필수 환경변수 (AI 서비스)

- [ ] `GOOGLE_GENERATIVE_AI_API_KEY`
  - 발급처: [Google AI Studio](https://ai.google.dev/)
  - 설명: Gemini API 키 (사주 분석 필수)
  - 모델: gemini-2.0-flash-exp

- [ ] `GEMINI_API_KEY`
  - 값: `GOOGLE_GENERATIVE_AI_API_KEY`와 동일
  - 설명: 레거시 지원용 (일부 코드에서 사용)

### 필수 환경변수 (결제)

- [ ] `NEXT_PUBLIC_TOSS_CLIENT_KEY`
  - 발급처: [Toss Payments](https://developers.tosspayments.com/)
  - 설명: 클라이언트 키 (결제 위젯용)
  - 환경: 개발/프로덕션 키 분리

- [ ] `TOSS_SECRET_KEY`
  - 발급처: Toss Payments 개발자 센터
  - 설명: Secret Key (서버 전용, 결제 검증)
  - 보안: **절대 클라이언트에 노출하지 마세요**

### 필수 환경변수 (애플리케이션)

- [ ] `NEXT_PUBLIC_APP_URL`
  - 개발: `http://localhost:3000`
  - 프로덕션: `https://yourdomain.com`
  - 설명: 애플리케이션 base URL (리다이렉트, OG 이미지 등)

### 선택 환경변수

- [ ] `OPENAI_API_KEY` (선택사항)
  - 발급처: [OpenAI Platform](https://platform.openai.com/api-keys)
  - 설명: GPT-4 Vision API (관상, 손금, 풍수 분석)
  - 비용: 사용량 기반

---

## 2. 배포 전 준비사항

### 2.1 코드 품질 검증

#### TypeScript 컴파일 확인
```bash
npx tsc --noEmit
```
- 상태: **통과**
- 에러: 없음

#### ESLint 검사
```bash
npm run lint
```
- 상태: **경고 있음 (배포 가능)**
- 에러: 61개 (주로 require() 관련, Jest 테스트 파일)
- 경고: 422개 (unused vars, any 타입 등)
- 주의: 대부분 non-blocking 경고, 배포에 영향 없음

자동 수정 가능한 항목 수정:
```bash
npm run lint -- --fix
```

### 2.2 프로덕션 빌드 검증

#### 빌드 테스트
```bash
npm run build
```

#### 빌드 결과 (2026-02-10 기준)
- 빌드 시간: **17.5초**
- 컴파일: **성공**
- 생성 페이지: **60개**
- 정적 페이지: 35개
- 동적 페이지: 25개

#### 페이지 라우팅 구조
```
○ Static Pages (35개):
  - 홈, 인증 페이지, 프로필, 스튜디오 등

ƒ Dynamic Pages (25개):
  - 관리자 페이지, API 엔드포인트, 보호된 페이지 등
```

### 2.3 데이터베이스 마이그레이션

#### 마이그레이션 파일 확인
```bash
ls supabase/migrations/*.sql
```
- 총 26개 마이그레이션 파일
- 주요 테이블: 14개 (profiles, family_members, analysis_history, subscriptions 등)

#### Supabase 프로덕션 환경 마이그레이션 실행
```bash
# Supabase CLI 로그인
npx supabase login

# 프로덕션 프로젝트 연결
npx supabase link --project-ref <your-project-ref>

# 마이그레이션 적용
npx supabase db push
```

### 2.4 보안 설정 확인

#### .gitignore 검증
```bash
cat .gitignore | grep -E ".env|.vercel"
```
- `.env*.local` - **보호됨**
- `.env` - **보호됨**
- `.vercel` - **보호됨**

#### 민감 정보 누출 확인
```bash
git log --all --full-history --source -- **/.env.local
```
- 결과: 환경변수 파일이 Git 히스토리에 없음

---

## 3. Vercel 배포 가이드

### 3.1 Vercel CLI 설치

```bash
npm install -g vercel
```

### 3.2 Vercel 로그인

```bash
vercel login
```
- GitHub, GitLab, Bitbucket, Email 중 선택

### 3.3 프로젝트 초기 설정

```bash
# 프로젝트 디렉토리에서 실행
cd D:\anti\haehwadang

# Vercel 프로젝트 연결 (첫 배포)
vercel
```

#### 초기 설정 질문 응답
```
Set up and deploy "~/haehwadang"? [Y/n] Y
Which scope do you want to deploy to? [선택]
Link to existing project? [N/y] N
What's your project's name? haehwadang
In which directory is your code located? ./
```

### 3.4 환경변수 설정

#### 방법 1: CLI를 통한 설정 (권장)

```bash
# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# AI Services
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add OPENAI_API_KEY production  # 선택사항

# Payments
vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY production
vercel env add TOSS_SECRET_KEY production

# App
vercel env add NEXT_PUBLIC_APP_URL production
```

#### 방법 2: Vercel Dashboard 사용

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 > Settings > Environment Variables
3. 각 환경변수 추가 (Production 환경 선택)

### 3.5 프로덕션 배포

```bash
# 프로덕션 배포
vercel --prod
```

#### 배포 프로세스
1. 코드 업로드
2. 빌드 실행 (Next.js build)
3. 함수 배포 (API Routes, Server Actions)
4. 정적 파일 배포 (CDN)
5. 도메인 할당

#### 배포 완료
```
✅ Production: https://haehwadang.vercel.app [copied to clipboard] [2m]
```

### 3.6 커스텀 도메인 설정 (선택사항)

```bash
# 도메인 추가
vercel domains add yourdomain.com

# DNS 설정 확인
vercel domains inspect yourdomain.com
```

#### DNS 레코드 설정
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

---

## 4. 배포 후 확인사항

### 4.1 즉시 확인 (5분 이내)

#### 메인 페이지 접속
```bash
curl -I https://haehwadang.vercel.app
```
- HTTP 200 응답 확인

#### 주요 페이지 동작 확인
- [ ] 홈페이지 로딩
- [ ] 로그인/회원가입
- [ ] 사주 분석 페이지
- [ ] 결제 페이지 (테스트 모드)

#### 브라우저 콘솔 확인
1. F12 개발자 도구 열기
2. Console 탭 확인
3. 에러 메시지 확인 (특히 환경변수 관련)

#### 환경변수 로딩 확인
```javascript
// 브라우저 콘솔에서 실행
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// undefined가 아닌 실제 URL이 출력되어야 함
```

### 4.2 기능별 테스트 (30분 이내)

#### 인증 시스템
- [ ] 회원가입 (이메일 인증)
- [ ] 로그인/로그아웃
- [ ] 비밀번호 재설정
- [ ] 프로필 수정

#### 사주 분석 기능
- [ ] 사주 입력 (음력/양력)
- [ ] AI 분석 생성
- [ ] 분석 결과 저장
- [ ] 히스토리 조회

#### 가족 구성원 관리
- [ ] 구성원 추가
- [ ] 구성원 수정/삭제
- [ ] 가족 총운 계산
- [ ] 인연 분석

#### AI 스튜디오
- [ ] 관상 분석 (이미지 업로드)
- [ ] 손금 분석
- [ ] 풍수 분석
- [ ] 사주 궁합

#### 결제 시스템
- [ ] 멤버십 플랜 조회
- [ ] 결제 위젯 로딩
- [ ] 테스트 결제 (테스트 카드)
- [ ] 결제 성공 후 크레딧 증가

#### 관리자 기능
- [ ] 관리자 대시보드 접속
- [ ] 사용자 관리
- [ ] 결제 내역 조회
- [ ] 프롬프트 관리

### 4.3 성능 확인

#### Vercel Analytics 확인
```bash
vercel logs --follow
```

#### Core Web Vitals
- LCP (Largest Contentful Paint): < 2.5초
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

#### PageSpeed Insights
```bash
# URL 입력
https://pagespeed.web.dev/
```

---

## 5. 모니터링 및 운영

### 5.1 Vercel 로그 모니터링

#### 실시간 로그
```bash
vercel logs --follow
```

#### 특정 함수 로그
```bash
vercel logs --function=/api/cron/daily-fortune
```

### 5.2 Supabase 모니터링

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. Database > Logs 확인
3. API > Logs 확인
4. Auth > Users 확인

#### 쿼리 성능 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 5.3 에러 트래킹 (권장)

#### Sentry 설치 (선택사항)
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

#### 환경변수 추가
```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production
```

### 5.4 Cron Jobs 모니터링

#### vercel.json에 설정된 Cron
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-fortune",
      "schedule": "0 22 * * *"
    }
  ]
}
```
- 매일 22:00 (UTC) 실행
- 한국 시간: 다음날 07:00 (UTC+9)

#### Cron 실행 로그 확인
```bash
vercel logs --function=/api/cron/daily-fortune
```

---

## 6. 롤백 및 장애 대응

### 6.1 Vercel 롤백

#### CLI를 통한 롤백
```bash
# 이전 배포 목록 확인
vercel list

# 특정 배포로 롤백
vercel rollback <deployment-url>

# 최신 프로덕션 배포로 롤백
vercel rollback --prod
```

#### Dashboard를 통한 롤백
1. Vercel Dashboard > 프로젝트 선택
2. Deployments 탭
3. 이전 배포 선택 > "Promote to Production"

### 6.2 환경변수 긴급 수정

```bash
# 환경변수 제거
vercel env rm VARIABLE_NAME production

# 환경변수 재설정
vercel env add VARIABLE_NAME production

# 재배포 (환경변수 적용)
vercel --prod
```

### 6.3 데이터베이스 롤백

#### Supabase 백업 복원
1. Supabase Dashboard > Database > Backups
2. 복원할 백업 선택
3. "Restore" 클릭

#### 수동 롤백 (마이그레이션)
```sql
-- Supabase SQL Editor에서 실행
-- 마이그레이션 히스토리 확인
SELECT * FROM schema_migrations ORDER BY version DESC;

-- 특정 마이그레이션 롤백 (주의!)
-- 롤백 SQL 수동 작성 필요
```

### 6.4 장애 상황별 대응

#### API 응답 없음
```bash
# 로그 확인
vercel logs --follow

# 함수 타임아웃 확인
# Vercel Pro: 10초, Hobby: 10초

# Supabase 상태 확인
curl https://status.supabase.com/api/v2/status.json
```

#### 데이터베이스 연결 실패
```bash
# Supabase 연결 테스트
curl https://<project-ref>.supabase.co/rest/v1/

# RLS 정책 확인
# Supabase Dashboard > Authentication > Policies
```

#### 결제 오류
```bash
# Toss Payments 상태 확인
curl https://status.tosspayments.com/

# 환경변수 확인
vercel env ls
```

---

## 7. 성능 최적화

### 7.1 이미지 최적화

#### Next.js Image 컴포넌트 사용
```typescript
import Image from 'next/image'

<Image
  src="/profile.jpg"
  width={500}
  height={500}
  alt="프로필"
  priority // LCP 이미지에 사용
/>
```

#### Vercel Image Optimization
- 자동 WebP 변환
- 자동 리사이징
- CDN 캐싱

### 7.2 번들 크기 최적화

#### 번들 분석
```bash
npm run analyze
```

#### 결과 확인
- `.next/analyze/` 디렉토리에 리포트 생성
- 큰 패키지 확인 및 제거

#### 다이나믹 임포트
```typescript
// 큰 컴포넌트는 동적 로딩
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>로딩 중...</p>,
  ssr: false // 클라이언트에서만 로딩
})
```

### 7.3 캐싱 전략

#### API 응답 캐싱
```typescript
// app/actions/example.ts
import { unstable_cache } from 'next/cache'

export const getCachedData = unstable_cache(
  async () => {
    // 데이터 조회
    return data
  },
  ['cache-key'],
  {
    revalidate: 3600, // 1시간 캐시
    tags: ['data']
  }
)
```

#### Supabase 쿼리 캐싱
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
  .abortSignal(AbortSignal.timeout(5000)) // 5초 타임아웃
```

### 7.4 데이터베이스 최적화

#### 인덱스 추가 (Database.md 참조)
```sql
-- 자주 조회하는 컬럼에 인덱스
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_analysis_history_profile_id ON analysis_history(profile_id);
```

#### RPC 함수 활용
```sql
-- 복잡한 집계는 RPC로
CREATE OR REPLACE FUNCTION calculate_family_fortune(p_user_id UUID)
RETURNS TABLE(...) AS $$
BEGIN
  -- 집계 로직
END;
$$ LANGUAGE plpgsql;
```

---

## 8. 배포 체크리스트 최종 요약

### 배포 전
- [ ] TypeScript 컴파일 성공
- [ ] 프로덕션 빌드 성공
- [ ] 환경변수 모두 설정
- [ ] .gitignore에 민감 정보 제외
- [ ] 데이터베이스 마이그레이션 준비
- [ ] Supabase RLS 정책 활성화

### 배포 중
- [ ] Vercel CLI 로그인
- [ ] 환경변수 Vercel에 등록
- [ ] 프로덕션 배포 실행
- [ ] 배포 URL 확인

### 배포 후 (5분 이내)
- [ ] 메인 페이지 접속 확인
- [ ] 로그인/회원가입 테스트
- [ ] 브라우저 콘솔 에러 확인
- [ ] Supabase 연결 확인

### 배포 후 (30분 이내)
- [ ] 사주 분석 기능 테스트
- [ ] AI 스튜디오 기능 테스트
- [ ] 결제 플로우 테스트 (테스트 카드)
- [ ] 관리자 기능 확인
- [ ] 성능 메트릭 확인

### 24시간 모니터링
- [ ] Vercel 로그 모니터링
- [ ] Supabase 쿼리 성능 확인
- [ ] 사용자 피드백 수집
- [ ] 에러 로그 검토

---

## 9. 참고 자료

### 공식 문서
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Toss Payments Guides](https://docs.tosspayments.com/)

### 프로젝트 문서
- `README.md` - 프로젝트 개요 및 로컬 개발
- `DATABASE.md` - 데이터베이스 스키마 및 ERD
- `PROJECT_RULES.md` - 코딩 규칙 및 아키텍처

### 유용한 명령어 요약

```bash
# 환경변수 검증
npx tsx lib/config/env.ts

# TypeScript 검사
npx tsc --noEmit

# Lint 자동 수정
npm run lint -- --fix

# 프로덕션 빌드
npm run build

# 번들 분석
npm run analyze

# Vercel 배포
vercel --prod

# 로그 확인
vercel logs --follow

# 롤백
vercel rollback
```

---

## 마지막 주의사항

1. **환경변수 보안**
   - 절대 Git에 커밋하지 마세요
   - 클라이언트 노출 키와 서버 전용 키 구분
   - 정기적으로 키 로테이션

2. **데이터베이스 백업**
   - Supabase 자동 백업 확인
   - 중요 데이터는 별도 백업

3. **비용 모니터링**
   - Vercel 사용량 확인
   - Supabase 저장소/대역폭 확인
   - AI API 사용량 확인 (Gemini, OpenAI)

4. **사용자 경험**
   - 에러 처리 개선
   - 로딩 상태 표시
   - 오프라인 대응

---

**배포 완료 후 이 문서를 프로젝트 루트에 보관하세요.**

문의: 프로젝트 관리자
최종 수정: 2026-02-10
