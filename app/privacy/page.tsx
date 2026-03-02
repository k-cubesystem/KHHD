import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 | 청담해화당',
  description: '청담해화당 개인정보처리방침',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <article className="prose prose-invert prose-sm sm:prose-base mx-auto max-w-3xl prose-headings:text-amber-200 prose-strong:text-amber-100 prose-a:text-amber-400 hover:prose-a:text-amber-300">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground no-underline hover:text-amber-400"
        >
          ← 홈으로 돌아가기
        </Link>

        <h1>개인정보처리방침</h1>
        <p className="text-muted-foreground">시행일: 2026년 3월 3일</p>

        <p>
          큐브시스템(이하 &quot;회사&quot;)은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와
          관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>

        <hr />

        <h2>제1조 (개인정보의 처리 목적)</h2>
        <p>
          회사는 &quot;청담해화당&quot; 서비스(이하 &quot;서비스&quot;) 제공을 위해 다음의 목적으로 개인정보를
          처리합니다. 처리하는 개인정보는 다음 목적 이외의 용도로 이용되지 않으며, 이용 목적이 변경되는 경우에는
          「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.
        </p>
        <ol>
          <li>
            <strong>회원 가입 및 관리</strong>: 회원제 서비스 이용에 따른 본인 확인, 회원자격 유지·관리, 서비스 부정이용
            방지, 각종 고지·통지
          </li>
          <li>
            <strong>사주·운세 분석 서비스 제공</strong>: 생년월일시 기반 사주팔자 분석, 천인지 분석, 궁합 분석,
            세운·월운 분석, 2026년 운세 분석, 재물운 분석 등 AI 기반 운세 서비스 제공
          </li>
          <li>
            <strong>AI 이미지 분석 서비스 제공</strong>: 관상(얼굴) 분석, 손금(손바닥) 분석, 풍수지리 분석을 위한 이미지
            처리
          </li>
          <li>
            <strong>유료 서비스 결제</strong>: 복채(포인트) 충전, 멤버십 구독, 결제 처리 및 환불
          </li>
          <li>
            <strong>마케팅 및 서비스 개선</strong>: 신규 서비스 개발, 이벤트 안내, 접속 빈도 분석, 서비스 이용 통계
          </li>
        </ol>

        <h2>제2조 (수집하는 개인정보의 항목)</h2>
        <table>
          <thead>
            <tr>
              <th>구분</th>
              <th>수집 항목</th>
              <th>수집 방법</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>회원가입 (필수)</td>
              <td>이메일, 비밀번호(암호화), 이름 또는 닉네임</td>
              <td>카카오/구글 소셜 로그인, 이메일 가입</td>
            </tr>
            <tr>
              <td>사주 분석 (필수)</td>
              <td>생년월일, 태어난 시간(시주), 성별, 이름(한글)</td>
              <td>사용자 직접 입력</td>
            </tr>
            <tr>
              <td>관상·손금 분석</td>
              <td>얼굴 사진, 손바닥 사진</td>
              <td>사용자 직접 업로드</td>
            </tr>
            <tr>
              <td>풍수지리 분석</td>
              <td>주거지 주소, 실내 사진</td>
              <td>사용자 직접 입력/업로드</td>
            </tr>
            <tr>
              <td>결제 정보</td>
              <td>결제 수단 정보, 결제 내역</td>
              <td>토스페이먼츠 결제 연동</td>
            </tr>
            <tr>
              <td>자동 수집</td>
              <td>IP 주소, 접속 일시, 서비스 이용 기록, 기기 정보, 쿠키</td>
              <td>서비스 이용 과정에서 자동 생성·수집</td>
            </tr>
          </tbody>
        </table>

        <h2>제3조 (개인정보의 보유 및 이용 기간)</h2>
        <p>
          회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시 동의받은 개인정보 보유·이용
          기간 내에서 개인정보를 처리·보유합니다.
        </p>
        <table>
          <thead>
            <tr>
              <th>보유 항목</th>
              <th>보유 기간</th>
              <th>근거</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>회원 정보</td>
              <td>회원 탈퇴 시까지</td>
              <td>서비스 이용 계약</td>
            </tr>
            <tr>
              <td>사주·운세 분석 기록</td>
              <td>회원 탈퇴 시 또는 분석 후 1년</td>
              <td>서비스 제공 목적</td>
            </tr>
            <tr>
              <td>얼굴·손바닥·실내 사진</td>
              <td>분석 완료 후 즉시 삭제 (서버 미보관)</td>
              <td>최소 수집 원칙</td>
            </tr>
            <tr>
              <td>결제 기록</td>
              <td>5년</td>
              <td>전자상거래법 제6조</td>
            </tr>
            <tr>
              <td>계약 또는 청약철회 기록</td>
              <td>5년</td>
              <td>전자상거래법 제6조</td>
            </tr>
            <tr>
              <td>소비자 불만·분쟁 처리 기록</td>
              <td>3년</td>
              <td>전자상거래법 제6조</td>
            </tr>
            <tr>
              <td>접속 로그</td>
              <td>3개월</td>
              <td>통신비밀보호법 제15조의2</td>
            </tr>
          </tbody>
        </table>

        <h2>제4조 (개인정보의 제3자 제공)</h2>
        <p>
          회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 다음의 경우를 제외하고는 정보주체의 사전
          동의 없이 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
        </p>
        <table>
          <thead>
            <tr>
              <th>제공받는 자</th>
              <th>제공 목적</th>
              <th>제공 항목</th>
              <th>보유 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>토스페이먼츠(주)</td>
              <td>결제 처리</td>
              <td>결제 정보</td>
              <td>결제 완료 후 5년</td>
            </tr>
            <tr>
              <td>Google (Gemini API)</td>
              <td>AI 분석 처리</td>
              <td>사주 정보, 업로드 이미지 (분석 요청 시 전송, Google 측 보관하지 않음)</td>
              <td>API 호출 시 일시 전송</td>
            </tr>
            <tr>
              <td>Supabase (미국)</td>
              <td>회원 인증 및 데이터 저장</td>
              <td>회원 정보, 분석 기록</td>
              <td>회원 탈퇴 시까지</td>
            </tr>
          </tbody>
        </table>
        <p>
          ※ Supabase 및 Google Gemini API를 통해 개인정보가 해외로 이전될 수 있으며, 이는 서비스 제공에 필수적인
          처리입니다. 해당 업체는 각각의 개인정보 보호 정책에 따라 정보를 안전하게 관리합니다.
        </p>

        <h2>제5조 (개인정보의 파기 절차 및 방법)</h2>
        <ol>
          <li>
            <strong>파기 절차</strong>: 이용목적이 달성된 개인정보는 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에
            따라 일정 기간 저장된 후 파기됩니다.
          </li>
          <li>
            <strong>파기 방법</strong>: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여
            삭제합니다. 업로드된 이미지(관상, 손금, 풍수 사진)는 AI 분석 완료 즉시 서버에서 삭제됩니다.
          </li>
        </ol>

        <h2>제6조 (정보주체의 권리·의무 및 행사 방법)</h2>
        <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
        <ol>
          <li>개인정보 열람 요구</li>
          <li>오류 등이 있을 경우 정정 요구</li>
          <li>삭제 요구</li>
          <li>처리정지 요구</li>
        </ol>
        <p>
          위 권리 행사는 서비스 내 &quot;마이페이지&quot;에서 직접 처리하거나, 아래 개인정보보호책임자에게 이메일로
          요청하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
        </p>

        <h2>제7조 (개인정보의 안전성 확보 조치)</h2>
        <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
        <ol>
          <li>비밀번호의 암호화 저장 및 관리 (Supabase Auth bcrypt 해싱)</li>
          <li>SSL/TLS 암호화 통신</li>
          <li>Row Level Security(RLS)를 통한 데이터베이스 접근 통제</li>
          <li>결제 정보의 토스페이먼츠 위탁 처리 (PCI-DSS 준수)</li>
          <li>개인정보 접근 권한의 최소화</li>
          <li>정기적인 보안 점검</li>
        </ol>

        <h2>제8조 (쿠키의 설치·운영 및 거부에 관한 사항)</h2>
        <p>
          회사는 이용자에게 개별적인 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는
          &quot;쿠키(cookie)&quot;를 사용합니다.
        </p>
        <ol>
          <li>
            <strong>쿠키의 사용 목적</strong>: 로그인 세션 유지, 서비스 이용 환경설정 저장, 이용 패턴 분석
          </li>
          <li>
            <strong>쿠키의 설치·운영 및 거부</strong>: 웹브라우저의 옵션 설정을 통해 쿠키 허용, 쿠키 차단 등의 설정을 할
            수 있습니다. 다만, 쿠키 저장을 거부할 경우 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다.
          </li>
        </ol>

        <h2>제9조 (개인정보 보호책임자)</h2>
        <table>
          <tbody>
            <tr>
              <td>성명</td>
              <td>박대건</td>
            </tr>
            <tr>
              <td>직책</td>
              <td>대표</td>
            </tr>
            <tr>
              <td>연락처</td>
              <td>010-2311-2010</td>
            </tr>
            <tr>
              <td>이메일</td>
              <td>privacy@haehwadang.com</td>
            </tr>
          </tbody>
        </table>

        <h2>제10조 (권익침해 구제 방법)</h2>
        <p>정보주체는 개인정보 침해로 인한 구제를 받기 위하여 다음 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
        <ul>
          <li>개인정보 침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
          <li>개인정보 분쟁조정위원회: (국번없이) 1833-6972 (kopico.go.kr)</li>
          <li>대검찰청 사이버수사과: (국번없이) 1301 (spo.go.kr)</li>
          <li>경찰청 사이버안전국: (국번없이) 182 (cyberbureau.police.go.kr)</li>
        </ul>

        <h2>제11조 (개인정보 처리방침 변경)</h2>
        <p>
          이 개인정보 처리방침은 2026년 3월 3일부터 적용됩니다. 이전의 개인정보 처리방침은 이 방침으로 대체됩니다. 변경
          사항이 있을 경우 시행 7일 전부터 서비스 내 공지사항을 통하여 고지합니다.
        </p>

        <hr />
        <p className="text-sm text-muted-foreground">
          큐브시스템 | 대표: 박대건 | 사업자등록번호: 205-16-69546
          <br />
          통신판매업신고: 제 2024-의정부흥선-0264호
          <br />
          주소: 경기도 의정부시 신촌로 39번길 50-20
        </p>
      </article>
    </div>
  )
}
