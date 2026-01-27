"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Link as LinkIcon, Twitter, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
    title?: string;
    text?: string;
    url?: string; // Optional: defaults to current window.location
    className?: string;
    align?: "start" | "end" | "center";
}

export function ShareButton({
    title = "청담해화당",
    text = "당신의 운명을 비춰주는 프리미엄 사주 분석",
    url,
    className,
    align = "end"
}: ShareButtonProps) {
    const [open, setOpen] = useState(false);

    const getUrl = () => {
        if (typeof window !== "undefined") {
            return url || window.location.href;
        }
        return "";
    };

    const handleCopyLink = async () => {
        const shareUrl = getUrl();
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("링크가 복사되었습니다.");
            setOpen(false);
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error("링크 복사에 실패했습니다.");
        }
    };

    const handleTwitterShare = () => {
        const shareUrl = getUrl();
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank", "width=600,height=400");
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "gap-2 border-zen-gold/50 text-zen-gold hover:text-zen-gold hover:bg-zen-gold/10 hover:border-zen-gold transition-colors",
                        className
                    )}
                >
                    <Share2 className="w-4 h-4" />
                    공유하기
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="bg-white/95 backdrop-blur-sm border-zen-border shadow-lg">
                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-2 focus:bg-zen-bg focus:text-zen-wood">
                    <LinkIcon className="w-4 h-4" />
                    링크 복사
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTwitterShare} className="cursor-pointer gap-2 focus:bg-zen-bg focus:text-zen-wood">
                    <Twitter className="w-4 h-4" />
                    트위터(X)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
