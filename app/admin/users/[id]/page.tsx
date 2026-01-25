import { getUserDetails } from "../actions";
import { UserDetailClient } from "./user-detail-client";
import { notFound } from "next/navigation";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
    const { profile, sajuRecords, familyMembers, payments, error } = await getUserDetails(params.id);

    if (error || !profile) {
        if (error === "Unauthorized" || error === "Forbidden") {
            return <div className="p-8 text-center text-red-500">Access Denied</div>;
        }
        notFound();
    }

    return (
        <UserDetailClient
            user={profile}
            sajuRecords={sajuRecords || []}
            familyMembers={familyMembers || []}
            payments={payments || []}
        />
    );
}
