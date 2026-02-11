# PHASE 3: 관리자 대시보드 고도화

## 🎯 목표
관리자 대시보드를 실시간 모니터링 + 마케팅 인사이트 중심으로 재설계하여 데이터 기반 의사결정 지원

## ✅ 완료 조건 (Definition of Done)
- [ ] Recent Activity 실시간 스트리밍 구현
- [ ] 시간대별 트래픽 라이브 차트 작동
- [ ] 유입 경로 분석 (UTM 파라미터 추적)
- [ ] 전환율 대시보드 (가입 → 유료)
- [ ] 이탈률 분석 및 시각화
- [ ] 빠른 액션 버튼 3종 구현
- [ ] 관리자 전용 알림 시스템
- [ ] 모든 차트 반응형 확인
- [ ] 성능 최적화 (1초 이내 로드)
- [ ] 코드 리뷰 완료

---

## 👥 에이전트 임무 할당

### 🗄️ DB_MASTER (Data Keeper)
**책임**: 추적 테이블 설계, 집계 함수 최적화

#### 임무 1: 활동 로그 테이블 설계
**파일**: `supabase/migrations/20260213_phase3_admin_dashboard.sql`

```sql
-- =============================================
-- PHASE 3: 관리자 대시보드 - 추적 및 분석 테이블
-- =============================================

-- 1. 사용자 활동 로그 (Recent Activity용)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'signup', 'login', 'purchase', 'analysis', 'upgrade'
  activity_category VARCHAR(50), -- 'user', 'payment', 'content'
  description TEXT NOT NULL,
  metadata JSONB, -- 추가 정보 (금액, 상품명 등)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

-- 파티셔닝 (월별로 파티션 분리 - 성능 최적화)
-- CREATE TABLE activity_logs_2026_02 PARTITION OF activity_logs
-- FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- RLS 정책 (관리자만 조회 가능)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. UTM 파라미터 추적 테이블
CREATE TABLE IF NOT EXISTS utm_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- 세션별 추적
  utm_source VARCHAR(100), -- google, facebook, naver
  utm_medium VARCHAR(100), -- cpc, social, email
  utm_campaign VARCHAR(100), -- summer_sale_2026
  utm_term VARCHAR(100), -- 키워드
  utm_content VARCHAR(100), -- 광고 변형
  landing_page TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false, -- 유료 전환 여부
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_utm_source ON utm_tracking(utm_source);
CREATE INDEX idx_utm_campaign ON utm_tracking(utm_campaign);
CREATE INDEX idx_utm_converted ON utm_tracking(converted, created_at DESC);

-- RLS 정책
ALTER TABLE utm_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view utm tracking"
  ON utm_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. 이탈 추적 테이블 (Funnel Analysis)
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_name VARCHAR(100) NOT NULL, -- 'landing', 'signup', 'first_analysis', 'purchase'
  funnel_step INT NOT NULL, -- 1, 2, 3, 4...
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_funnel_events_step ON funnel_events(funnel_step, created_at DESC);
CREATE INDEX idx_funnel_events_user ON funnel_events(user_id);

-- RLS 정책
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view funnel events"
  ON funnel_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. 시간대별 트래픽 집계 테이블 (매시간 업데이트)
CREATE TABLE IF NOT EXISTS traffic_hourly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hour_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  total_visits INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  new_signups INT DEFAULT 0,
  total_purchases INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hour_timestamp)
);

-- 인덱스
CREATE INDEX idx_traffic_hourly_timestamp ON traffic_hourly(hour_timestamp DESC);

-- RLS 정책
ALTER TABLE traffic_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view traffic stats"
  ON traffic_hourly FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. RPC 함수: Recent Activity 조회 (최근 50건)
CREATE OR REPLACE FUNCTION get_recent_activities(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  user_email TEXT,
  activity_type VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    p.full_name AS user_name,
    u.email AS user_email,
    al.activity_type,
    al.description,
    al.metadata,
    al.created_at
  FROM activity_logs al
  LEFT JOIN auth.users u ON al.user_id = u.id
  LEFT JOIN profiles p ON al.user_id = p.id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 6. RPC 함수: UTM 성과 분석
CREATE OR REPLACE FUNCTION get_utm_performance(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  total_visits BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ut.utm_source,
    ut.utm_campaign,
    COUNT(*) AS total_visits,
    COUNT(*) FILTER (WHERE ut.converted = true) AS conversions,
    ROUND(
      (COUNT(*) FILTER (WHERE ut.converted = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS conversion_rate
  FROM utm_tracking ut
  WHERE ut.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY ut.utm_source, ut.utm_campaign
  ORDER BY conversions DESC;
END;
$$;

-- 7. RPC 함수: Funnel 분석 (단계별 이탈률)
CREATE OR REPLACE FUNCTION get_funnel_analysis(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  step_name VARCHAR(100),
  step_number INT,
  total_users BIGINT,
  dropoff_count BIGINT,
  dropoff_rate NUMERIC(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH step_counts AS (
    SELECT
      event_name,
      funnel_step,
      COUNT(DISTINCT user_id) AS user_count
    FROM funnel_events
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY event_name, funnel_step
    ORDER BY funnel_step
  )
  SELECT
    sc.event_name AS step_name,
    sc.funnel_step AS step_number,
    sc.user_count AS total_users,
    LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step) - sc.user_count AS dropoff_count,
    ROUND(
      (
        (LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step) - sc.user_count)::NUMERIC
        / NULLIF(LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step), 0)
      ) * 100,
      2
    ) AS dropoff_rate
  FROM step_counts sc;
END;
$$;

-- 8. RPC 함수: 시간대별 트래픽 (최근 24시간)
CREATE OR REPLACE FUNCTION get_hourly_traffic(p_hours INT DEFAULT 24)
RETURNS TABLE (
  hour_timestamp TIMESTAMP WITH TIME ZONE,
  total_visits INT,
  unique_users INT,
  new_signups INT,
  total_revenue DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    th.hour_timestamp,
    th.total_visits,
    th.unique_users,
    th.new_signups,
    th.total_revenue
  FROM traffic_hourly th
  WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY th.hour_timestamp DESC;
END;
$$;

-- 9. 트리거: 활동 로그 자동 기록
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 예: 새 사용자 가입 시 자동 로그
  IF (TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT') THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_category, description)
    VALUES (NEW.id, 'signup', 'user', NEW.full_name || '님이 가입했습니다.');
  END IF;

  -- 예: 결제 완료 시 자동 로그
  IF (TG_TABLE_NAME = 'payments' AND TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    INSERT INTO activity_logs (
      user_id,
      activity_type,
      activity_category,
      description,
      metadata
    )
    VALUES (
      NEW.user_id,
      'purchase',
      'payment',
      '결제 완료: ' || NEW.product_name,
      jsonb_build_object('amount', NEW.amount, 'product_id', NEW.product_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 연결
CREATE TRIGGER trigger_log_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER trigger_log_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();
```

---

### 🛡️ BE_SYSTEM (System Core)
**책임**: 관리자 액션 구현

#### 임무 1: 관리자 대시보드 액션
**파일**: `app/actions/admin-dashboard-actions.ts`

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 권한 체크 헬퍼
async function checkAdminPermission() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// 1. Recent Activity 조회
export async function getRecentActivities(limit: number = 50) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_recent_activities', { p_limit: limit });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, activities: data };
}

// 2. UTM 성과 분석
export async function getUTMPerformance(startDate?: Date, endDate?: Date) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_utm_performance', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined
  });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 3. Funnel 분석
export async function getFunnelAnalysis(startDate?: Date, endDate?: Date) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_funnel_analysis', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined
  });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 4. 시간대별 트래픽
export async function getHourlyTraffic(hours: number = 24) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_hourly_traffic', { p_hours: hours });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 5. 빠른 액션: 전체 공지 발송
export async function sendGlobalNotification(title: string, message: string) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  // 모든 사용자 조회
  const { data: users } = await supabase.from('profiles').select('id');

  if (!users) return { success: false, error: "사용자 조회 실패" };

  // 알림 일괄 삽입
  const notifications = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type: 'admin_announcement'
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'notification',
    description: `전체 공지 발송: ${title}`,
    metadata: { title, message, recipient_count: users.length }
  });

  return { success: true, count: users.length };
}

// 6. 빠른 액션: 쿠폰 일괄 발급
export async function issueCouponToAll(couponCode: string, talismanAmount: number) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data: users } = await supabase.from('profiles').select('id');
  if (!users) return { success: false, error: "사용자 조회 실패" };

  // 쿠폰 일괄 생성
  const coupons = users.map(u => ({
    user_id: u.id,
    code: couponCode,
    talisman_amount: talismanAmount,
    is_used: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
  }));

  const { error } = await supabase.from('coupons').insert(coupons);

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, count: users.length };
}
```

---

### ⚙️ FE_LOGIC (Client Architect)
**책임**: 실시간 업데이트, 차트 로직

#### 임무 1: Recent Activity 실시간 컴포넌트
**파일**: `components/admin/recent-activity-live.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecentActivities } from "@/app/actions/admin-dashboard-actions";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, User, CreditCard, Sparkles, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ActivityItem {
  id: string;
  user_name: string;
  user_email: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

export function RecentActivityLive() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 로드
    loadActivities();

    // Supabase Realtime 구독
    const supabase = createClient();
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity:', payload);
          // 새 활동 추가
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActivities = async () => {
    const result = await getRecentActivities(20);
    if (result.success && result.activities) {
      setActivities(result.activities);
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'signup': return <User className="w-4 h-4" />;
      case 'purchase': return <CreditCard className="w-4 h-4" />;
      case 'analysis': return <Sparkles className="w-4 h-4" />;
      case 'upgrade': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'signup': return 'text-blue-400';
      case 'purchase': return 'text-gold-400';
      case 'analysis': return 'text-purple-400';
      case 'upgrade': return 'text-green-400';
      default: return 'text-ink-light/60';
    }
  };

  if (loading) {
    return <div className="text-ink-light/50">Loading...</div>;
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {activities.map((activity, idx) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3 p-3 bg-surface/30 border border-primary/10 rounded hover:border-primary/20 transition-colors"
          >
            <div className={`p-2 rounded-full bg-surface ${getColor(activity.activity_type)}`}>
              {getIcon(activity.activity_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-light font-medium truncate">
                {activity.description}
              </p>
              <p className="text-xs text-ink-light/50 mt-1">
                {activity.user_name || activity.user_email} ·{" "}
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ko })}
              </p>
              {activity.metadata && (
                <p className="text-xs text-primary/70 mt-1">
                  {activity.metadata.amount && `₩${activity.metadata.amount.toLocaleString()}`}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

#### 임무 2: 시간대별 트래픽 차트
**파일**: `components/admin/traffic-chart.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { getHourlyTraffic } from "@/app/actions/admin-dashboard-actions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

export function TrafficChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const result = await getHourlyTraffic(24);
    if (result.success && result.data) {
      const formatted = result.data.map((item: any) => ({
        time: format(new Date(item.hour_timestamp), 'HH:mm'),
        방문수: item.total_visits,
        신규가입: item.new_signups,
        매출: Math.round(item.total_revenue)
      }));
      setData(formatted.reverse()); // 오래된 순으로 정렬
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="time" stroke="#8B6E58" />
        <YAxis stroke="#8B6E58" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#181611',
            border: '1px solid #D4AF37',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="방문수" stroke="#82ca9d" strokeWidth={2} />
        <Line type="monotone" dataKey="신규가입" stroke="#8884d8" strokeWidth={2} />
        <Line type="monotone" dataKey="매출" stroke="#D4AF37" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### 🎨 FE_VISUAL (Visual Director)
**책임**: 대시보드 UI 리디자인

#### 임무 1: 관리자 메인 페이지 개선
**파일**: `app/admin/page.tsx` (기존 파일 수정)

**추가할 섹션**:
1. **Hero Stats**: 4개 주요 지표 (애니메이션 카운터)
2. **Live Traffic Chart**: 시간대별 트래픽
3. **Recent Activity**: 실시간 활동 피드
4. **UTM Performance**: 유입 경로별 전환율
5. **Funnel Analysis**: 단계별 이탈률
6. **Quick Actions**: 공지/이벤트/쿠폰 발급

---

### 📢 VIRAL (Growth Hacker)
**책임**: UTM 추적 자동화

#### 임무 1: UTM 자동 추적 미들웨어
**파일**: `middleware.ts` (기존 파일 수정)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // UTM 파라미터 추출
  const url = request.nextUrl;
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');

  if (utmSource) {
    // 쿠키에 저장 (30일 유지)
    response.cookies.set('utm_source', utmSource, { maxAge: 30 * 24 * 60 * 60 });
  }
  if (utmMedium) {
    response.cookies.set('utm_medium', utmMedium, { maxAge: 30 * 24 * 60 * 60 });
  }
  if (utmCampaign) {
    response.cookies.set('utm_campaign', utmCampaign, { maxAge: 30 * 24 * 60 * 60 });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 🔧 구현 순서

### Week 1 (Day 1-2): 백엔드
1. DB_MASTER: 마이그레이션 실행
2. BE_SYSTEM: 관리자 액션 구현

### Week 1 (Day 3-4): 프론트엔드
1. FE_LOGIC: 실시간 컴포넌트 구현
2. FE_VISUAL: 대시보드 UI 개선

### Week 2 (Day 1): 통합 & 테스트
1. 전체 통합
2. SHERLOCK: QA 테스트

### Week 2 (Day 2): 디버깅 & 문서화
1. 버그 수정
2. LIBRARIAN: 문서 업데이트

---

## ✅ Phase 3 완료 승인 기준

- [ ] Recent Activity 실시간 작동
- [ ] 트래픽 차트 표시
- [ ] UTM 추적 작동
- [ ] Funnel 분석 표시
- [ ] 빠른 액션 3종 작동
- [ ] QA 테스트 통과
- [ ] 문서화 완료

**승인자**: 👑 CLAUDE (Project Lead)

---

**다음 단계**: PHASE 4 - 세부 페이지 구현
