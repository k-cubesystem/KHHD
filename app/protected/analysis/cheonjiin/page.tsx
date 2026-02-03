import { getFamilyMembers } from "@/app/actions/family-actions";
import { AnalysisClientPage } from "./analysis-client-page";

interface AnalysisPageProps {
    searchParams: Promise<{ targetId?: string }>;
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
    const members = await getFamilyMembers();
    const params = await searchParams;
    const targetId = params.targetId;

    return <AnalysisClientPage members={members} initialMemberId={targetId} />;
}
