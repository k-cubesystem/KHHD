import { getFamilyMembers } from "@/app/actions/family-actions";
import { getUserTierLimits } from "@/app/actions/membership-limits";
import { getCurrentUserRole } from "@/app/actions/products";
import ManseClient from "./manse-client";

export default async function MansePage() {
    // Fetch data on server
    const [membersData, tierLimits, userRole] = await Promise.all([
        getFamilyMembers(),
        getUserTierLimits(),
        getCurrentUserRole()
    ]);

    // 관리자는 구독 여부와 무관하게 모든 프리미엄 기능 접근 가능
    const isAdmin = userRole.role === 'admin';
    const isSubscribed = isAdmin || tierLimits?.is_subscribed || false;

    return <ManseClient members={membersData} isSubscribed={isSubscribed} />;
}
