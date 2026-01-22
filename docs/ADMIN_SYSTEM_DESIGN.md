# 해화당 관리자 시스템(Admin System) 설계서

**작성일**: 2026-01-22  
**작성자**: Gemini (Architect)  
**구현 예정자**: Claude (Developer)

---

## 1. 시스템 개요

해화당 서비스의 안정적인 운영과 데이터 관리를 위해 강력한 권한을 가진 **관리자 시스템**을 구축합니다. 또한 내부 테스트 및 QA를 위한 **테스터(Tester)** 권한을 도입하여 무제한 크레딧 사용이 가능하도록 합니다.

## 2. 권한 모델 (Role-Based Access Control)

`profiles` 테이블에 `role` 컬럼을 추가하여 구분합니다.

| 역할 (Role) | 권한 코드 | 설명 | 비고 |
| :--- | :--- | :--- | :--- |
| **슈퍼 관리자** | `admin` | 모든 데이터 접근(C/R/U/D), 설정 변경, 가격 수정 | 개발자 및 운영자 |
| **테스터** | `tester` | 일반 기능 + **무제한 크레딧**, **결제 우회** | QA용 계정 |
| **일반 사용자** | `user` | 본인 데이터만 접근 가능 | 기본값 (Default) |

## 3. 데이터베이스 스키마 변경 (`migrations/add_admin_system.sql`)

### 3.1 Profiles 테이블 확장
```sql
ALTER TABLE public.profiles 
ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'tester'));
```

### 3.2 가격 정책 테이블 신설 (`price_plans`)
하드코딩된 가격을 DB 기반으로 변경하여 관리자가 실시간으로 수정할 수 있게 합니다.

```sql
CREATE TABLE public.price_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,           -- 예: "1회 분석", "3회 패키지"
    credits INTEGER NOT NULL,     -- 제공 크레딧 (1, 3, 5...)
    price INTEGER NOT NULL,       -- 가격 (9900, 24900...)
    is_active BOOLEAN DEFAULT true, -- 판매 중 여부
    description TEXT,
    badge_text TEXT,              -- "BEST", "최저가" 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 RLS (Row Level Security) 정책 업데이트
기존의 "본인 데이터만 조회 가능" 정책에 "관리자는 모든 데이터 조회 가능" 조건을 추가합니다.

```sql
-- 예시: profiles 테이블 정책
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
```

## 4. 관리자 페이지 구조 (`/admin`)

모든 관리자 페이지는 `Middleware`에서 `role === 'admin'` 확인 후 접근을 허용합니다.

```
/admin
├── /dashboard       # (메인) 일일 매출, 가입자, 최근 결제, 서버 상태 요약
├── /users           # 회원 관리 (검색, 상세 조회, 권한 수정, 강제 탈퇴)
├── /payments        # 결제 내역 (전체 조회, 필터링, 매출 통계)
├── /products        # 상품/가격 관리 (price_plans 테이블 CRUD)
└── /database        # (고급) SQL 쿼리 실행 또는 주요 테이블 로우 데이터 조회
```

## 5. 기능 상세 명세

### 5.1 회원 관리
- **검색**: 이메일, 이름으로 회원 검색.
- **권한 관리**: 특정 사용자를 `tester` 또는 `admin`으로 승격/강등.
- **크레딧 관리**: CS 처리를 위해 임의로 사용자 크레딧 추가/차감 기능.

### 5.2 가격 관리
- 현재 프론트엔드에 하드코딩된 가격표(`plans` 배열)를 `price_plans` 테이블 데이터로 교체.
- 관리자 페이지에서 가격 수정 시 즉시 결제창에 반영.

### 5.3 테스터 기능 (무한 계정)
- 로그인한 유저의 `role`이 `tester` 또는 `admin`인 경우:
  - 결제 위젯에 [테스트 크레딧 충전] 버튼 노출.
  - 결제 과정 없이 크레딧 +100 충전 가능.

## 6. 보안 요구사항
- 관리자 페이지는 절대 일반 유저에게 노출되어서는 안 됨.
- 관리자 권한 변경 API는 더욱 엄격한 검증(Super Admin Only) 필요.
- 모든 관리자 활동(데이터 수정/삭제)은 로그로 기록 권장(추후 구현).

---
**설계 승인**: 사용자 요청에 의거함.
