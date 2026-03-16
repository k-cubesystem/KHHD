# REVIEW-001: any 타입 제거 + 패키지/설정 정리

- **PR 대상**: 코드 품질 일괄 수정 (13개 파일 + package.json + next.config.ts)
- **요청팀**: TEAM_I (자체 기술 부채 상환)
- **날짜**: 2026-03-15
- **등급**: APPROVE

---

## 리뷰 체크리스트 결과

### [코드 품질]
- [x] any 타입 13개 파일에서 제거/적절한 타입으로 교체
- [x] 새 타입 정의는 해당 파일 또는 관련 모듈에 위치
- [x] 기존 프로젝트 타입(FamilyMember, SinsalItem, DaeunPeriod, UserRole 등) 재사용
- [x] `result_json` 필드는 `Record<string, any>`로 설정 (AI 분석 결과의 동적 특성 반영, eslint-disable 주석 포함)
- [x] `invokeEdgeSafe`는 제네릭 `<T>` 도입, 기본값은 eslint-disable 주석 부여

### [성능]
- [x] 미사용 패키지 3개 제거 (openai, react-compare-slider, pg) -- 번들 사이즈 감소
- [x] eslint-config-next 버전 정합성 확보

### [보안]
- [x] CSP에서 미사용 api.openai.com 제거 -- 공격 표면 축소
- [x] Permissions-Policy camera=(self) 활성화 -- 관상/풍수 촬영 기능 지원

### [인프라]
- [x] @supabase/ssr "latest" -> "^0.8.0" 고정 -- 빌드 재현성 확보
- [x] tsc --noEmit 전체 통과

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| app/protected/profile/page.tsx | 5개 변수 any -> ProfileRecord, AnalysisRecord, AttendanceStatus 등 |
| app/protected/profile/manse/manse-client.tsx | sinsalList/daeunList -> SinsalItem[]/DaeunPeriod[], HanjaInfo 인터페이스 |
| app/admin/users/[id]/user-detail-client.tsx | Props 6개 any -> Admin* 인터페이스 |
| components/profile/settings-form.tsx | user/profile/familyMember -> Settings* 인터페이스 |
| hooks/use-family-members.ts | (old: any[]) -> FamilyMember[] |
| hooks/use-kakao-address.ts | window as any -> DaumWindow 타입 확장 |
| components/pwa-install-prompt.tsx | useState<any> -> BeforeInstallPromptEvent |
| app/actions/core/studio.ts | data: any -> StudioData 유니온 + FaceDestinyGoal/InteriorTheme |
| app/actions/user/history.ts | result_json: any -> Record<string, any> |
| lib/supabase/invoke-edge.ts | Promise<any> -> 제네릭 Promise<T> |
| lib/utils/analysis-cache.ts | result_json: any -> Record<string, any> |
| app/admin/payments/actions.ts | 5건 any -> PaymentProfile 인터페이스 |
| app/actions/core/notification.ts | (response as any) -> 직접 접근 (sendOne 반환 타입 활용) |
| package.json | openai/react-compare-slider/pg 제거, 버전 수정 |
| next.config.ts | api.openai.com 제거, camera=(self) |
