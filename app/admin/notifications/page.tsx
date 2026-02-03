"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bell, Clock, Save, Loader2, Send, Play } from "lucide-react";
import { getNotificationSettings, updateNotificationSetting, getNotificationLogs, runManualAutomation } from "./actions";

export default function NotificationAdminPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const s = await getNotificationSettings();
            setSettings(s);
            const l = await getNotificationLogs();
            setLogs(l.data || []);
        } catch (error) {
            console.error(error);
            toast.error("데이터 로드 실패");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(key: string, value: string) {
        setSaving(true);
        const result = await updateNotificationSetting(key, value);
        if (result.success) {
            toast.success("설정이 저장되었습니다.");
            setSettings(prev => ({ ...prev, [key]: value }));
        } else {
            toast.error("저장 실패");
        }
        setSaving(false);
    }

    async function handleManualRun() {
        if (!confirm("현재 활성화된 모든 구독자에게 운세를 즉시 발송합니다. 계속하시겠습니까?")) return;

        setRunning(true);
        const result = await runManualAutomation();
        if (result.success) {
            toast.success(result.message);
            loadData(); // Reload logs
        } else {
            toast.error("실행 실패: " + result.message);
        }
        setRunning(false);
    }

    if (loading) return (
        <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-2.5 md:gap-3 border-b border-stone-700/30 pb-3 md:pb-4">
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-gold-500" />
                <h1 className="text-lg md:text-2xl font-bold font-serif text-stone-100">알림 및 자동화 관리</h1>
            </div>

            <Tabs defaultValue="settings">
                <TabsList className="bg-stone-900/50 border-stone-700/30">
                    <TabsTrigger value="settings" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg">자동 발송 설정</TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg">발송 로그</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 shadow-lg overflow-hidden">
                        {/* Noise Overlay */}
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                        <div className="relative space-y-6 md:space-y-8">
                            <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-stone-100 font-serif">
                                <Clock className="w-4 h-4 md:w-5 md:h-5 text-gold-500" /> 오늘의 운세 자동 발송
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center justify-between p-3 md:p-4 bg-stone-900/50 rounded-lg border border-stone-700/30">
                                        <div className="space-y-0.5 md:space-y-1 flex-1 min-w-0 pr-2">
                                            <Label className="font-bold text-xs md:text-sm text-stone-200">자동 발송 활성화</Label>
                                            <p className="text-[10px] md:text-xs text-stone-500">매일 정해진 시간에 운세를 발송합니다.</p>
                                        </div>
                                        <Switch
                                            checked={settings['daily_fortune_enabled'] === 'true'}
                                            onCheckedChange={(c) => handleSave('daily_fortune_enabled', String(c))}
                                        />
                                    </div>

                                    <div className="p-3 md:p-4 bg-stone-900/50 rounded-lg border border-stone-700/30">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                            <div className="space-y-0.5 md:space-y-1 flex-1 min-w-0">
                                                <Label className="font-bold text-xs md:text-sm text-stone-200">즉시 실행 테스트</Label>
                                                <p className="text-[10px] md:text-xs text-stone-500">스케줄과 무관하게 지금 즉시 발송합니다.</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleManualRun}
                                                disabled={running}
                                                className="h-7 md:h-8 text-xs border-gold-500/30 text-gold-400 hover:bg-gold-500/10 hover:border-gold-500/50"
                                            >
                                                {running ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <><Play className="w-3 h-3 md:w-4 md:h-4 mr-1" /> 지금 실행</>}
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="font-bold text-xs md:text-sm text-stone-300">발송 시간 (KST)</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                type="time"
                                                value={settings['daily_fortune_time'] || "08:00"}
                                                onChange={(e) => setSettings(prev => ({ ...prev, daily_fortune_time: e.target.value }))}
                                                className="w-32 md:w-40 h-8 md:h-9 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200"
                                            />
                                            <Button onClick={() => handleSave('daily_fortune_time', settings['daily_fortune_time'])} size="sm" className="h-8 md:h-9 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20 text-xs">
                                                {saving ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <><Save className="w-3 h-3 md:w-4 md:h-4 mr-1" /> 저장</>}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 md:space-y-4">
                                    <div>
                                        <Label className="font-bold text-xs md:text-sm text-stone-300">카카오 알림톡 템플릿 ID</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                value={settings['kakao_template_id'] || ""}
                                                onChange={(e) => setSettings(prev => ({ ...prev, kakao_template_id: e.target.value }))}
                                                placeholder="KA01..."
                                                className="h-8 md:h-9 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200"
                                            />
                                            <Button onClick={() => handleSave('kakao_template_id', settings['kakao_template_id'])} size="sm" className="h-8 md:h-9 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20 text-xs">
                                                저장
                                            </Button>
                                        </div>
                                        <p className="text-[10px] md:text-xs text-stone-500 mt-2">Solapi/CoolSMS 관리자에서 승인된 템플릿 ID를 입력하세요.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card className="relative p-0 overflow-hidden bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 shadow-lg">
                        {/* Noise Overlay */}
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                        <div className="relative overflow-x-auto">
                            <table className="w-full text-xs md:text-sm">
                                <thead className="bg-stone-900/50 border-b border-stone-700/30">
                                    <tr>
                                        <th className="p-2 md:p-3 text-left text-stone-400 font-serif font-bold">발송 시간</th>
                                        <th className="p-2 md:p-3 text-left text-stone-400 font-serif font-bold">사용자</th>
                                        <th className="p-2 md:p-3 text-left text-stone-400 font-serif font-bold">상태</th>
                                        <th className="p-2 md:p-3 text-left text-stone-400 font-serif font-bold">메시지</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-stone-700/30 hover:bg-stone-800/30 transition-colors">
                                            <td className="p-2 md:p-3 text-stone-400 font-mono text-[10px] md:text-xs">{new Date(log.sent_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-2 md:p-3">
                                                <div className="font-bold text-stone-200 text-xs md:text-sm">{log.profiles?.full_name || "Unknown"}</div>
                                                <div className="text-[10px] md:text-xs text-stone-500 truncate max-w-[150px] md:max-w-none">{log.profiles?.email}</div>
                                            </td>
                                            <td className="p-2 md:p-3">
                                                <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold border ${log.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    log.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-stone-700/30 text-stone-500 border-stone-600/30'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-3 text-stone-500 break-all max-w-xs text-[10px] md:text-xs">{log.error_message || "-"}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 md:p-8 text-center text-stone-500 text-xs md:text-sm">기록이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
