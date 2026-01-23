"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar, Clock, User } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
    userId: string;
    initialData: any;
}

export function ProfileEditForm({ userId, initialData }: ProfileEditFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        birth_date: initialData?.birth_date || "",
        birth_time: initialData?.birth_time || "",
        gender: initialData?.gender || "male",
        calendar_type: initialData?.calendar_type || "solar",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = createClient();

            // Upsert profile data
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    birth_date: formData.birth_date,
                    birth_time: formData.birth_time,
                    gender: formData.gender,
                    calendar_type: formData.calendar_type,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;

            toast.success("사주 정보가 저장되었습니다!");
            router.push("/protected/profile");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving profile:", error);
            toast.error("저장 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 생년월일 */}
            <div className="space-y-2">
                <Label htmlFor="birth_date" className="flex items-center gap-2 text-zen-text font-serif">
                    <Calendar className="w-4 h-4 text-zen-gold" />
                    생년월일
                </Label>
                <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    required
                    className="border-zen-border focus:border-zen-gold"
                />
                <p className="text-xs text-zen-muted">
                    양력/음력 선택은 아래에서 해주세요
                </p>
            </div>

            {/* 양력/음력 선택 */}
            <div className="space-y-2">
                <Label className="text-zen-text font-serif">
                    달력 종류
                </Label>
                <RadioGroup
                    value={formData.calendar_type}
                    onValueChange={(value) => setFormData({ ...formData, calendar_type: value })}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="solar" id="solar" />
                        <Label htmlFor="solar" className="cursor-pointer font-normal">
                            양력 (Solar)
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lunar" id="lunar" />
                        <Label htmlFor="lunar" className="cursor-pointer font-normal">
                            음력 (Lunar)
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* 생시 */}
            <div className="space-y-2">
                <Label htmlFor="birth_time" className="flex items-center gap-2 text-zen-text font-serif">
                    <Clock className="w-4 h-4 text-zen-gold" />
                    생시 (태어난 시간)
                </Label>
                <Input
                    id="birth_time"
                    type="time"
                    value={formData.birth_time}
                    onChange={(e) => setFormData({ ...formData, birth_time: e.target.value })}
                    required
                    className="border-zen-border focus:border-zen-gold"
                />
                <p className="text-xs text-zen-muted">
                    정확한 시간을 모르시면 대략적인 시간을 입력해주세요
                </p>
            </div>

            {/* 성별 */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-zen-text font-serif">
                    <User className="w-4 h-4 text-zen-gold" />
                    성별
                </Label>
                <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="cursor-pointer font-normal">
                            남성
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="cursor-pointer font-normal">
                            여성
                        </Label>
                    </div>
                </RadioGroup>
                <p className="text-xs text-zen-muted">
                    대운 계산에 필요합니다
                </p>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-zen-gold/10 border border-zen-gold/30 rounded-sm p-4">
                <p className="text-sm text-zen-text leading-relaxed">
                    <strong className="font-serif">💡 안내:</strong><br />
                    입력하신 정보는 사주 분석에만 사용되며, 안전하게 보관됩니다.
                    정확한 분석을 위해 가능한 한 정확한 정보를 입력해 주세요.
                </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 border-zen-border"
                    disabled={loading}
                >
                    취소
                </Button>
                <Button
                    type="submit"
                    className="flex-1 bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            저장 중...
                        </>
                    ) : (
                        "저장하기"
                    )}
                </Button>
            </div>
        </form>
    );
}
