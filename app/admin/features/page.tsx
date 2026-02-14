import { getFeatureCosts } from "./actions";
import FeatureCostManagement from "./feature-cost-management-client";

export default async function FeatureCostsPage() {
    const features = await getFeatureCosts();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">기능별 복채 소모량 관리</h1>
                <p className="text-muted-foreground mt-2">
                    각 AI 기능의 복채 소모량을 실시간으로 조정할 수 있습니다. (1 복채 = 1만냥)
                </p>
            </div>

            <FeatureCostManagement initialFeatures={features} />
        </div>
    );
}
