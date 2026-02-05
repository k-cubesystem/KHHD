"use client";

import { EnergyChart } from "@/components/dashboard/energy-chart";

interface FiveElementsRadarProps {
    data: {
        wood: number;
        fire: number;
        earth: number;
        metal: number;
        water: number;
    };
}

/**
 * 오행 Radar Chart 래퍼 컴포넌트
 * 기존 EnergyChart 컴포넌트를 재사용하여 사용자의 오행 분포를 시각화
 */
export function FiveElementsRadar({ data }: FiveElementsRadarProps) {
    return (
        <div className="w-full max-w-sm mx-auto">
            <EnergyChart data={data} />
        </div>
    );
}
