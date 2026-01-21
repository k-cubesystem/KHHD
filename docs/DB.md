# 해화당 AI - 확장 데이터베이스 설계 (DB.md)

## 1. 기존 테이블 (v1.0)
- `profiles`: 사용자 기본 정보 및 크레딧 상태.
- `family_members`: 멀티 프로필(사주 데이터 및 이미지 URL).
- `saju_records`: 생성된 비록 및 분석 수치 데이터.
- `payments`: 결제 내역 및 주문 상태.

## 2. 신규 확장 테이블 (v2.0)

### 2.1 궁합 내역 (`compatibility_records`)
- `id`: uuid (PK)
- `member_id_1`: uuid (FK -> family_members)
- `member_id_2`: uuid (FK -> family_members)
- `compatibility_score`: integer (0-100)
- `analysis_text`: text (궁합 분석 결과)
- `created_at`: timestamp

### 2.2 운명 아이템 (`fortune_items`)
- `id`: uuid (PK)
- `name`: text (아이템명: 예, '비취호박 노리개')
- `type`: text (부적, 풍수템, 디지털 배경화면 등)
- `price`: integer
- `description`: text
- `image_url`: text

### 2.3 아이템 인벤토리 (`inventory`)
- `id`: uuid (PK)
- `profile_id`: uuid (FK -> profiles)
- `item_id`: uuid (FK -> fortune_items)
- `purchased_at`: timestamp
- `expires_at`: timestamp (기간제 아이템인 경우)

### 2.4 구독 정보 (`subscriptions`)
- `id`: uuid (PK)
- `profile_id`: uuid (FK -> profiles)
- `plan_type`: text ('daily', 'premium')
- `status`: text ('active', 'canceled', 'expired')
- `start_date`: timestamp
- `end_date`: timestamp

### 2.5 마스터 상담 로그 (`master_consultations`)
- `id`: uuid (PK)
- `profile_id`: uuid (FK -> profiles)
- `member_id`: uuid (FK -> family_members)
- `messages`: jsonb (상담 대화 내역: 역할, 메시지, 시간)
- `created_at`: timestamp