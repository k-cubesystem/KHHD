"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar, Clock, User } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
    userId: string;
    initialData: any;
}

// 12지지 시간 매핑
const EARTHLY_BRANCHES = [
    { value: "23:00", label: "자시(子時)", time: "23:00~01:00", description: "쥐의 시간" },
    { value: "01:00", label: "축시(丑時)", time: "01:00~03:00", description: "소의 시간" },
    { value: "03:00", label: "인시(寅時)", time: "03:00~05:00", description: "호랑이의 시간" },
    { value: "05:00", label: "묘시(卯時)", time: "05:00~07:00", description: "토끼의 시간" },
    { value: "07:00", label: "진시(辰時)", time: "07:00~09:00", description: "용의 시간" },
    { value: "09:00", label: "사시(巳時)", time: "09:00~11:00", description: "뱀의 시간" },
    { value: "11:00", label: "오시(午時)", time: "11:00~13:00", description: "말의 시간" },
    { value: "13:00", label: "미시(未時)", time: "13:00~15:00", description: "양의 시간" },
    { value: "15:00", label: "신시(申時)", time: "15:00~17:00", description: "원숭이의 시간" },
    { value: "17:00", label: "유시(酉時)", time: "17:00~19:00", description: "닭의 시간" },
    { value: "19:00", label: "술시(戌時)", time: "19:00~21:00", description: "개의 시간" },
    { value: "21:00", label: "해시(亥時)", time: "21:00~23:00", description: "돼지의 시간" },
];

export function ProfileEditForm({ userId, initialData }: ProfileEditFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        birth_date: initialData?.birth_date || "",
        birth_time: initialData?.birth_time || "12:00",
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
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* 생년월일 */}
            <div className="space-y-3">
                <Label htmlFor="birth_date" className="flex items-center gap-2 text-base font-bold text-zen-text font-serif">
                    <Calendar className="w-5 h-5 text-zen-gold" />
                    생년월일
                </Label>
                <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    required
                    className="border-zen-border focus:border-zen-gold text-base h-12"
                />
                <p className="text-sm text-zen-text/70 leading-relaxed">
                    양력/음력 선택은 아래에서 해주세요
                </p>
            </div>

            {/* 양력/음력 선택 */}
            <div className="space-y-3">
                <Label className="text-base font-bold text-zen-text font-serif">
                    달력 종류
                </Label>
                <RadioGroup
                    value={formData.calendar_type}
                    onValueChange={(value) => setFormData({ ...formData, calendar_type: value })}
                    className="flex gap-6"
                >
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="solar" id="solar" className="w-5 h-5" />
                        <Label htmlFor="solar" className="cursor-pointer text-base text-zen-text font-medium">
                            양력 (Solar)
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="lunar" id="lunar" className="w-5 h-5" />
                        <Label htmlFor="lunar" className="cursor-pointer text-base text-zen-text font-medium">
                            음력 (Lunar)
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* 생시 (12지지) */}
            <div className="space-y-3">
                <Label htmlFor="birth_time" className="flex items-center gap-2 text-base font-bold text-zen-text font-serif">
                    <Clock className="w-5 h-5 text-zen-gold" />
                    생시 (태어난 시간)
                </Label>
                <Select
                    value={formData.birth_time}
                    onValueChange={(value) => setFormData({ ...formData, birth_time: value })}
                >
                    <SelectTrigger className="w-full h-12 text-base border-zen-border">
                        <SelectValue placeholder="시간을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {EARTHLY_BRANCHES.map((branch) => (
                            <SelectItem
                                key={branch.value}
                                value={branch.value}
                                className="text-base py-3"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-zen-text">{branch.label}</span>
                                    <span className="text-sm text-zen-muted">{branch.time} - {branch.description}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-zen-text/70 leading-relaxed">
                    정확한 시간을 모르시면 대략적인 시간대를 선택해주세요
                </p>
            </div>

            {/* 성별 */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-bold text-zen-text font-serif">
                    <User className="w-5 h-5 text-zen-gold" />
                    성별
                </Label>
                <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    className="flex gap-6"
                >
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="male" id="male" className="w-5 h-5" />
                        <Label htmlFor="male" className="cursor-pointer text-base text-zen-text font-medium">
                            남성
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="female" id="female" className="w-5 h-5" />
                        <Label htmlFor="female" className="cursor-pointer text-base text-zen-text font-medium">
                            여성
                        </Label>
                    </div>
                </RadioGroup>
                <p className="text-sm text-zen-text/70 leading-relaxed">
                    대운 계산에 필요합니다
                </p>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-zen-gold/10 border-2 border-zen-gold/30 rounded-sm p-5">
                <p className="text-base text-zen-text leading-relaxed">
                    <strong className="font-serif text-lg">💡 안내</strong><br />
                    <span className="text-zen-text/80">
                        입력하신 정보는 사주 분석에만 사용되며, 안전하게 보관됩니다.
                        정확한 분석을 위해 가능한 한 정확한 정보를 입력해 주세요.
                    </span>
                </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 pt-6">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 h-14 text-base border-2 border-zen-border hover:bg-zen-bg"
                    disabled={loading}
                >
                    취소
                </Button>
                <Button
                    type="submit"
                    className="flex-1 h-14 text-base bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold shadow-lg"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
