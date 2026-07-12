# 신위·테마 이미지 제작 스펙 (외부 제작 핸드오프)

> 스타일: 「설빛 온기」 — 따뜻한 수채 K-애니. 큰 갈색 눈망울·밝은 하이라이트, 홍조 볼, 골드 역광·림라이트, 한복/털 디테일, semi-deformed, 포근함(무섭지 않게).
> 배경 규칙: 캐릭터는 **크로마 그린 #00FF00** 단색 배경(투명 키잉용). 초상만 소프트 보케 배경 허용.
> 산출: PNG(권장) 또는 고품질 JPEG. 스탠딩은 전신·발까지, 정면. 파일명은 각 항목의 `경로` 사용.

## 물량 요약

| 구분                        | 장수       | 우선순위 | 용도                                   |
| --------------------------- | ---------- | -------- | -------------------------------------- |
| Phase 1 — 스탠딩 스프라이트 | 17         | **필수** | 제단 신위 렌더(`sprite_url`)           |
| Phase 1 — 초상(bust)        | 17         | **필수** | 아바타·카드·대화 헤더(`portrait_url`)  |
| Phase 2 — 표정 세트         | 119 (17×7) | 권장     | 신과의 대화 감정→표정 전환             |
| 테마 배경                   | 4          | 선택     | 신당 방 배경(현재 CSS 그라디언트 대체) |
| **합계**                    | **157**    |          |                                        |

먼저 **Phase 1(34장)**만 제작하면 앱에서 신위가 이모지 폴백 대신 실제 이미지로 뜹니다. 표정·테마는 이후 확장 권장.

---

## 신위 17종

### 1. 삼신할매 (三神) — `samsin`

- **등급**: 수호신(무료) · **오행**: earth · **관장**: 자녀·출산·가정화목 · **강조색(aura)**: #E8A0A0
- **외형(공통 참조)**: grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/samsin/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/samsin/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/samsin/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/samsin/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/samsin/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/samsin/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/samsin/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/samsin/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/samsin/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "samsin" deity, grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 2. 조왕신 (竈王) — `jowang`

- **등급**: 수호신(무료) · **오행**: fire · **관장**: 건강·식복·집안평안 · **강조색(aura)**: #D96C3F
- **외형(공통 참조)**: kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/jowang/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/jowang/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/jowang/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/jowang/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/jowang/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/jowang/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/jowang/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/jowang/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/jowang/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "jowang" deity, kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 3. 성주신 (城主) — `seongju`

- **등급**: 수호신(무료) · **오행**: wood · **관장**: 새출발·이사·가장운 · **강조색(aura)**: #4A7C59
- **외형(공통 참조)**: upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/seongju/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/seongju/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/seongju/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/seongju/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/seongju/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/seongju/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/seongju/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/seongju/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/seongju/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seongju" deity, upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 4. 터주대감 (基主) — `teoju`

- **등급**: 수호신(무료) · **오행**: earth · **관장**: 재물안정·집터·부동산 · **강조색(aura)**: #D4A017
- **외형(공통 참조)**: jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/teoju/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/teoju/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/teoju/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/teoju/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/teoju/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/teoju/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/teoju/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/teoju/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/teoju/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "teoju" deity, jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 5. 동자신 (童子) — `dongja`

- **등급**: 수호신(무료) · **오행**: wood · **관장**: 인연·소통·시험운 · **강조색(aura)**: #6FA8DC
- **외형(공통 참조)**: mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/dongja/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/dongja/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/dongja/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/dongja/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/dongja/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/dongja/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/dongja/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/dongja/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/dongja/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dongja" deity, mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 6. 선녀신 (仙女) — `seonnyeo`

- **등급**: 수호신(무료) · **오행**: water · **관장**: 애정·아름다움·예술 · **강조색(aura)**: #5B8DBE
- **외형(공통 참조)**: serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/seonnyeo/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/seonnyeo/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/seonnyeo/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/seonnyeo/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/seonnyeo/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/seonnyeo/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/seonnyeo/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/seonnyeo/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/seonnyeo/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "seonnyeo" deity, serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 7. 대감신 (大監) — `daegam`

- **등급**: 명신(1복채) · **오행**: metal · **관장**: 재물증식·사업번창 · **강조색(aura)**: #C9A84C
- **외형(공통 참조)**: wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/daegam/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/daegam/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/daegam/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/daegam/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/daegam/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/daegam/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/daegam/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/daegam/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/daegam/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "daegam" deity, wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 8. 도깨비 대장 — `dokkaebi`

- **등급**: 명신(1복채) · **오행**: fire · **관장**: 횡재·역전운·승부 · **강조색(aura)**: #3FBF9F
- **외형(공통 참조)**: goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/dokkaebi/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/dokkaebi/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/dokkaebi/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/dokkaebi/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/dokkaebi/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/dokkaebi/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/dokkaebi/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/dokkaebi/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/dokkaebi/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "dokkaebi" deity, goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 9. 바리공주 — `bari`

- **등급**: 명신(1복채) · **오행**: water · **관장**: 치유·회복·마음위로 · **강조색(aura)**: #B8A8D9
- **외형(공통 참조)**: healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/bari/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/bari/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/bari/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/bari/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/bari/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/bari/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/bari/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/bari/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/bari/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "bari" deity, healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 10. 업신 (業神) — `eopsin`

- **등급**: 명신(1복채) · **오행**: earth · **관장**: 재물지킴·저축 · **강조색(aura)**: #8C8478
- **외형(공통 참조)**: shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/eopsin/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/eopsin/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/eopsin/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/eopsin/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/eopsin/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/eopsin/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/eopsin/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/eopsin/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/eopsin/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "eopsin" deity, shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 11. 최영 장군 — `choiyoung`

- **등급**: 장군신(2복채) · **오행**: metal · **관장**: 관재·소송·승진경쟁 · **강조색(aura)**: #C0C8D0
- **외형(공통 참조)**: General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/choiyoung/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/choiyoung/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/choiyoung/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/choiyoung/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/choiyoung/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/choiyoung/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/choiyoung/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/choiyoung/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/choiyoung/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "choiyoung" deity, General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 12. 관성제군 (關聖) — `gwanseong`

- **등급**: 장군신(2복채) · **오행**: fire · **관장**: 사업·계약·의리 · **강조색(aura)**: #9E2B2B
- **외형(공통 참조)**: Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/gwanseong/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/gwanseong/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/gwanseong/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/gwanseong/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/gwanseong/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/gwanseong/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/gwanseong/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/gwanseong/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/gwanseong/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "gwanseong" deity, Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 13. 백마신장 (白馬) — `baekma`

- **등급**: 장군신(2복채) · **오행**: metal · **관장**: 액막이·삼재방어 · **강조색(aura)**: #E8E4DC
- **외형(공통 참조)**: white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/baekma/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/baekma/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/baekma/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/baekma/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/baekma/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/baekma/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/baekma/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/baekma/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/baekma/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "baekma" deity, white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 14. 칠성신 (七星) — `chilseong`

- **등급**: 천신(3복채) · **오행**: water · **관장**: 수명·소원성취·자녀대운 · **강조색(aura)**: #2D5F8A
- **외형(공통 참조)**: seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/chilseong/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/chilseong/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/chilseong/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/chilseong/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/chilseong/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/chilseong/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/chilseong/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/chilseong/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/chilseong/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "chilseong" deity, seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 15. 용왕신 (龍王) — `yongwang`

- **등급**: 천신(3복채) · **오행**: water · **관장**: 큰재물흐름·해외운 · **강조색(aura)**: #3F8FA8
- **외형(공통 참조)**: dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/yongwang/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/yongwang/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/yongwang/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/yongwang/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/yongwang/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/yongwang/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/yongwang/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/yongwang/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/yongwang/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "yongwang" deity, dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 16. 산신령 (山神) — `sansin`

- **등급**: 천신(3복채) · **오행**: earth · **관장**: 건강대운·학업대성 · **강조색(aura)**: #7C9A6E
- **외형(공통 참조)**: mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/sansin/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/sansin/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/sansin/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/sansin/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/sansin/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/sansin/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/sansin/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/sansin/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/sansin/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "sansin" deity, mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

### 17. 옥황상제 (玉皇) — `okhwang`

- **등급**: 천신(4복채·시즌한정) · **오행**: all · **관장**: 전 영역 가호 · **강조색(aura)**: #E8D5A0
- **외형(공통 참조)**: Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty

#### ① 스탠딩 스프라이트 (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, neutral gentle expression, full body standing pose, front facing, feet visible, solid chroma green background #00FF00, no text, no watermark, high detail
```

경로: `public/shrine/deities/okhwang/base.png`

#### ② 초상 bust (필수)

```
Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality
```

경로: `public/shrine/deities/okhwang/portrait.png`

#### ③ 표정 세트 (Phase 2)

> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.

- **neutral** → `public/shrine/deities/okhwang/neutral.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, calm gentle neutral expression, soft eyes, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **smile** → `public/shrine/deities/okhwang/smile.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, warm bright smile, softly curved eyes, cheerful, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **stern** → `public/shrine/deities/okhwang/stern.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, serious firm expression, focused steady eyes, dignified (not scary), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **sad** → `public/shrine/deities/okhwang/sad.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, sorrowful downcast eyes, slight frown, tender melancholy, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **surprised** → `public/shrine/deities/okhwang/surprised.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, wide open eyes, raised eyebrows, slightly open mouth, startled, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **bless** → `public/shrine/deities/okhwang/bless.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, serene benevolent expression, eyes softly half-closed, gentle blessing look, bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```
- **angry** → `public/shrine/deities/okhwang/angry.png`
  ```
  Korean traditional deity, warm painterly anime illustration, soft watercolor shading, large expressive brown eyes with bright highlights, rosy blush cheeks, warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, semi-deformed proportions, wholesome and warm, not scary, "okhwang" deity, Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty, righteous fierce frown, intense determined eyes, brave (dignified, not frightening), bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail
  ```

---

## 테마 배경 4종 (선택)

> 현재 테마는 CSS 그라디언트로 렌더됩니다. 아래 배경 이미지를 넣으면 방 분위기가 살아납니다. 인물 없음, 중앙에 신위가 설 여백. 세로형(모바일 우선) 권장.

### 1. 초가 신당 — `choga` (무속성(기본))

```
Korean traditional shrine room interior, warm painterly anime background, soft watercolor, atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark, humble thatched-roof village shrine, warm earthen tones, straw and wood, accent color #c9a84c
```

경로(권장): `public/shrine/themes/choga/room.webp` · DB `shrine_theme_packs.assets.wall`/`.floor`에 이미지 URL로 교체

### 2. 조선 반가 — `banga` (목(wood))

```
Korean traditional shrine room interior, warm painterly anime background, soft watercolor, atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark, noble Joseon hanok interior, dark wood beams, folk-painting (minhwa) accents, dignified, accent color #e8d5a0
```

경로(권장): `public/shrine/themes/banga/room.webp` · DB `shrine_theme_packs.assets.wall`/`.floor`에 이미지 URL로 교체

### 3. 용궁 — `yonggung` (수(water))

```
Korean traditional shrine room interior, warm painterly anime background, soft watercolor, atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark, underwater dragon palace, teal and jade, pearl light, flowing water and coral, accent color #7fd4c1
```

경로(권장): `public/shrine/themes/yonggung/room.webp` · DB `shrine_theme_packs.assets.wall`/`.floor`에 이미지 URL로 교체

### 4. 도깨비 불 — `dokkaebi` (화(fire))

```
Korean traditional shrine room interior, warm painterly anime background, soft watercolor, atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark, eerie-yet-playful dokkaebi realm, deep violet dark, green goblin-fire glow, accent color #c84040
```

경로(권장): `public/shrine/themes/dokkaebi/room.webp` · DB `shrine_theme_packs.assets.wall`/`.floor`에 이미지 URL로 교체

---

## 배치·연동 (제작 후)

1. 스탠딩/표정 원본을 `assets-src/shrine/raw/{code}/`에 두고 `node scripts/shrine-assets/chroma.mjs` 실행 → 그린스크린 제거 → `public/shrine/deities/{code}/*.webp` 투명 생성. (초상은 보케 배경이라 키잉 제외)
2. DB 업데이트: `shrine_deities.sprite_url` = base, `portrait_url` = portrait. 표정은 `{code}/{emotion}.webp` 규칙으로 코드가 참조.
3. 테마: `shrine_theme_packs.assets`의 `wall`/`floor`를 이미지 URL로 교체.
4. 코드 변경 0 — 경로 규칙만 맞으면 즉시 반영(이모지 폴백 → 실제 이미지).
