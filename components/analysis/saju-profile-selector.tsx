"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, User, ArrowRight, UserPlus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { createClient } from "@/lib/supabase/client";

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

interface SajuProfileSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    targetRoute: string;
}

export function SajuProfileSelector({
    isOpen,
    onClose,
    targetRoute,
}: SajuProfileSelectorProps) {
    const router = useRouter();
    const supabase = createClient();
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchMembers = async () => {
            setLoading(true);

            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/sign-up");
                onClose();
                return;
            }

            // Fetch family members
            const data = await getFamilyMembers();
            setMembers(data as FamilyMember[]);
            setLoading(false);
        };

        fetchMembers();
    }, [isOpen, router, onClose, supabase]);

    const handleMemberSelect = (memberId: string) => {
        setSelectedId(memberId);
        router.push(`${targetRoute}?targetId=${memberId}`);
        onClose();
    };

    const handleGoToFamily = () => {
        router.push("/protected/family");
        onClose();
    };

    // Empty state: No members
    if (!loading && members.length === 0) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center">사주 정보가 필요합니다</DialogTitle>
                        <DialogDescription className="text-center text-base pt-2">
                            운세를 보려면 사주 정보를 먼저 등록해야 합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="w-10 h-10 text-primary" strokeWidth={1.5} />
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-ink-light/70 text-sm">
                                본인 또는 가족의 사주 정보를 추가하시면
                            </p>
                            <p className="text-ink-light/70 text-sm">
                                다양한 운세와 분석을 확인하실 수 있습니다.
                            </p>
                        </div>

                        <button
                            onClick={handleGoToFamily}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary/20 hover:bg-primary/30 text-primary font-serif font-medium text-base border border-primary/30 hover:border-primary rounded-lg transition-all group"
                        >
                            <span>사주 등록하러 가기</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Profile selection state
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center">프로필 선택</DialogTitle>
                    <DialogDescription className="text-center text-base pt-2">
                        운세를 확인할 분을 선택해주세요
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
                        {members.map((member, index) => (
                            <motion.button
                                key={member.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleMemberSelect(member.id)}
                                className={`
                                    relative group p-6 rounded-xl border-2 transition-all duration-300
                                    ${selectedId === member.id
                                        ? "border-primary bg-primary/10"
                                        : "border-primary/20 bg-surface/40 hover:border-primary/50 hover:bg-surface/60"
                                    }
                                `}
                            >
                                {/* Selection indicator */}
                                <div
                                    className={`
                                        absolute top-3 right-3 transition-all duration-300
                                        ${selectedId === member.id
                                            ? "opacity-100 scale-100"
                                            : "opacity-0 scale-75 group-hover:opacity-50"
                                        }
                                    `}
                                >
                                    <CheckCircle2
                                        className={`
                                            w-6 h-6
                                            ${selectedId === member.id ? "text-primary" : "text-primary/50"}
                                        `}
                                    />
                                </div>

                                {/* Profile Icon */}
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-6 h-6 text-primary" strokeWidth={1.5} />
                                    </div>
                                    <div className="text-left flex-grow">
                                        <h3 className="font-serif font-bold text-lg text-ink-light mb-1">
                                            {member.name}
                                        </h3>
                                        <p className="text-sm text-ink-light/60 font-light">
                                            {member.relationship}
                                        </p>
                                    </div>
                                </div>

                                {/* Birth Info */}
                                <div className="text-left space-y-1 text-sm text-ink-light/70 font-light pl-16">
                                    <p>{member.birth_date}</p>
                                    {member.birth_time && (
                                        <p className="text-xs text-ink-light/50">
                                            {member.birth_time} ({member.calendar_type === "solar" ? "양력" : "음력"})
                                        </p>
                                    )}
                                </div>

                                {/* Hover effect */}
                                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Add new member button */}
                {!loading && (
                    <div className="pt-4 border-t border-primary/10">
                        <button
                            onClick={handleGoToFamily}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-primary/70 hover:text-primary font-medium transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>새 프로필 추가하기</span>
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
