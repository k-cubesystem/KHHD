# Phase 12: Advanced Memory & Credit System (Dynamic Pricing)

**Objective**: Implement a fully dynamic "Talisman (부적)" & "Membership" system controlled by the Admin.

---

## 1. Database Schema Design

### A. `wallets` (User Balance)
Replaces the scattered `credits` logic in `payments` and `profiles`.
```sql
CREATE TABLE public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id),
    balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0), -- Talisman count
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### B. `wallet_transactions` (History)
Immutable log of all balance changes.
```sql
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.wallets(user_id),
    amount INTEGER NOT NULL, -- Positive(Charge) or Negative(Usage)
    type TEXT NOT NULL, -- 'CHARGE', 'USE', 'BONUS', 'REFUND', 'SUBSCRIPTION'
    feature_key TEXT, -- e.g., 'SAJU_BASIC', 'FACE_AI' (Nullable)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### C. `feature_costs` (Dynamic Pricing Rules)
Allows Admin to change the cost of each feature in real-time.
```sql
CREATE TABLE public.feature_costs (
    key TEXT PRIMARY KEY, -- e.g., 'SAJU_BASIC', 'FACE_AI', 'IMAGE_GEN'
    label TEXT NOT NULL, -- e.g., '사주 정밀 분석', 'AI 관상 분석'
    cost INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT
);

-- Seed Data
INSERT INTO public.feature_costs (key, label, cost) VALUES
('SAJU_BASIC', '사주 정밀 분석', 1),
('FACE_AI', 'AI 관상 분석', 2),
('PALM_AI', 'AI 손금 분석', 2),
('FENGSHUI_AI', 'AI 풍수 분석', 3),
('IMAGE_GEN', '개운 이미지 생성', 5);
```

### D. `products` (Store Packages) - Update existing `price_plans`
Review and update `price_plans` to support 'Talisman' terminology and distinct types (Subscription vs One-time).

---

## 2. Admin UI Requirements

### A. Feature Cost Management (`/admin/features`)
- **Table**: List all records from `feature_costs`.
- **Actions**: Edit `cost`, Toggle `is_active`.
- **UX**: Simple inline editing or modal.

### B. Product Management (`/admin/products`)
- **Table**: List all `price_plans`.
- **Actions**: CRUD (Create, Read, Update, Delete).
- **Fields**: Name, Price(KRW), Talisman Amount, Bonus Amount, Badge Text.

---

## 3. Server Action Logic (`/app/actions`)

### A. Refactor `ai-saju.ts`
- Remove `DESTINY_COSTS` constant usage.
- Implement `getFeatureCost(key)` helper that fetches from DB.
- Implement `deductTalisman(userId, key)` helper that:
  1. Fetches current cost from `feature_costs`.
  2. Checks `wallets.balance`.
  3. Updates `wallets` and inserts `wallet_transactions` inside a Transaction (or use stored procedure).

### B. Refactor `payment-actions.ts`
- On payment success:
  1. Record payment.
  2. **Add** Talismans to `wallets`.
  3. Log to `wallet_transactions`.

---

## 4. UI Updates
- Replace all "Credit", "크레딧" text with "Talisman", "부적".
- Update Top Navigation to show `wallets.balance` with 🧧 icon.

**Execution Order**:
1. Migration (SQL) -> 2. Actions (Backend) -> 3. Admin UI -> 4. Client UI.
