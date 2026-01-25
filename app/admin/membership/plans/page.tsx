import { AnimatedHeader } from "@/components/admin/dashboard-stats";
import { PlanManagementClient } from "./plan-management-client";

export default function AdminMembershipPlansPage() {
    return (
        <>
            <AnimatedHeader
                title="스토어 관리 (멤버십/상품)"
                subtitle="멤버십 플랜과 부적 상품(가격)을 통합 관리합니다."
            />

            <div className="mt-8">
                <PlanManagementClient />
            </div>
        </>
    );
}
