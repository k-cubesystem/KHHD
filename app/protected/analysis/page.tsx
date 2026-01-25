import { getFamilyMembers } from "@/app/actions/family-actions";
import { AnalysisClientPage } from "./analysis-client-page";

export default async function AnalysisPage() {
    const members = await getFamilyMembers();

    return <AnalysisClientPage members={members} />;
}
