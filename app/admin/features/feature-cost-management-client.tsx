"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateFeatureCost } from "./actions";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface FeatureCost {
    key: string;
    label: string;
    cost: number;
    is_active: boolean;
    description: string | null;
}

export default function FeatureCostManagement({ initialFeatures }: { initialFeatures: FeatureCost[] }) {
    const [features, setFeatures] = useState(initialFeatures);
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpdate = async (key: string) => {
        setLoading(key);
        try {
            const feature = features.find(f => f.key === key);
            if (!feature) return;

            await updateFeatureCost(key, feature.cost, feature.is_active);
            toast.success("부적 소모량이 업데이트되었습니다.");
        } catch (error: any) {
            toast.error(error.message || "업데이트 실패");
        } finally {
            setLoading(null);
        }
    };

    const updateCost = (key: string, cost: number) => {
        setFeatures(features.map(f =>
            f.key === key ? { ...f, cost } : f
        ));
    };

    const toggleActive = (key: string) => {
        setFeatures(features.map(f =>
            f.key === key ? { ...f, is_active: !f.is_active } : f
        ));
    };

    return (
        <div className="grid gap-4">
            {features.map((feature) => (
                <Card key={feature.key} className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">{feature.label}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Key: {feature.key}</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">부적</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={feature.cost}
                                    onChange={(e) => updateCost(feature.key, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                />
                                <span className="text-sm">장</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">활성</label>
                                <Switch
                                    checked={feature.is_active}
                                    onCheckedChange={() => toggleActive(feature.key)}
                                />
                            </div>

                            <Button
                                onClick={() => handleUpdate(feature.key)}
                                disabled={loading === feature.key}
                                size="sm"
                            >
                                {loading === feature.key ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        저장
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
