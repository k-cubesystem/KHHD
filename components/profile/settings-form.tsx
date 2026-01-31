"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({ user, profile }: { user: any, profile: any }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Parse birth date/time if exists, format usually YYYY-MM-DD HH:mm or separate fields
    // Assuming backend handles specific formats, here simplifying
    const [name, setName] = useState(profile?.full_name || "");
    const [birthDate, setBirthDate] = useState(profile?.birth_date || ""); // YYYY-MM-DD
    const [birthTime, setBirthTime] = useState(profile?.birth_time || ""); // HH:mm
    const [gender, setGender] = useState(profile?.gender || "male");
    const [calendarType, setCalendarType] = useState(profile?.calendar_type || "solar");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: name,
                    birth_date: birthDate,
                    birth_time: birthTime,
                    gender,
                    calendar_type: calendarType,
                    updated_at: new Date().toISOString()
                })
                .eq("id", user.id);

            if (error) {
                throw error;
            }

            toast.success("정보가 수정되었습니다.");
            router.refresh();
        } catch (error: any) {
            toast.error("수정 중 오류가 발생했습니다: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-serif text-ink-light">이름</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-surface/50 border-primary/20 focus:border-primary font-sans"
                    placeholder="홍길동"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-serif text-ink-light">성별</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" className="border-primary text-primary" />
                            <Label htmlFor="male" className="font-light cursor-pointer">남성</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" className="border-primary text-primary" />
                            <Label htmlFor="female" className="font-light cursor-pointer">여성</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-serif text-ink-light">양력/음력</Label>
                    <Select value={calendarType} onValueChange={setCalendarType}>
                        <SelectTrigger className="bg-surface/50 border-primary/20">
                            <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-primary/20">
                            <SelectItem value="solar">양력</SelectItem>
                            <SelectItem value="lunar">음력</SelectItem>
                            <SelectItem value="lunar_leap">음력(윤달)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-sm font-serif text-ink-light">생년월일</Label>
                    <Input
                        id="birthDate"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="bg-surface/50 border-primary/20 focus:border-primary font-sans"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="birthTime" className="text-sm font-serif text-ink-light">태어난 시간</Label>
                    <Input
                        id="birthTime"
                        type="time"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        className="bg-surface/50 border-primary/20 focus:border-primary font-sans"
                    />
                </div>
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-dim text-background font-serif font-bold text-base h-12"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    저장하기
                </Button>
            </div>
        </form>
    );
}
