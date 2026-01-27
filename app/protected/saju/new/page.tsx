import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SajuInputPage() {
    return (
        <div className="min-h-screen w-full bg-hanji text-ink font-serif flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')]" />

            {/* Header / Title */}
            <div className="z-10 w-full max-w-md mb-12 text-center space-y-4 animate-in fade-in duration-700">
                <span className="block text-cinnabar text-xs font-bold tracking-[0.4em] uppercase font-sans">
                    Sacred Ledger
                </span>
                <h1 className="font-gungseo text-3xl font-bold tracking-widest text-ink">
                    명부를 펼치다
                </h1>
                <p className="font-sans text-ink/50 text-sm tracking-wide font-light">
                    정확한 분석을 위해 생년월일시를 입력해주세요.
                </p>
            </div>

            {/* Input Form (Ledger Style) */}
            <div className="z-10 w-full max-w-md space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">

                {/* Name Field */}
                <div className="relative group">
                    <input
                        type="text"
                        className="w-full bg-transparent border-b border-ink/20 py-4 text-center font-gungseo text-xl text-ink placeholder:text-ink/30 focus:outline-none focus:border-cinnabar/80 transition-colors"
                        placeholder="성함 (Name)"
                    />
                </div>

                {/* Date / Time Fields */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Birth Date */}
                    <div className="space-y-2 text-center">
                        <Label className="text-xs font-sans tracking-[0.2em] text-ink/40 uppercase">Date of Birth</Label>
                        <div className="flex gap-4 items-center justify-center">
                            <input type="text" placeholder="YYYY" className="w-20 bg-transparent border-b border-ink/20 py-2 text-center font-serif text-lg focus:outline-none focus:border-gold-500" />
                            <span className="text-ink/30">/</span>
                            <input type="text" placeholder="MM" className="w-12 bg-transparent border-b border-ink/20 py-2 text-center font-serif text-lg focus:outline-none focus:border-gold-500" />
                            <span className="text-ink/30">/</span>
                            <input type="text" placeholder="DD" className="w-12 bg-transparent border-b border-ink/20 py-2 text-center font-serif text-lg focus:outline-none focus:border-gold-500" />
                        </div>
                    </div>

                    {/* Birth Time */}
                    <div className="space-y-2 text-center">
                        <Label className="text-xs font-sans tracking-[0.2em] text-ink/40 uppercase">Birth Time</Label>
                        <div className="flex gap-4 items-center justify-center">
                            <input type="text" placeholder="HH" className="w-12 bg-transparent border-b border-ink/20 py-2 text-center font-serif text-lg focus:outline-none focus:border-gold-500" />
                            <span className="text-ink/30">:</span>
                            <input type="text" placeholder="MM" className="w-12 bg-transparent border-b border-ink/20 py-2 text-center font-serif text-lg focus:outline-none focus:border-gold-500" />
                        </div>
                        <p className="text-[10px] text-ink/40 mt-2 font-sans">태어난 시를 모를 경우 '모름' 체크</p>
                    </div>
                </div>

                {/* Calendar Toggle (Lunar/Solar) */}
                <div className="flex justify-center pt-4">
                    <div className="inline-flex rounded-full p-1 bg-ink/5 border border-ink/10">
                        <button className="px-6 py-2 rounded-full bg-hanji shadow-sm text-ink text-xs font-bold tracking-widest transition-all">
                            양력 (Solar)
                        </button>
                        <button className="px-6 py-2 rounded-full text-ink/50 hover:text-ink text-xs font-medium tracking-widest transition-all">
                            음력 (Lunar)
                        </button>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-8 flex justify-center">
                    <Link href="/protected/analysis/result">
                        <button className="group relative px-10 py-4 bg-ink text-hanji hover:bg-gold-600 transition-all duration-500 shadow-xl rounded-sm w-full max-w-[200px]">
                            <span className="font-gungseo text-lg tracking-[0.3em] group-hover:text-white transition-colors">
                                명식 작성
                            </span>
                            <div className="absolute inset-1 border border-white/10 pointer-events-none" />
                        </button>
                    </Link>
                </div>

            </div>
        </div>
    );
}
