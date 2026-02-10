# 🚀 배포 워크플로우

## 개요
개발 완료된 기능을 프로덕션에 안전하게 배포하는 프로세스

## 예상 시간
30분

---

## 에이전트 실행 순서

### 1단계: 배포 전 체크 (10분)
**담당**: CLAUDE

**체크리스트**:
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 문서화 완료
- [ ] Lighthouse 90+
- [ ] 번들 크기 < 500KB
- [ ] 환경 변수 설정 확인

---

### 2단계: 최종 QA (10분)
**담당**: SHERLOCK

**작업**:
- Staging 환경 테스트
- 회귀 테스트
- 크로스 브라우저 테스트

---

### 3단계: SEO 최종 확인 (5분)
**담당**: VIRAL

**작업**:
- Meta Tags 확인
- Sitemap 업데이트
- Robots.txt 검증

---

### 4단계: 배포 실행 (5분)
**담당**: BOOSTER

**작업**:
```bash
# 1. PR 머지
git checkout main
git pull origin main

# 2. Vercel 자동 배포
# (PR 머지 시 자동 트리거)

# 3. 배포 상태 확인
# Vercel Dashboard
```

---

### 5단계: 배포 후 검증 (5분)
**담당**: SHERLOCK

**작업**:
- [ ] Production URL 접속
- [ ] 새 기능 동작 확인
- [ ] 기존 기능 정상 작동
- [ ] 에러 로그 모니터링
- [ ] Analytics 이벤트 수집 확인

---

### 6단계: 롤백 준비
**담당**: BOOSTER

**롤백 절차**:
```bash
# Vercel Dashboard에서 이전 배포로 즉시 롤백
# 또는
git revert <commit-hash>
git push origin main
```

---

## 배포 환경

### Development
- URL: https://haehwadang-dev.vercel.app
- Branch: develop
- 자동 배포: 모든 커밋

### Staging
- URL: https://haehwadang-staging.vercel.app
- Branch: staging
- 자동 배포: PR 머지 시

### Production
- URL: https://k-haehwadang.com
- Branch: main
- 자동 배포: PR 머지 시 (승인 후)

---

## 긴급 롤백 시나리오

### 상황: 프로덕션 장애 발생
```
1. Vercel Dashboard → Deployments
2. 이전 정상 배포 선택
3. "Promote to Production" 클릭
4. 즉시 롤백 완료 (30초)
```

---

## 성공 메트릭
- 배포 성공률: 99%
- 배포 소요 시간: < 5분
- 롤백 소요 시간: < 1분
