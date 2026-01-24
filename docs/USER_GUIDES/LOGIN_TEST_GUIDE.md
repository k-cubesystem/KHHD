# 🔐 로그인 테스트 가이드

## ⚠️ 시작 전 필수 확인

### Supabase 설정 확인
1. **Supabase Dashboard** 접속: https://app.supabase.com
2. 프로젝트 선택 후 **Authentication** → **URL Configuration**
3. 다음 설정 확인:

```
Site URL: http://localhost:3000

Redirect URLs (추가 필요):
✅ http://localhost:3000/auth/callback
✅ http://localhost:3000/*
```

4. **Authentication** → **Providers** → **Google**
   - ✅ Enabled 체크
   - ✅ Client ID 및 Secret 설정됨

---

## 🧪 테스트 순서

### 1단계: 세션 API 테스트
브라우저에서 접속:
```
http://localhost:3000/api/test-session
```

**예상 결과**:
```json
{
  "authenticated": false,
  "user": null,
  "timestamp": "2026-01-22T00:41:00Z"
}
```

### 2단계: 구글 로그인 시도
1. `http://localhost:3000/auth/login` 접속
2. "Google로 시작하기" 버튼 클릭
3. 구글 계정 선택 및 권한 승인

### 3단계: 터미널 로그 확인
`npm run dev` 터미널에서 다음 순서로 로그 확인:

```bash
=== AUTH CALLBACK START ===
Code: EXISTS
[Session Exchange Success] your@email.com
=== AUTH CALLBACK END - Redirecting to /protected ===

[Middleware] Path: /protected | User: your@email.com
[Middleware] ✅ Auth check passed
```

### 4단계: 대시보드 접근 확인
- ✅ `/protected` 페이지 정상 표시
- ✅ 사용자 이름 표시 확인
- ✅ 페이지 새로고침 시 로그인 유지

---

## 🩺 문제 해결

### 증상: 로그가 전혀 안 나옴
**원인**: Supabase Redirect URL 미등록  
**해결**: Supabase Dashboard에서 `http://localhost:3000/auth/callback` 추가

### 증상: "세션 교환 실패" 에러
**원인**: 환경변수 불일치 또는 Supabase 프로젝트 설정 오류  
**해결**: 
1. `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` 확인
2. Supabase Dashboard의 Project Settings → API → URL 비교

### 증상: 로그인 후 다시 로그인 페이지로 이동
**원인**: Middleware가 세션을 인식하지 못함  
**해결**: 
1. 브라우저 쿠키 삭제 (개발자 도구 → Application → Cookies)
2. `http://localhost:3000/api/test-session` 접속하여 세션 상태 확인

---

## 📋 체크리스트

- [ ] Supabase Redirect URL 등록 완료
- [ ] `/api/test-session` 정상 응답 확인
- [ ] 구글 로그인 시도 후 터미널 로그 확인
- [ ] `/protected` 페이지 접근 성공
- [ ] 페이지 새로고침 시 로그인 유지 확인
- [ ] 브라우저 쿠키에 `sb-` 접두사 쿠키 존재 확인

---

## 🎯 성공 시 다음 단계

로그인이 정상 작동하면:
1. GitHub에 코드 푸시
2. Vercel 배포 및 프로덕션 테스트
3. **Phase 4 재개**: Toss Payments 통합

**Generated**: 2026-01-22 00:42 KST
