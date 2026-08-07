# 신당 3.0 신위 에셋 파이프라인

스타일·명세 단일 소스: `TEAM_G_DESIGN/prd/PRD-shrine-3.0-deities-v1.md`

## 흐름

```
1) 스타일 참조 준비: assets-src/shrine/style-refs/ref1~3.png  (사용자 첨부 「설빛 온기」 시안)
2) 생성:  node scripts/shrine-assets/generate.mjs base        → assets-src/shrine/raw/{code}/base.png (녹색배경)
          node scripts/shrine-assets/generate.mjs emotions {code}
3) 키잉:  node scripts/shrine-assets/chroma.mjs raw/{code}/base.png public/shrine/deities/{code}/base.webp
4) DB:    shrine_deities.sprite_url = /shrine/deities/{code}/base.webp  (코드 변경 0)
```

## prereq

- `sharp`(투명배경 크로마키)는 **dev 전용**. 공유 `/d/anti/haehwadang/node_modules`에 설치됨(v0.35.3). 새 환경이면 `cd /d/anti/haehwadang && npm i sharp`. 앱 런타임 의존성 아님 → 배포 package.json엔 미포함(의도).

## ⚠️ 실행 전 확인 (OPUS)

- `generate.mjs`의 **모델 ID**(`SHRINE_IMAGE_MODEL`, 기본 `gemini-3.1-flash-image`)를 실제 사용 가능 값으로 검증. `/claude-api` 아님 — Gemini 문서로 확인.
- 키: 앱과 동일 `GEMINI_API_KEY`(.env.local). `.env.local`은 **읽기 전용 참조만**(규칙상 편집 금지 — dotenv 로드만).
- Gemini 알파 미지원 → 반드시 녹색배경 생성 후 `chroma.mjs`. 스필 심하면 `chroma.mjs`의 `G_DOMINANCE`/`G_MIN` 조정.
- 투명 품질이 안 나오는 컷만 `gpt-image-1.5`(background:transparent) 보조.

## 외부 발주

PRD §4 + style-refs를 함께 전달. 납품 규격 PRD §1.3. 신위당 9컷(스탠딩1+표정7+초상1) + 원본 레이어분리(PSD/CLIP).

## 산출 구조

```
public/shrine/deities/{code}/{base,neutral,smile,stern,sad,surprised,bless,angry,portrait}.webp
public/shrine/themes/{theme}/{wall,floor}.webp
public/shrine/stage/{theme}/room-{wall,floor}-{tile,mural}.webp  ← stage-theme-room.mjs (테마 무대 · `<code|all> [--plan]`)
public/shrine/fx/{fxkey}.webp
```
