"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Scroll, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SajuInputPage() {
    return (
        <div className="min-h-screen w-full bg-background text-ink-light font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Header / Title */}
            <div className="z-10 w-full max-w-md mb-12 text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/30 border border-primary/20 backdrop-blur-sm mb-2">
                    <Scroll className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Sacred Ledger</span>
                </div>
                <h1 className="font-serif text-4xl font-bold tracking-tight text-ink-light italic">
                    명부를 <span className="text-primary-dim">펼치다</span>
                </h1>
                <p className="font-sans text-ink-light/60 text-sm tracking-wide font-light">
                    정확한 분석을 위해 생년월일시를 입력해주세요.
                </p>
            </div>

            {/* Input Form (Ledger Style) */}
            <Card className="z-10 w-full max-w-md p-8 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200 rounded-none relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/50" />

                <div className="space-y-10">
                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-primary uppercase tracking-widest">Name</Label>
                        <Input
                            type="text"
                            className="w-full bg-surface/50 border-primary/20 text-center font-serif text-xl h-14 text-ink-light placeholder:text-ink-light/20 focus:border-primary transition-colors rounded-none"
                            placeholder="성함 (Name)"
                        />
                    </div>

                    {/* Date / Time Fields */}
                    <div className="grid grid-cols-1 gap-8">
                        {/* Birth Date */}
                        <div className="space-y-3 text-center">
                            <Label className="text-xs font-bold text-ink-light/40 uppercase tracking-widest">Date of Birth</Label>
                            <div className="flex gap-2 items-center justify-center">
                                <Input type="text" placeholder="YYYY" className="w-24 bg-surface/50 border-primary/20 text-center font-serif text-lg h-12 rounded-none focus:border-primary" />
                                <span className="text-primary/50 text-xl font-light">/</span>
                                <Input type="text" placeholder="MM" className="w-16 bg-surface/50 border-primary/20 text-center font-serif text-lg h-12 rounded-none focus:border-primary" />
                                <span className="text-primary/50 text-xl font-light">/</span>
                                <Input type="text" placeholder="DD" className="w-16 bg-surface/50 border-primary/20 text-center font-serif text-lg h-12 rounded-none focus:border-primary" />
                            </div>
                        </div>

                        {/* Birth Time */}
                        <div className="space-y-3 text-center">
                            <Label className="text-xs font-bold text-ink-light/40 uppercase tracking-widest">Birth Time</Label>
                            <div className="flex gap-2 items-center justify-center">
                                <Input type="text" placeholder="HH" className="w-16 bg-surface/50 border-primary/20 text-center font-serif text-lg h-12 rounded-none focus:border-primary" />
                                <span className="text-primary/50 text-xl font-light">:</span>
                                <Input type="text" placeholder="MM" className="w-16 bg-surface/50 border-primary/20 text-center font-serif text-lg h-12 rounded-none focus:border-primary" />
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <input type="checkbox" id="unknown-time" className="w-3 h-3 border-primary/30 rounded-none bg-transparent" />
                                <label htmlFor="unknown-time" className="text-[10px] text-ink-light/40 font-sans cursor-pointer hover:text-primary">태어난 시를 모를 경우 체크</label>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Toggle (Lunar/Solar) */}
                    <div className="flex justify-center pt-2">
                        <div className="inline-flex p-1 bg-surface border border-primary/20 rounded-none">
                            <button className="px-6 py-2 bg-primary text-background shadow-sm text-xs font-bold tracking-widest transition-all rounded-none">
                                양력 (Solar)
                            </button>
                            <button className="px-6 py-2 text-ink-light/50 hover:text-ink-light text-xs font-medium tracking-widest transition-all rounded-none">
                                음력 (Lunar)
                            </button>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 flex justify-center">
                        <Link href="/protected/analysis/result" className="w-full">
                            <Button className="w-full h-14 bg-primary text-background hover:bg-primary-light transition-all duration-300 shadow-xl rounded-none group uppercase tracking-widest text-sm font-bold">
                                명식 작성하기
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                </div>
            </Card>
        </div>
    );
}
