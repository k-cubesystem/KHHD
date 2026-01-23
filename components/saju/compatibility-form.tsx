"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Heart } from "lucide-react";

interface CompatibilityFormProps {
    onAnalyze: (data: any) => void;
}

export function CompatibilityForm({ onAnalyze }: CompatibilityFormProps) {
    const [loading, setLoading] = useState(false);
    const [partnerName, setPartnerName] = useState("");
    const [partnerGender, setPartnerGender] = useState("female");
    const [partnerBirthDate, setPartnerBirthDate] = useState("");
    const [partnerBirthTime, setPartnerBirthTime] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call delay
        setTimeout(() => {
            setLoading(false);
            onAnalyze({
                name: partnerName,
                gender: partnerGender,
                birthDate: partnerBirthDate,
                birthTime: partnerBirthTime
            });
        }, 2000);
    };

    return (
        <Card className="p-6 bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-pink-500 fill-current animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">상대방 정보 입력</h2>
                <p className="text-sm text-zinc-400">
                    상대방의 정확한 생년월일시를 입력할수록<br />더 정교한 궁합 분석이 가능합니다.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label>이름 (또는 닉네임)</Label>
                    <Input
                        placeholder="상대방 이름"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        className="bg-black/20 border-white/10"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>성별</Label>
                    <Select value={partnerGender} onValueChange={setPartnerGender}>
                        <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">남성</SelectItem>
                            <SelectItem value="female">여성</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>생년월일</Label>
                        <Input
                            type="date"
                            value={partnerBirthDate}
                            onChange={(e) => setPartnerBirthDate(e.target.value)}
                            className="bg-black/20 border-white/10"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>태어난 시간</Label>
                        <Input
                            type="time"
                            value={partnerBirthTime}
                            onChange={(e) => setPartnerBirthTime(e.target.value)}
                            className="bg-black/20 border-white/10"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            궁합 분석 중...
                        </>
                    ) : (
                        "궁합 확인하기 (부적 1장)"
                    )}
                </Button>
            </form>
        </Card>
    );
}
