"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeatureKey =
    | 'feat_saju_today'
    | 'feat_saju_compat'
    | 'feat_face_analysis'
    | 'feat_fengshui'
    | 'feat_payment_pg'
    | 'global_maintenance';

export interface FeatureConfig {
    isActive: boolean;
    accessLevel: 'all' | 'member' | 'tester' | 'admin';
    message?: string;
}

const DEFAULT_CONFIG: FeatureConfig = { isActive: true, accessLevel: 'all' };

export function useFeatureFlag(key: FeatureKey) {
    const [config, setConfig] = useState<FeatureConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFeature = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("system_settings")
                .select("value")
                .eq("key", key)
                .single();

            if (data?.value) {
                try {
                    const parsed = typeof data.value === 'string'
                        ? JSON.parse(data.value)
                        : data.value;
                    setConfig(parsed);
                } catch (e) {
                    console.error("Failed to parse feature flag:", e);
                }
            }
            setLoading(false);
        };

        loadFeature();
    }, [key]);

    return { ...config, loading };
}
