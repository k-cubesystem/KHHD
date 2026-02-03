import { createClient } from "@/lib/supabase/server";

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

/**
 * [Server-Side] 특정 기능 활성화 여부 확인
 */
export async function getFeatureStatus(key: FeatureKey): Promise<FeatureConfig> {
    const supabase = await createClient(); // Await the createClient call

    try {
        const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (!data) {
            // DB에 키가 없으면 기본적으로 닫혀있는 것으로 간주 (Fail-Safe)
            return { isActive: false, accessLevel: 'admin' };
        }

        // JSON 파싱 (DB에는 TEXT로 저장됨)
        if (typeof data.value === 'string') {
            return JSON.parse(data.value) as FeatureConfig;
        }

        return data.value as FeatureConfig;
    } catch (e) {
        console.error(`[FeatureFlag] Error checking ${key}:`, e);
        return { isActive: false, accessLevel: 'admin' };
    }
}

/**
 * [Server-Side] 전체 시스템 점검 중인지 확인
 */
export async function checkMaintenanceMode(): Promise<{ isMaintenance: boolean; message?: string }> {
    const config = await getFeatureStatus('global_maintenance');
    return {
        isMaintenance: config.isActive,
        message: config.message
    };
}
