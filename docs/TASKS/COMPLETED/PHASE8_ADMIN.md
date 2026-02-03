# Phase 8: 관리자 시스템 구축 - 잔여 작업 지시서

**To**: Claude 3.5 Sonnet  
**From**: Gemini (Planner)  
**Status**: In Progress (Step 1-4.1 Completed)

Haehwadang Admin System의 핵심 골격은 완성되었습니다. 이제 각 하위 메뉴의 **실제 기능 구현**에 집중하십시오.

---

## ✅ Completed Tasks
- [x] DB Migration (`migrations/20260122_add_admin_system.sql`).
- [x] Type Definitions (`types/auth.ts`).
- [x] Server Actions (`actions/products.ts`).
- [x] PaymentWidget Refactor & Tester Feature.
- [x] Admin Middleware (`middleware.ts`).
- [x] Admin Layout & Main Dashboard (`app/admin/page.tsx`).

---

## 🛠️ Remaining Tasks (Priority Order)

### 1. 👥 회원 관리 페이지 (`app/admin/users/page.tsx`)
- **UI**: 검색창(이메일/이름), 데이터 테이블(`shadcn/ui` Table).
- **Columns**: 이메일, 이름, 생년월일, 성별, Role(Select로 변경 가능하게), 가입일.
- **Actions**:
    - **Role 변경**: User <-> Tester <-> Admin 변경 기능. (Server Action: `updateProfileRole`).
    - **상세 보기**: 클릭 시 모달 또는 펼침 UI로 가족 구성원 정보 표시.
- **Design**: "UX Pro Max" 스타일 적용 (Glassmorphism, Hover Effects).

### 2. 💳 결제 내역 관리 페이지 (`app/admin/payments/page.tsx`)
- **UI**: 필터(기간, 상태), 데이터 테이블.
- **Columns**: 주문ID, 사용자명, 결제금액, 상품명, 결제일, 상태(Success/Fail/Refund).
- **Features**: 
    - 서버 사이드 페이지네이션 권장 (데이터가 많을 수 있음).
    - `payments` 테이블과 `profiles`를 조인하여 사용자 정보 표시.

### 3. 📦 상품/가격 관리 페이지 (`app/admin/products/page.tsx`)
- **UI**: 카드 그리드 형태 (현재 판매 중인 Plan들).
- **Features**:
    - 각 카드의 '수정' 버튼 클릭 시 모달.
    - 가격(Price), 크레딧(Credits), 활성 여부(IsActive) 수정 가능.
    - **주의**: 가격 수정 시 `price_plans` 테이블을 업데이트하되, 기존 결제 로그 무결성을 위해 `price_plans`의 row를 update하기보다 `is_active=false` 처리 후 새 row insert 방식 고려 (또는 단순 update 허용하되 로그 주의). -> **단순 Update로 진행하되 cache revalidate 필수**.

---

## 🚀 Execution Instructions
1.  **Users Page**부터 시작하세요.
2.  **UX Pro Max** 스킬(`ai/skills/UX_PRO_MAX/SKILL.md`)을 반드시 준수하여 "관리자 페이지도 아름답게" 만드세요.
3.  필요한 Server Action을 `app/actions/admin-actions.ts`에 새로 만들어 관리하세요.

**Start with Task 1 (Users Page).**
