"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Facebook, Twitter, Link2, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ViralShareButtonProps {
    title: string;
    description: string;
    ogParams: {
        name?: string;
        element?: string;
        type?: string;
        score?: string;
    };
    url?: string;
    className?: string;
}

export function ViralShareButton({
    title,
    description,
    ogParams,
    url,
    className,
}: ViralShareButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // OG 이미지 URL 생성
    const ogImageUrl = `${window.location.origin}/api/og?${new URLSearchParams(
        Object.entries(ogParams).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString()}`;

    // 공유할 URL
    const shareUrl = url || window.location.href;

    // 공유 링크 복사
    async function copyLink() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("링크 복사 실패:", error);
        }
    }

    // 페이스북 공유
    function shareFacebook() {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl
        )}`;
        window.open(fbUrl, "_blank", "width=600,height=400");
    }

    // 트위터 공유
    function shareTwitter() {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            title
        )}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank", "width=600,height=400");
    }

    // 카카오톡 공유 (Web Share API)
    async function shareKakao() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: description,
                    url: shareUrl,
                });
            } catch (error) {
                console.error("공유 실패:", error);
            }
        } else {
            // Web Share API 미지원 시 링크 복사
            copyLink();
        }
    }

    // 이미지 다운로드
    async function downloadImage() {
        try {
            const response = await fetch(ogImageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `haehwadang-${ogParams.type || "share"}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("이미지 다운로드 실패:", error);
        }
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className={cn("gap-2", className)}
            >
                <Share2 className="w-4 h-4" />
                공유하기
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-zen-gold" />
                            결과 공유하기
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* OG 이미지 미리보기 */}
                        <div className="rounded-lg overflow-hidden border border-zen-border">
                            <img
                                src={ogImageUrl}
                                alt="공유 이미지 미리보기"
                                className="w-full h-auto"
                            />
                        </div>

                        {/* 공유 버튼들 */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={shareFacebook}
                                variant="outline"
                                className="gap-2 bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none"
                            >
                                <Facebook className="w-4 h-4" />
                                Facebook
                            </Button>
                            <Button
                                onClick={shareTwitter}
                                variant="outline"
                                className="gap-2 bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/90 border-none"
                            >
                                <Twitter className="w-4 h-4" />
                                Twitter
                            </Button>
                            <Button
                                onClick={shareKakao}
                                variant="outline"
                                className="gap-2 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FEE500]/90 border-none"
                            >
                                <Share2 className="w-4 h-4" />
                                카카오톡
                            </Button>
                            <Button
                                onClick={downloadImage}
                                variant="outline"
                                className="gap-2"
                            >
                                <Download className="w-4 h-4" />
                                이미지 저장
                            </Button>
                        </div>

                        {/* 링크 복사 */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-3 py-2 text-sm border border-zen-border rounded-md bg-zen-bg/30"
                            />
                            <Button
                                onClick={copyLink}
                                variant="outline"
                                size="icon"
                                className="flex-shrink-0"
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Check className="w-4 h-4 text-green-600" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="link"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Link2 className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </div>

                        <p className="text-xs text-zen-muted text-center">
                            SNS에 공유하여 친구들과 함께 운세를 확인해보세요
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
