import { getDestinyTargets } from "@/app/actions/destiny-targets";
import { AnalysisClientPage } from "./analysis-client-page";

interface AnalysisPageProps {
    searchParams: Promise<{ targetId?: string }>;
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
    const targets = await getDestinyTargets();
    const params = await searchParams;
    const targetId = params.targetId;

    return <AnalysisClientPage targets={targets} initialTargetId={targetId} />;
}
