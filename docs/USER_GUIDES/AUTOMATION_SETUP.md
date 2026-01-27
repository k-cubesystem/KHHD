# 🤖 자동화 및 카카오 알림톡 연동 가이드

이 문서는 **'오늘의 운세 자동 발송'** 기능을 실제 운영 환경(Vercel + Kakao)에 배포하기 위한 설정 가이드입니다.

---

## 📅 1. Vercel Cron (스케줄러) 설정

서버 없이도 매일 정해진 시간에 `/api/cron/daily-fortune` API를 호출하도록 설정합니다.

### 1.1 `vercel.json` 확인
프로젝트 루트에 생성된 `vercel.json` 파일이 스케줄을 정의합니다.
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-fortune",
      "schedule": "0 22 * * *"
    }
  ]
}
```
*   **시간 설정**: Vercel Cron은 **UTC 기준**입니다.
    *   `0 22 * * *` = UTC 22:00 = **한국 시간 오전 07:00**
    *   시간을 바꾸려면 [Crontab Guru](https://crontab.guru/)를 참고하여 UTC 기준으로 수정하세요.

### 1.2 환경 변수 설정 (Vercel Dashboard)
보안을 위해 API는 `CRON_SECRET`이 일치할 때만 동작합니다.
1.  Vercel 대시보드 > Settings > Environment Variables 이동.
2.  `CRON_SECRET` 변수를 추가합니다. (값은 강력한 비밀번호 문자열 생성 권장)
3.  Vercel Cron이 실행될 때 이 값을 자동으로 헤더에 포함시킵니다.

### 1.3 테스트 방법
*   배포 후 [Vercel Dashboard > Settings > Cron Jobs] 메뉴에서 `Run Now` 버튼으로 즉시 실행해볼 수 있습니다.

---

## 💬 2. 카카오 알림톡 연동 (Solapi 기준)

카카오 비즈니스 채널을 직접 연동하는 것은 복잡하므로, 개발 친화적인 **Solapi (구 CoolSMS)** 서비스를 사용합니다.

### 2.1 준비 사항
1.  [Solapi 가입](https://solapi.com/) 및 카카오톡 채널 연동.
2.  **API Key** 및 **API Secret** 발급.
3.  **알림톡 템플릿 등록** (Solapi 대시보드 > 카카오톡 > 템플릿 관리).
    *   **템플릿 예시**:
        ```text
        [해화당] #{name}님, 오늘의 운세가 도착했습니다.
        
        오늘의 총운: #{fortune}
        
        지금 바로 확인해보세요.
        ```
    *   **템플릿 ID (PfID)**를 확보해야 합니다.

### 2.2 환경 변수 추가 (.env)
```env
SOLAPI_API_KEY=발급받은_키
SOLAPI_API_SECRET=발급받은_시크릿
SOLAPI_SENDER_PHONE=발신번호(사전에 등록된 번호)
```

### 2.3 코드 연동 (app/actions/notification.ts 수정)
현재 `Mock`으로 되어 있는 코드를 실제 Solapi 코드로 변경합니다.

**패키지 설치**:
```bash
npm install solapi
```

**코드 수정 예시**:
```typescript
import { SolapiMessageService } from "solapi";

export async function sendKakaoNotification(userId, templateId, variables) {
    const messageService = new SolapiMessageService(
        process.env.SOLAPI_API_KEY, 
        process.env.SOLAPI_API_SECRET
    );

    // ... 사용자 전화번호 조회 ...

    const result = await messageService.send({
        to: userPhone,
        from: process.env.SOLAPI_SENDER_PHONE,
        kakaoOptions: {
            pfId: "연동된_채널_PFID",
            templateId: templateId,
            variables: variables // #{name}, #{fortune} 등 템플릿 변수와 일치해야 함
        }
    });
}
```

---

## ⚙️ 3. 관리자 페이지 설정

배포가 완료되면 `/admin/notifications` 페이지에서 다음을 수행하세요.

1.  **자동 발송 활성화**: 스위치 ON.
2.  **템플릿 ID 입력**: Solapi에서 승인받은 템플릿 ID 입력.
3.  **테스트**: 내일 아침 7시(KST) 발송 로그 확인.
