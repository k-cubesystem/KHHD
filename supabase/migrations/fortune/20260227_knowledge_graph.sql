-- ============================================================
-- 해화지기 명리학 지식그래프 (Knowledge Graph) 스키마
-- 노드(개념) + 엣지(관계) + 규칙(추론) 3계층 구조
-- ============================================================

-- 1. 노드 테이블: 명리학의 개념 단위
CREATE TABLE IF NOT EXISTS kg_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_type TEXT NOT NULL, -- 'cheongan', 'jiji', 'ohang', 'sipseong', 'sinsal', 'gekguk', 'concept'
  code TEXT NOT NULL UNIQUE, -- 예: '甲', '子', '木', '정관', '역마살'
  label_ko TEXT NOT NULL,
  label_hanja TEXT,
  category TEXT, -- 상위 분류 (예: '천간', '지지', '오행')
  properties JSONB DEFAULT '{}'::jsonb, -- 유연한 속성 저장
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 엣지 테이블: 개념 간 관계
CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'belongs_to', 'generates', 'controls', 'clashes', 'combines', 'transforms'
  weight REAL DEFAULT 1.0,
  properties JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, relation_type)
);

-- 3. 규칙 테이블: 추론 규칙 (사주첩경 등)
CREATE TABLE IF NOT EXISTS kg_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE, -- 예: 'RULE_EXILE_01'
  name TEXT NOT NULL,
  source_text TEXT, -- 원전 출처
  category TEXT NOT NULL, -- '타향살이', '이혼수', '재물파탄' 등
  conditions JSONB NOT NULL, -- 조건 배열
  conclusion JSONB NOT NULL, -- 결론 (summary, detail, severity, actionItems)
  weight REAL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_code ON kg_nodes(code);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relation ON kg_edges(relation_type);
CREATE INDEX IF NOT EXISTS idx_kg_rules_category ON kg_rules(category);
CREATE INDEX IF NOT EXISTS idx_kg_rules_active ON kg_rules(is_active);

-- ============================================================
-- SEED 데이터: 오행 노드 + 천간 노드 + 지지 노드 + 핵심 관계
-- ============================================================

-- 오행 노드
INSERT INTO kg_nodes (node_type, code, label_ko, label_hanja, category, properties, description) VALUES
  ('ohang', '木', '목', '木', '오행', '{"color": "청색", "direction": "동", "season": "봄", "organ": "간장"}', '만물이 싹트는 생장의 기운'),
  ('ohang', '火', '화', '火', '오행', '{"color": "적색", "direction": "남", "season": "여름", "organ": "심장"}', '타오르는 열정과 확산의 기운'),
  ('ohang', '土', '토', '土', '오행', '{"color": "황색", "direction": "중앙", "season": "환절기", "organ": "비장"}', '중심을 잡고 조화를 이루는 기운'),
  ('ohang', '金', '금', '金', '오행', '{"color": "백색", "direction": "서", "season": "가을", "organ": "폐장"}', '결실을 맺고 수렴하는 기운'),
  ('ohang', '水', '수', '水', '오행', '{"color": "흑색", "direction": "북", "season": "겨울", "organ": "신장"}', '만물을 저장하고 지혜를 품는 기운')
ON CONFLICT (code) DO NOTHING;

-- 천간 노드
INSERT INTO kg_nodes (node_type, code, label_ko, label_hanja, category, properties) VALUES
  ('cheongan', '甲', '갑', '甲', '천간', '{"ohang": "木", "yin_yang": "양", "order": 1}'),
  ('cheongan', '乙', '을', '乙', '천간', '{"ohang": "木", "yin_yang": "음", "order": 2}'),
  ('cheongan', '丙', '병', '丙', '천간', '{"ohang": "火", "yin_yang": "양", "order": 3}'),
  ('cheongan', '丁', '정', '丁', '천간', '{"ohang": "火", "yin_yang": "음", "order": 4}'),
  ('cheongan', '戊', '무', '戊', '천간', '{"ohang": "土", "yin_yang": "양", "order": 5}'),
  ('cheongan', '己', '기', '己', '천간', '{"ohang": "土", "yin_yang": "음", "order": 6}'),
  ('cheongan', '庚', '경', '庚', '천간', '{"ohang": "金", "yin_yang": "양", "order": 7}'),
  ('cheongan', '辛', '신', '辛', '천간', '{"ohang": "金", "yin_yang": "음", "order": 8}'),
  ('cheongan', '壬', '임', '壬', '천간', '{"ohang": "水", "yin_yang": "양", "order": 9}'),
  ('cheongan', '癸', '계', '癸', '천간', '{"ohang": "水", "yin_yang": "음", "order": 10}')
ON CONFLICT (code) DO NOTHING;

-- 지지 노드
INSERT INTO kg_nodes (node_type, code, label_ko, label_hanja, category, properties) VALUES
  ('jiji', '子', '자', '子', '지지', '{"ohang": "水", "yin_yang": "양", "animal": "쥐", "month": 11, "order": 1}'),
  ('jiji', '丑', '축', '丑', '지지', '{"ohang": "土", "yin_yang": "음", "animal": "소", "month": 12, "order": 2}'),
  ('jiji', '寅', '인', '寅', '지지', '{"ohang": "木", "yin_yang": "양", "animal": "호랑이", "month": 1, "order": 3}'),
  ('jiji', '卯', '묘', '卯', '지지', '{"ohang": "木", "yin_yang": "음", "animal": "토끼", "month": 2, "order": 4}'),
  ('jiji', '辰', '진', '辰', '지지', '{"ohang": "土", "yin_yang": "양", "animal": "용", "month": 3, "order": 5}'),
  ('jiji', '巳', '사', '巳', '지지', '{"ohang": "火", "yin_yang": "음", "animal": "뱀", "month": 4, "order": 6}'),
  ('jiji', '午', '오', '午', '지지', '{"ohang": "火", "yin_yang": "양", "animal": "말", "month": 5, "order": 7}'),
  ('jiji', '未', '미', '未', '지지', '{"ohang": "土", "yin_yang": "음", "animal": "양", "month": 6, "order": 8}'),
  ('jiji', '申', '신', '申', '지지', '{"ohang": "金", "yin_yang": "양", "animal": "원숭이", "month": 7, "order": 9}'),
  ('jiji', '酉', '유', '酉', '지지', '{"ohang": "金", "yin_yang": "음", "animal": "닭", "month": 8, "order": 10}'),
  ('jiji', '戌', '술', '戌', '지지', '{"ohang": "土", "yin_yang": "양", "animal": "개", "month": 9, "order": 11}'),
  ('jiji', '亥', '해', '亥', '지지', '{"ohang": "水", "yin_yang": "음", "animal": "돼지", "month": 10, "order": 12}')
ON CONFLICT (code) DO NOTHING;

-- 오행 상생 관계 (生)
INSERT INTO kg_edges (source_id, target_id, relation_type, description)
SELECT s.id, t.id, 'generates', s.label_ko || ' → ' || t.label_ko || ' (상생)'
FROM kg_nodes s, kg_nodes t
WHERE (s.code, t.code) IN (('木','火'), ('火','土'), ('土','金'), ('金','水'), ('水','木'))
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 오행 상극 관계 (剋)
INSERT INTO kg_edges (source_id, target_id, relation_type, description)
SELECT s.id, t.id, 'controls', s.label_ko || ' → ' || t.label_ko || ' (상극)'
FROM kg_nodes s, kg_nodes t
WHERE (s.code, t.code) IN (('木','土'), ('土','水'), ('水','火'), ('火','金'), ('金','木'))
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 천간 → 오행 소속 관계
INSERT INTO kg_edges (source_id, target_id, relation_type, description)
SELECT g.id, o.id, 'belongs_to', g.label_ko || '은(는) ' || o.label_ko || '에 속함'
FROM kg_nodes g, kg_nodes o
WHERE g.node_type = 'cheongan' AND o.node_type = 'ohang'
  AND g.properties->>'ohang' = o.code
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 지지 → 오행 소속 관계
INSERT INTO kg_edges (source_id, target_id, relation_type, description)
SELECT j.id, o.id, 'belongs_to', j.label_ko || '은(는) ' || o.label_ko || '에 속함'
FROM kg_nodes j, kg_nodes o
WHERE j.node_type = 'jiji' AND o.node_type = 'ohang'
  AND j.properties->>'ohang' = o.code
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 지지 충(沖) 관계
INSERT INTO kg_edges (source_id, target_id, relation_type, weight, description)
SELECT s.id, t.id, 'clashes', 2.0, s.label_ko || '↔' || t.label_ko || ' (충)'
FROM kg_nodes s, kg_nodes t
WHERE s.node_type = 'jiji' AND t.node_type = 'jiji'
  AND (s.code, t.code) IN (('子','午'), ('丑','未'), ('寅','申'), ('卯','酉'), ('辰','戌'), ('巳','亥'))
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

-- 천간합 관계
INSERT INTO kg_edges (source_id, target_id, relation_type, properties, description)
SELECT s.id, t.id, 'combines', ('{"result": "' || r || '"}')::jsonb, s.label_ko || '+' || t.label_ko || ' → ' || r || ' (천간합)'
FROM (VALUES ('甲','己','土'), ('乙','庚','金'), ('丙','辛','水'), ('丁','壬','木'), ('戊','癸','火')) AS v(sc, tc, r),
  kg_nodes s, kg_nodes t
WHERE s.code = v.sc AND t.code = v.tc
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;
