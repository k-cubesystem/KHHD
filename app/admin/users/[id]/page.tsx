import { getUserDetails } from "../actions";
import { UserDetailClient } from "./user-detail-client";
import { notFound } from "next/navigation";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
    const result = await getUserDetails(params.id);

    if (result.error || !result.profile) {
        if (result.error === "Unauthorized" || result.error === "Forbidden") {
            return <div className="p-8 text-center text-red-500">Access Denied</div>;
        }
        notFound();
    }

    const { profile, sajuRecords, familyMembers, payments, wallet, subscription, authCreatedAt } = result as any;

    return (
        <UserDetailClient
            user={profile}
            sajuRecords={sajuRecords || []}
            familyMembers={familyMembers || []}
            payments={payments || []}
            wallet={wallet}
            subscription={subscription}
            authCreatedAt={authCreatedAt}
        />
    );
}
