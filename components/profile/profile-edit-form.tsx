"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar, Clock, User, Phone, MapPin, Heart, Briefcase, BookOpen, Star, PenTool, Search, Target } from "lucide-react";
import { toast } from "sonner";
import DaumPostcodeEmbed from 'react-daum-postcode';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface ProfileEditFormProps {
    userId: string;
    initialData: any;
    profileData?: any; // Added profile data from 'profiles' table
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

export function ProfileEditForm({ userId, initialData, profileData }: ProfileEditFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isAddressOpen, setIsAddressOpen] = useState(false);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // 사주 데이터 (family_members)
    const [sajuData, setSajuData] = useState({
        name: initialData?.name || "",
        birth_date: initialData?.birth_date || "",
        birth_time: initialData?.birth_time || "12:00",
        gender: initialData?.gender || "male",
        calendar_type: initialData?.calendar_type || "solar",
    });

    // 프로필 데이터 (profiles)
    const [extraData, setExtraData] = useState({
        phone: profileData?.phone || "",
        zipcode: profileData?.zipcode || "",
        address: profileData?.address || "",
        address_detail: profileData?.address_detail || "",
        marital_status: profileData?.marital_status || "single",
        religion: profileData?.religion || "",
        job: profileData?.job || "",
        hobbies: profileData?.hobbies || "",
        specialties: profileData?.specialties || "",
        life_philosophy: profileData?.life_philosophy || "",
        focus_areas: profileData?.focus_areas || "",
        activity_status: profileData?.activity_status || "moderate",
    });

    useEffect(() => {
        // Load initial data if provided later
        if (initialData) {
            setSajuData(prev => ({
                ...prev,
                name: initialData.name || prev.name,
                birth_date: initialData.birth_date || prev.birth_date,
                birth_time: initialData.birth_time || prev.birth_time,
                gender: initialData.gender || prev.gender,
                calendar_type: initialData.calendar_type || prev.calendar_type,
            }));
        }
        if (profileData) {
            setExtraData(prev => ({
                ...prev,
                phone: profileData.phone || prev.phone,
                zipcode: profileData.zipcode || prev.zipcode,
                address: profileData.address || prev.address,
                address_detail: profileData.address_detail || prev.address_detail,
                marital_status: profileData.marital_status || prev.marital_status,
                religion: profileData.religion || prev.religion,
                job: profileData.job || prev.job,
                hobbies: profileData.hobbies || prev.hobbies,
                specialties: profileData.specialties || prev.specialties,
                life_philosophy: profileData.life_philosophy || prev.life_philosophy,
                focus_areas: profileData.focus_areas || prev.focus_areas,
                activity_status: profileData.activity_status || prev.activity_status,
            }));
            // Set initial avatar preview if exists
            if (profileData.avatar_url) {
                setPreviewImage(profileData.avatar_url);
            }
        }
    }, [initialData, profileData]);


    const handleAddressComplete = (data: any) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname;
            if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
        }

        setExtraData({
            ...extraData,
            zipcode: data.zonecode,
            address: fullAddress,
        });
        setIsAddressOpen(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("이미지 크기는 5MB 이하여야 합니다.");
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = createClient();
            let avatarUrl = profileData?.avatar_url;

            // 0. Upload Image if selected
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${userId}-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile-images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('profile-images')
                    .getPublicUrl(filePath);

                avatarUrl = publicUrl;

                // Update auth metadata as well for instant UI updates (optional but good)
                await supabase.auth.updateUser({
                    data: { avatar_url: publicUrl }
                });
            }

            // 1. Update family_members (Saju Data)
            const { data: existingMember } = await supabase
                .from('family_members')
                .select('id')
                .eq('user_id', userId)
                .eq('relationship', '본인')
                .maybeSingle();

            const sajuUpdateData = {
                name: sajuData.name, // 이름도 family_members에 저장
                birth_date: sajuData.birth_date,
                birth_time: sajuData.birth_time,
                gender: sajuData.gender,
                calendar_type: sajuData.calendar_type,
            };

            if (existingMember) {
                const { error } = await supabase
                    .from('family_members')
                    .update(sajuUpdateData)
                    .eq('id', existingMember.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('family_members')
                    .insert({
                        user_id: userId,
                        relationship: '본인',
                        ...sajuUpdateData
                    });
                if (error) throw error;
            }

            // 2. Update profiles (Extra Data & Avatar)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    ...extraData,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            toast.success("회원 정보가 성공적으로 수정되었습니다.");
            router.push("/protected/profile");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving profile details:", JSON.stringify(error, null, 2));
            const errorMessage = error?.message || error?.error_description || JSON.stringify(error) || "알 수 없는 오류";
            toast.error("저장 실패: " + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-zen-border bg-white shadow-sm">
            <CardHeader className="bg-zen-bg/30 border-b border-zen-border pb-4">
                <CardTitle className="text-xl font-serif text-zen-text flex items-center gap-2">
                    <User className="w-5 h-5 text-zen-gold" />
                    상세 정보 입력
                </CardTitle>
                <CardDescription>
                    사주 분석과 회원 서비스 이용을 위한 정보를 입력해주세요.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="p-6 space-y-8">

                    {/* 섹션 1: 기본 신상 정보 */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-zen-text border-l-4 border-zen-gold pl-3 mb-4">
                            기본 인적 사항
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Profile Image Upload */}
                            <div className="md:col-span-2 flex flex-col items-center justify-center space-y-4 pb-4">
                                <Label className="text-zen-text font-bold">프로필 이미지</Label>
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zen-border shadow-sm group-hover:border-zen-gold transition-colors">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={previewImage || "https://ui-avatars.com/api/?name=User&background=random"}
                                            alt="Profile Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=User&background=random"; }}
                                        />
                                    </div>
                                    <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-200 cursor-pointer hover:bg-zen-bg transition-colors">
                                        <PenTool className="w-3 h-3 text-zen-text" />
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-zen-muted">1장만 업로드 가능합니다.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zen-text font-bold">이름</Label>
                                <Input
                                    id="name"
                                    value={sajuData.name}
                                    onChange={(e) => setSajuData({ ...sajuData, name: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="성함을 입력하세요"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-zen-text font-bold flex items-center gap-1">
                                    <Phone className="w-4 h-4 text-zen-gold/70" /> 휴대전화
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={extraData.phone}
                                    onChange={(e) => setExtraData({ ...extraData, phone: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="010-0000-0000"
                                />
                            </div>
                        </div>

                        {/* 주소 검색 */}
                        <div className="space-y-2">
                            <Label className="text-zen-text font-bold flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-zen-gold/70" /> 주소
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={extraData.zipcode}
                                    placeholder="우편번호"
                                    className="w-24 border-zen-border bg-gray-50"
                                    readOnly
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddressOpen(true)}
                                    className="border-zen-border text-zen-text hover:bg-zen-bg"
                                >
                                    <Search className="w-4 h-4 mr-1" /> 주소 검색
                                </Button>
                            </div>
                            <Input
                                value={extraData.address}
                                placeholder="기본 주소"
                                className="border-zen-border bg-gray-50"
                                readOnly
                            />
                            <Input
                                value={extraData.address_detail}
                                onChange={(e) => setExtraData({ ...extraData, address_detail: e.target.value })}
                                className="border-zen-border focus:border-zen-gold"
                                placeholder="상세 주소를 입력하세요 (동, 호수 등)"
                            />
                        </div>

                        {/* 결혼 여부 & 종교 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-zen-text font-bold flex items-center gap-1">
                                    <Heart className="w-4 h-4 text-zen-gold/70" /> 결혼 여부
                                </Label>
                                <Select
                                    value={extraData.marital_status}
                                    onValueChange={(value) => setExtraData({ ...extraData, marital_status: value })}
                                >
                                    <SelectTrigger className="border-zen-border">
                                        <SelectValue placeholder="선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">미혼</SelectItem>
                                        <SelectItem value="married">기혼</SelectItem>
                                        <SelectItem value="divorced">이혼/사별</SelectItem>
                                        <SelectItem value="other">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="religion" className="text-zen-text font-bold">종교</Label>
                                <Input
                                    id="religion"
                                    value={extraData.religion}
                                    onChange={(e) => setExtraData({ ...extraData, religion: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="무교, 기독교, 불교 등"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zen-border/50 my-6" />

                    {/* 섹션 2: 사주 정보 (기존 내용) */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-zen-text border-l-4 border-zen-gold pl-3 mb-4">
                            사주 분석 정보
                        </h3>
                        {/* 생년월일 + 달력타입 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="birth_date" className="flex items-center gap-2 text-base font-bold text-zen-text">
                                    <Calendar className="w-4 h-4 text-zen-gold" /> 생년월일
                                </Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    value={sajuData.birth_date}
                                    onChange={(e) => setSajuData({ ...sajuData, birth_date: e.target.value })}
                                    required
                                    className="border-zen-border focus:border-zen-gold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base font-bold text-zen-text">달력 종류</Label>
                                <RadioGroup
                                    value={sajuData.calendar_type}
                                    onValueChange={(value) => setSajuData({ ...sajuData, calendar_type: value })}
                                    className="flex gap-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="solar" id="solar" />
                                        <Label htmlFor="solar" className="cursor-pointer">양력</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="lunar" id="lunar" />
                                        <Label htmlFor="lunar" className="cursor-pointer">음력</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* 생시 + 성별 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="birth_time" className="flex items-center gap-2 text-base font-bold text-zen-text">
                                    <Clock className="w-4 h-4 text-zen-gold" /> 생시 (태어난 시간)
                                </Label>
                                <Select
                                    value={sajuData.birth_time}
                                    onValueChange={(value) => setSajuData({ ...sajuData, birth_time: value })}
                                >
                                    <SelectTrigger className="border-zen-border">
                                        <SelectValue placeholder="시간 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {EARTHLY_BRANCHES.map((branch) => (
                                            <SelectItem key={branch.value} value={branch.value}>
                                                <span className="font-bold mr-2">{branch.label}</span>
                                                <span className="text-xs text-muted-foreground">{branch.time}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-base font-bold text-zen-text">
                                    <User className="w-4 h-4 text-zen-gold" /> 성별
                                </Label>
                                <RadioGroup
                                    value={sajuData.gender}
                                    onValueChange={(value) => setSajuData({ ...sajuData, gender: value })}
                                    className="flex gap-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="male" />
                                        <Label htmlFor="male" className="cursor-pointer">남성</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="female" />
                                        <Label htmlFor="female" className="cursor-pointer">여성</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zen-border/50 my-6" />

                    {/* 섹션 3: 추가 정보 (직업, 취미 등) */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-zen-text border-l-4 border-zen-gold pl-3 mb-4">
                            추가 정보 (AI 정밀 분석용)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job" className="text-zen-text font-bold flex items-center gap-1">
                                    <Briefcase className="w-4 h-4 text-zen-gold/70" /> 직업
                                </Label>
                                <Input
                                    id="job"
                                    value={extraData.job}
                                    onChange={(e) => setExtraData({ ...extraData, job: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="예: 개발자, 디자이너, 학생"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hobbies" className="text-zen-text font-bold flex items-center gap-1">
                                    <Star className="w-4 h-4 text-zen-gold/70" /> 취미
                                </Label>
                                <Input
                                    id="hobbies"
                                    value={extraData.hobbies}
                                    onChange={(e) => setExtraData({ ...extraData, hobbies: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="예: 독서, 등산, 영화감상"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="specialties" className="text-zen-text font-bold flex items-center gap-1">
                                    <PenTool className="w-4 h-4 text-zen-gold/70" /> 특기
                                </Label>
                                <Input
                                    id="specialties"
                                    value={extraData.specialties}
                                    onChange={(e) => setExtraData({ ...extraData, specialties: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold"
                                    placeholder="자신만의 특별한 재능이 있다면 적어주세요"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="life_philosophy" className="text-zen-text font-bold flex items-center gap-1">
                                    <BookOpen className="w-4 h-4 text-zen-gold/70" /> 나의 인생 철학
                                </Label>
                                <Textarea
                                    id="life_philosophy"
                                    value={extraData.life_philosophy}
                                    onChange={(e) => setExtraData({ ...extraData, life_philosophy: e.target.value })}
                                    className="border-zen-border focus:border-zen-gold min-h-[100px]"
                                    placeholder="인생에서 중요하게 생각하는 가치나 좌우명이 있다면 자유롭게 적어주세요."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zen-border/50 my-6" />

                    {/* 섹션 4: 초개인화 분석 설정 */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-zen-text border-l-4 border-zen-gold pl-3 mb-4">
                            초개인화 분석 설정 (선택)
                        </h3>

                        {/* 안내 박스 */}
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <p className="text-xs text-blue-900">
                                AI가 당신의 상황을 더 정확히 이해하고, 맞춤형 조언을 제공합니다.
                                입력한 정보는 우선순위에 따라 분석에 반영됩니다.
                            </p>
                        </div>

                        {/* 중점 관심사 및 현재 고민 (통합) */}
                        <div className="space-y-2">
                            <Label htmlFor="focus_areas" className="flex items-center gap-1 text-zen-text font-bold">
                                <Target className="w-4 h-4 text-blue-500" />
                                중점 관심사 및 현재 고민
                            </Label>
                            <Input
                                id="focus_areas"
                                value={extraData.focus_areas}
                                onChange={(e) => setExtraData({ ...extraData, focus_areas: e.target.value })}
                                className="border-zen-border focus:border-zen-gold"
                                placeholder="예: 취업, 건강, 재물운, 승진운 (콤마로 구분)"
                            />
                            <p className="text-xs text-zen-muted">
                                현재 가장 궁금한 분야나 고민을 자유롭게 입력하세요. (우선순위 2위)
                            </p>
                        </div>

                        {/* 활동 성향 */}
                        <div className="space-y-2">
                            <Label className="text-zen-text font-bold">활동 성향</Label>
                            <RadioGroup
                                value={extraData.activity_status}
                                onValueChange={(value) => setExtraData({ ...extraData, activity_status: value })}
                                className="space-y-3"
                            >
                                <div className="flex items-start space-x-3 p-3 border rounded hover:border-zen-gold transition-colors">
                                    <RadioGroupItem value="active" id="active" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="active" className="cursor-pointer font-bold">적극적 실행형</Label>
                                        <p className="text-xs text-zen-muted mt-1">구체적인 행동 지침과 실전 전략을 원합니다</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-3 border rounded hover:border-zen-gold transition-colors">
                                    <RadioGroupItem value="moderate" id="moderate" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="moderate" className="cursor-pointer font-bold">보통</Label>
                                        <p className="text-xs text-zen-muted mt-1">균형잡힌 조언을 원합니다</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-3 border rounded hover:border-zen-gold transition-colors">
                                    <RadioGroupItem value="passive" id="passive" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="passive" className="cursor-pointer font-bold">소극적 관망형</Label>
                                        <p className="text-xs text-zen-muted mt-1">심리적 위로와 단계적 접근을 원합니다</p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1 h-12 text-base border-zen-border hover:bg-zen-bg"
                            disabled={loading}
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 text-base bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold shadow-md"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                "모든 정보 저장하기"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* Daum Postcode Dialog */}
            <Dialog open={isAddressOpen} onOpenChange={setIsAddressOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>주소 검색</DialogTitle>
                    </DialogHeader>
                    <div className="h-[400px] w-full border border-gray-200 rounded">
                        <DaumPostcodeEmbed
                            onComplete={handleAddressComplete}
                            style={{ height: '100%' }}
                            autoClose={false}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
