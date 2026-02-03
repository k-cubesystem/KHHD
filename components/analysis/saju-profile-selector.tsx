"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, User, ArrowRight, UserPlus, Users, Heart, Briefcase } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getDestinyTargets, type DestinyTarget } from "@/app/actions/destiny-targets";
import { getTargetImageUrl } from "@/lib/destiny-utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    const [targets, setTargets] = useState<DestinyTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchTargets = async () => {
            setLoading(true);

            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/sign-up");
                onClose();
                return;
            }

            // Fetch destiny targets (본인 + 가족/친구)
            const data = await getDestinyTargets();
            setTargets(data);
            setLoading(false);
        };

        fetchTargets();
    }, [isOpen, router, onClose, supabase]);

    const handleTargetSelect = (targetId: string) => {
        setSelectedId(targetId);
        router.push(`${targetRoute}?targetId=${targetId}`);
        onClose();
    };

    const handleGoToFamily = () => {
        router.push("/protected/family");
        onClose();
    };

    // Helper function to get relation icon
    const getRelationIcon = (relationType: string, targetType: string) => {
        if (targetType === "self") return User;
        if (relationType.includes("가족") || relationType.includes("부모") || relationType.includes("자녀")) return Users;
        if (relationType.includes("연인") || relationType.includes("배우자")) return Heart;
        if (relationType.includes("직장") || relationType.includes("동료") || relationType.includes("상사")) return Briefcase;
        return User;
    };

    // Empty state: No targets
    if (!loading && targets.length === 0) {
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
                        {targets.map((target, index) => {
                            const RelationIcon = getRelationIcon(target.relation_type, target.target_type);
                            const imageUrl = getTargetImageUrl(target);

                            return (
                                <motion.button
                                    key={target.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleTargetSelect(target.id)}
                                    className={`
                                        relative group p-6 rounded-xl border-2 transition-all duration-300
                                        ${selectedId === target.id
                                            ? "border-primary bg-primary/10"
                                            : "border-primary/20 bg-surface/40 hover:border-primary/50 hover:bg-surface/60"
                                        }
                                    `}
                                >
                                    {/* Selection indicator */}
                                    <div
                                        className={`
                                            absolute top-3 right-3 transition-all duration-300
                                            ${selectedId === target.id
                                                ? "opacity-100 scale-100"
                                                : "opacity-0 scale-75 group-hover:opacity-50"
                                            }
                                        `}
                                    >
                                        <CheckCircle2
                                            className={`
                                                w-6 h-6
                                                ${selectedId === target.id ? "text-primary" : "text-primary/50"}
                                            `}
                                        />
                                    </div>

                                    {/* Profile Avatar & Info */}
                                    <div className="flex items-center gap-4 mb-3">
                                        <Avatar className="w-12 h-12 border border-primary/20 flex-shrink-0">
                                            <AvatarImage src={imageUrl || undefined} />
                                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                                {target.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-serif font-bold text-lg text-ink-light">
                                                    {target.name}
                                                </h3>
                                                {target.target_type === "self" && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary rounded border border-primary/30 font-sans font-bold">
                                                        본인
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-ink-light/60 font-light">
                                                <RelationIcon className="w-3.5 h-3.5" />
                                                <span>{target.relation_type}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Birth Info */}
                                    {target.birth_date && (
                                        <div className="text-left space-y-1 text-sm text-ink-light/70 font-light pl-16">
                                            <p>{target.birth_date}</p>
                                            {target.birth_time && (
                                                <p className="text-xs text-ink-light/50">
                                                    {target.birth_time} ({target.calendar_type === "solar" ? "양력" : "음력"})
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Hover effect */}
                                    <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </motion.button>
                            );
                        })}
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
