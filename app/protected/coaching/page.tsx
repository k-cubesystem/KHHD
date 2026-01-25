"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, User, Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const SAMPLE_PROMPTS = [
    "내 사주에서 올해의 운세는 어떤가요?",
    "직업 운이 좋아지는 시기는 언제인가요?",
    "궁합이 좋은 사람의 특징을 알려주세요",
    "내 오행 균형을 맞추려면 어떻게 해야 하나요?",
];

export default function AICoachingPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 사용자 정보 로드
    useEffect(() => {
        async function loadUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // 환영 메시지
                setMessages([
                    {
                        id: "welcome",
                        role: "assistant",
                        content: "안녕하세요! 해화당 AI 상담사입니다. 사주, 운세, 궁합 등 무엇이든 편하게 물어보세요. 😊",
                        timestamp: new Date(),
                    },
                ]);
            }
        }
        loadUser();
    }, []);

    // 메시지 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 메시지 전송
    async function handleSend() {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            // AI API 호출 (현재는 더미 응답)
            // TODO: 실제 Gemini API 통합
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: generateDummyResponse(userMessage.content),
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error("AI 응답 오류:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    }

    // 더미 응답 생성 (실제로는 Gemini API 사용)
    function generateDummyResponse(question: string): string {
        if (question.includes("운세")) {
            return "사주를 분석한 결과, 올해는 목(木) 기운이 강한 한 해입니다. 새로운 시작과 성장의 시기로, 적극적인 도전이 좋은 결과를 가져올 것입니다. 특히 봄철에 중요한 결정을 내리시면 좋습니다.";
        }
        if (question.includes("직업")) {
            return "직업 운은 올해 가을부터 상승세를 타기 시작합니다. 금(金) 기운이 강화되는 시기로, 계획했던 일들이 결실을 맺을 가능성이 높습니다. 인내심을 가지고 준비하세요.";
        }
        if (question.includes("궁합")) {
            return "궁합이 좋은 상대는 당신의 부족한 수(水) 기운을 보완해줄 수 있는 분입니다. 침착하고 차분한 성격의 소유자와 좋은 관계를 형성할 수 있습니다.";
        }
        if (question.includes("오행")) {
            return "현재 화(火) 기운이 부족한 상태입니다. 붉은색 계열의 옷을 입거나, 따뜻한 성격의 사람들과 교류하면 균형을 맞출 수 있습니다. 또한 남쪽 방향의 활동이 도움이 됩니다.";
        }
        return "질문해주신 내용을 바탕으로 사주를 분석하고 있습니다. 좀 더 구체적인 질문을 주시면 더 정확한 답변을 드릴 수 있습니다. 생년월일과 관련된 정보가 있으면 프로필에서 먼저 입력해주세요.";
    }

    // 샘플 프롬프트 클릭
    function handleSampleClick(prompt: string) {
        setInput(prompt);
    }

    // 엔터키 처리
    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zen-bg via-white to-zen-gold/5">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-6"
                >
                    {/* 헤더 */}
                    <motion.div variants={fadeInUp} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/protected">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-zen-text flex items-center gap-2">
                                    <Sparkles className="w-7 h-7 text-zen-gold" />
                                    AI 상담
                                </h1>
                                <p className="text-sm text-zen-muted mt-1">
                                    사주 전문가와 1:1 대화하듯 상담받으세요
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* 채팅 영역 */}
                    <motion.div variants={fadeInUp}>
                        <Card className="h-[calc(100vh-300px)] flex flex-col">
                            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={cn(
                                                "flex gap-3",
                                                message.role === "user" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            {message.role === "assistant" && (
                                                <div className="w-8 h-8 rounded-full bg-zen-gold/20 flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-4 h-4 text-zen-wood" />
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    "max-w-[80%] rounded-2xl px-4 py-3",
                                                    message.role === "user"
                                                        ? "bg-zen-wood text-white"
                                                        : "bg-zen-bg/50 text-zen-text border border-zen-border"
                                                )}
                                            >
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {message.content}
                                                </p>
                                                <p
                                                    className={cn(
                                                        "text-xs mt-2 opacity-60",
                                                        message.role === "user" ? "text-right" : "text-left"
                                                    )}
                                                >
                                                    {message.timestamp.toLocaleTimeString("ko-KR", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            {message.role === "user" && (
                                                <div className="w-8 h-8 rounded-full bg-zen-wood/20 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-zen-wood" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-3 justify-start"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-zen-gold/20 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-4 h-4 text-zen-wood" />
                                        </div>
                                        <div className="bg-zen-bg/50 border border-zen-border rounded-2xl px-4 py-3 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-zen-gold" />
                                            <span className="text-sm text-zen-muted">답변 생성 중...</span>
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </CardContent>

                            {/* 샘플 프롬프트 (메시지가 1개만 있을 때) */}
                            {messages.length === 1 && (
                                <div className="px-6 pb-4 border-t border-zen-border">
                                    <p className="text-xs text-zen-muted mb-3 mt-4">추천 질문</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SAMPLE_PROMPTS.map((prompt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSampleClick(prompt)}
                                                className="text-left text-sm p-3 rounded-lg bg-zen-bg/30 hover:bg-zen-gold/10 border border-zen-border/50 hover:border-zen-gold/50 transition-all"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 입력 영역 */}
                            <div className="p-4 border-t border-zen-border">
                                <div className="flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="무엇이든 물어보세요..."
                                        className="flex-1"
                                        disabled={loading}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        size="icon"
                                        className="flex-shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-zen-muted mt-2 text-center">
                                    AI 상담은 참고용이며, 실제 전문가 상담을 대체하지 않습니다.
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
