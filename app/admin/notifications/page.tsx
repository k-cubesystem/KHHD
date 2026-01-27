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

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-zen-border pb-4">
                <Bell className="w-6 h-6 text-zen-gold" />
                <h1 className="text-2xl font-bold font-serif text-zen-text">알림 및 자동화 관리</h1>
            </div>

            <Tabs defaultValue="settings">
                <TabsList>
                    <TabsTrigger value="settings">자동 발송 설정</TabsTrigger>
                    <TabsTrigger value="logs">발송 로그</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6 mt-6">
                    <Card className="p-6 space-y-8">
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-zen-wood" /> 오늘의 운세 자동 발송
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-zen-bg rounded-sm border border-zen-border">
                                        <div className="space-y-1">
                                            <Label className="font-bold">자동 발송 활성화</Label>
                                            <p className="text-xs text-zen-muted">매일 정해진 시간에 운세를 발송합니다.</p>
                                        </div>
                                        <Switch
                                            checked={settings['daily_fortune_enabled'] === 'true'}
                                            onCheckedChange={(c) => handleSave('daily_fortune_enabled', String(c))}
                                        />
                                    </div>

                                    <div className="p-4 bg-zen-bg rounded-sm border border-zen-border">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label className="font-bold">즉시 실행 테스트</Label>
                                                <p className="text-xs text-zen-muted">스케줄과 무관하게 지금 즉시 발송합니다.</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleManualRun}
                                                disabled={running}
                                                className="border-zen-gold text-zen-gold hover:bg-zen-gold/10"
                                            >
                                                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                                지금 실행
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="font-bold">발송 시간 (KST)</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                type="time"
                                                value={settings['daily_fortune_time'] || "08:00"}
                                                onChange={(e) => setSettings(prev => ({ ...prev, daily_fortune_time: e.target.value }))}
                                                className="w-40"
                                            />
                                            <Button onClick={() => handleSave('daily_fortune_time', settings['daily_fortune_time'])}>
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="font-bold">카카오 알림톡 템플릿 ID</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                value={settings['kakao_template_id'] || ""}
                                                onChange={(e) => setSettings(prev => ({ ...prev, kakao_template_id: e.target.value }))}
                                                placeholder="KA01..."
                                            />
                                            <Button onClick={() => handleSave('kakao_template_id', settings['kakao_template_id'])}>
                                                저장
                                            </Button>
                                        </div>
                                        <p className="text-xs text-zen-muted mt-2"> Solapi/CoolSMS 관리자에서 승인된 템플릿 ID를 입력하세요.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card className="p-0 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zen-bg border-b border-zen-border">
                                <tr>
                                    <th className="p-3 text-left">발송 시간</th>
                                    <th className="p-3 text-left">사용자</th>
                                    <th className="p-3 text-left">상태</th>
                                    <th className="p-3 text-left">메시지</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b border-zen-border/50 hover:bg-zen-bg/30">
                                        <td className="p-3">{new Date(log.sent_at).toLocaleString()}</td>
                                        <td className="p-3">
                                            <div className="font-bold">{log.profiles?.name || "Unknown"}</div>
                                            <div className="text-xs text-zen-muted">{log.profiles?.email}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${log.status === 'SENT' ? 'bg-green-100 text-green-700' :
                                                log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-zen-muted break-all max-w-xs">{log.error_message || "-"}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-zen-muted">기록이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
