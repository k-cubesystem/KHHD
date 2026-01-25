import { PromptManagementClient } from "./prompt-management-client";
import { AnimatedHeader } from "@/components/admin/dashboard-stats";

export default function PromptManagementPage() {
    return (
        <>
            <AnimatedHeader title="AI Prompts" subtitle="AI 분석 로직에 사용되는 시스템 프롬프트를 관리합니다." />

            <div className="mt-8">
                <PromptManagementClient />
            </div>
        </>
    );
}
