# 해화당 Page Audit Report

## 1. 개요
*   **목적:** 현재 프로젝트의 모든 페이지를 파악하고, 중복되거나 불필요한 페이지를 식별하여 정리(Cleanup) 및 재연결(Reconnection)을 위한 기초 자료로 활용.
*   **분석 일시:** 2026-01-29
*   **분석 대상:** `app/` 디렉토리 전체

---

## 2. 페이지 구조 및 상태 (Page Structure & Status)

### A. Core Pages (메인 및 공통)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `app/page.tsx` | 랜딩 페이지 (Landing Page) | ✅ Active | V2 디자인 적용 완료 (Carousel) |
| `app/protected/page.tsx` | 메인 대시보드 (Dashboard) | ✅ Active | 모바일/데스크탑 분기 처리 (`MobileView`, `DesktopView`) |
| `app/layout.tsx` | 루트 레이아웃 (Root Layout) | ✅ Active | 폰트/테마 설정 |

### B. Auth (인증) (`app/auth/`)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `login` | 로그인 페이지 | ✅ Active | |
| `sign-up` | 회원가입 페이지 | ✅ Active | |
| `forgot-password` | 비밀번호 찾기 | ✅ Active | |
| `update-password` | 비밀번호 변경 | ✅ Active | |
| `confirm`, `callback` | 인증 콜백 처리 | ✅ Active | Supabase Auth 필수 |
| `sign-up-success` | 가입 성공 안내 | ✅ Active | |

### C. Protected Features (핵심 기능) (`app/protected/`)

#### 1. Saju (사주 분석) (`app/protected/saju/`)
| Path | Description | Status | Check Required |
| :--- | :--- | :--- | :--- |
| `today` | 오늘의 운세 | ✅ Active | |
| `detail` | 사주 정밀 분석 | ❓ Review | `analysis` 폴더와 역할 중복 가능성 |
| `compatibility` | 궁합 분석 | ✅ Active | |
| `fengshui` | 풍수 (3D?) | 🏗️ Beta | 기능 구현 상태 확인 필요 |
| `face`, `hand` | 관상/손금 | 🏗️ Beta | AI 이미지 분석 연동 확인 필요 |
| `new` | 신규 운세 생성 | ✅ Active | |

#### 2. Analysis & Results (결과 및 결제 연동) (`app/protected/analysis/`)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `fail` | 결제/분석 실패 | ✅ Active | 빌드 에러 수정 완료 |
| `success` | 결제/분석 성공 | ✅ Active | |
| `result` | 분석 결과 페이지 | ✅ Active | `saju/detail`과 통합 고려 |
| `analysis-client-page.tsx` | 클라이언트 로직 | ❓ Review | 페이지가 아닌 컴포넌트인지 확인 필요 |

#### 3. User & Settings (`app/protected/`)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `profile` | 마이페이지 | ✅ Active | 리뉴얼 완료 (관리자 버튼 추가) |
| `history` | 분석 기록 | ✅ Active | |
| `family` | 가족/지인 관리 | ✅ Active | |
| `invite` | 친구 초대 | ✅ Active | |
| `membership` | 멤버십 가입/안내 | ✅ Active | 결제 연동 |
| `billing` | 결제 관리 | ❓ Review | `membership` 및 `protected/profile`과 중복 가능성 |

#### 4. Others (기타) (`app/protected/`)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `ai-shaman` | AI 무당 채팅 | ✅ Active | |
| `coaching` | AI 코칭 | ❓ Review | `ai-shaman`과 통합 가능? |
| `destiny` | 운명 분석 (?) | ❓ Review | `saju`와 기능 중복 여부 확인 필요 |
| `relationships`, `services` | 기타 서비스 | ❓ Review | 내용 확인 후 정리 대상 후보 |

### D. Admin (관리자) (`app/admin/`)
| Path | Description | Status | Note |
| :--- | :--- | :--- | :--- |
| `dashboard` | 관리자 대시보드 | ✅ Active | |
| `users` | 회원 관리 | ✅ Active | |
| `payments` | 결제 내역 | ✅ Active | |
| `products` | 상품 관리 | ✅ Active | |
| `membership` | 멤버십 관리 | ✅ Active | |
| `subscriptions` | 구독 관리 | ✅ Active | |
| `prompts` | AI 프롬프트 관리 | ✅ Active | |
| `notifications` | 알림 관리 | ✅ Active | |

---

## 3. 정리 및 재연결 제안 (Action Plan)

### 🗑️ 삭제 및 통합 검토 대상 (To Be Reviewed)
1.  **`protected/billing` vs `protected/membership`**
    *   현재 `membership` 폴더 안에 결제 성공/실패 로직(`success`, `fail`)이 분산되어 있거나 `billing` 폴더가 별도로 존재함.
    *   ➡️ **제안:** `membership`으로 통합하고 `billing`은 제거하거나, 단순 결제 수단 관리 역할만 남김.

2.  **`protected/destiny` vs `protected/saju`**
    *   `destiny` 폴더가 구체적으로 어떤 기능을 하는지 명확하지 않음. 사주 관련이라면 `saju` 하위로 편입 권장.
    *   ➡️ **제안:** `saju` 폴더로 기능 이관 후 `destiny` 삭제.

3.  **`protected/analysis` flow**
    *   `analysis` 폴더가 결제 후 리다이렉트 용도인지, 실제 분석 실행 용도인지 정립 필요.
    *   ➡️ **제안:** `result` 페이지는 `history`나 `saju/result`로 통합하고, `success`/`fail`은 공통 유틸리티 페이지로 사용.

4.  **`protected/coaching` vs `ai-shaman`**
    *   둘 다 대화형 서비스라면 통합 고려.

### ✅ 유지 및 강화 (Keep & Enhance)
*   **Landing (`/`)**: 현재 상태 유지.
*   **Dashboard (`/protected`)**: 모바일/데스크탑 분기 구조 유지.
*   **Profile (`/protected/profile`)**: 최신 리뉴얼 상태 유지.
*   **Admin**: 현재 기능 유지.

---

## 4. 다음 단계 (Next Steps)
1.  **중복 폴더(`destiny`, `billing`, `coaching`) 상세 확인**: 실제 코드 내용을 열어보고 삭제 가능 여부 최종 판단.
2.  **안전한 삭제**: 사용하지 않는 파일 백업 후 삭제.
3.  **네비게이션 연결**: `MobileView` 및 `DesktopView`의 메뉴 링크를 정리된 경로로 업데이트.
