import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Scroll, ArrowRight, Users, Sparkles, User, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFamilyMembers } from "@/app/actions/family-actions";

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

export default function SajuInputPage() {
    const router = useRouter();
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [guestData, setGuestData] = useState({
        name: "",
        birthYear: "",
        birthMonth: "",
        birthDay: "",
        birthHour: "",
        birthMinute: "",
        gender: "male",
        calendar: "solar"
    });

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await getFamilyMembers();
                setMembers(data || []);
            } catch (error) {
                console.error("Failed to fetch family members", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    const handleAnalyze = async () => {
        // Logic to redirect to analysis result with query params
        // For now, we simulate the redirection
        if (selectedMemberId) {
            const member = members.find(m => m.id === selectedMemberId);
            if (!member) return;
            // Here we would typically construct a query string or call a server action
            console.log("Analyzing Member:", member);
            router.push(`/protected/profile/manse?id=${member.id}`); // Correct route for analysis using existing page logic?
            // Or maybe new studio result page
        } else {
            console.log("Analyzing Guest:", guestData);
            // Serialize guest data
            const query = new URLSearchParams({
                name: guestData.name,
                date: `${guestData.birthYear}-${guestData.birthMonth}-${guestData.birthDay}`,
                time: `${guestData.birthHour}:${guestData.birthMinute}`,
                gender: guestData.gender,
                calendar: guestData.calendar
            }).toString();
            // Redirect to manse page with query params (if supported) or a temp result page
            // Assuming manse page can handle query params, if not we might need a dedicated result page
            router.push(`/protected/profile/manse?guest=true&${query}`);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background text-ink-light font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-noise-pattern opacity-5" />
            </div>

            {/* Header / Title */}
            <div className="z-10 w-full max-w-md mb-8 text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 backdrop-blur-sm mb-2">
                    <Scroll className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Saju Analysis</span>
                </div>
                <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-light">
                    운명의 <span className="text-manse-gold">지도</span>를 펼치다
                </h1>
                <p className="font-sans text-ink-light/60 text-xs tracking-wide font-light">
                    정확한 만세력 분석을 위해 대상을 선택해주세요.
                </p>
            </div>

            {/* Input Form */}
            <Card className="card-glass-manse z-10 w-full max-w-md p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
                <Tabs defaultValue="family" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-black/20 mb-6 h-12 p-1 rounded-lg">
                        <TabsTrigger value="family" className="rounded-md data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-xs font-bold">
                            <Users className="w-4 h-4 mr-2" />
                            가족/지인 (저장됨)
                        </TabsTrigger>
                        <TabsTrigger value="guest" className="rounded-md data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-xs font-bold">
                            <User className="w-4 h-4 mr-2" />
                            손님/즉석 (휘발성)
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Family Selection */}
                    <TabsContent value="family" className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Select Profile</Label>
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger className="h-14">
                                    <SelectValue placeholder="분석할 대상을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <span className="font-bold">{m.name}</span> <span className="text-xs opacity-50 ml-2">({m.relationship})</span>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="new">
                                        <span className="text-[#D4AF37] font-bold">+ 새 가족 등록하기</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {selectedMemberId === "new" && (
                                <div className="p-4 bg-[#D4AF37]/10 rounded-lg text-center">
                                    <p className="text-xs text-[#D4AF37] mb-2">새로운 가족을 등록하시겠습니까?</p>
                                    <Link href="/protected/family">
                                        <Button size="sm" className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA] w-full">
                                            인연 관리로 이동
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab 2: Guest Input */}
                    <TabsContent value="guest" className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Guest Info</Label>
                            <Input
                                placeholder="이름 (Name)"
                                className="h-12 bg-black/20"
                                value={guestData.name}
                                onChange={(e) => setGuestData({ ...guestData, name: e.target.value })}
                            />

                            <div className="grid grid-cols-3 gap-2">
                                <Input placeholder="YYYY" className="h-12 text-center bg-black/20" maxLength={4}
                                    value={guestData.birthYear} onChange={(e) => setGuestData({ ...guestData, birthYear: e.target.value })}
                                />
                                <Input placeholder="MM" className="h-12 text-center bg-black/20" maxLength={2}
                                    value={guestData.birthMonth} onChange={(e) => setGuestData({ ...guestData, birthMonth: e.target.value })}
                                />
                                <Input placeholder="DD" className="h-12 text-center bg-black/20" maxLength={2}
                                    value={guestData.birthDay} onChange={(e) => setGuestData({ ...guestData, birthDay: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Input placeholder="HH" className="text-center bg-black/20" maxLength={2}
                                    value={guestData.birthHour} onChange={(e) => setGuestData({ ...guestData, birthHour: e.target.value })}
                                />
                                <span className="self-center text-white/20">:</span>
                                <Input placeholder="MM" className="text-center bg-black/20" maxLength={2}
                                    value={guestData.birthMinute} onChange={(e) => setGuestData({ ...guestData, birthMinute: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={guestData.gender === 'male' ? 'default' : 'outline'}
                                    className={cn("flex-1", guestData.gender === 'male' ? "bg-blue-900/50 hover:bg-blue-800/50 text-blue-100 border-blue-500/50" : "border-white/10")}
                                    onClick={() => setGuestData({ ...guestData, gender: 'male' })}
                                >
                                    남성
                                </Button>
                                <Button
                                    type="button"
                                    variant={guestData.gender === 'female' ? 'default' : 'outline'}
                                    className={cn("flex-1", guestData.gender === 'female' ? "bg-pink-900/50 hover:bg-pink-800/50 text-pink-100 border-pink-500/50" : "border-white/10")}
                                    onClick={() => setGuestData({ ...guestData, gender: 'female' })}
                                >
                                    여성
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Action Button */}
                    <div className="pt-6">
                        <Button
                            className="w-full h-14 bg-[#D4AF37] text-black hover:bg-[#F4E4BA] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all font-bold text-lg"
                            onClick={handleAnalyze}
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            천지인 분석 시작
                        </Button>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}
