import type { Metadata } from 'next'
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: '비밀번호 찾기',
  description: '비밀번호를 잊으셨나요? 이메일로 비밀번호를 재설정하세요.',
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
