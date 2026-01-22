"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface ZodiacTime {
    value: string; // "00:30", "02:30" 등
    label: string; // "자시 (子時)"
    description: string; // "23:30 ~ 01:29"
}

export const ZODIAC_TIMES: ZodiacTime[] = [
    { value: "unknown", label: "모름", description: "시간 정보 없음" },
    { value: "00:30", label: "자시 (子時)", description: "23:30 ~ 01:29" },
    { value: "02:30", label: "축시 (丑時)", description: "01:30 ~ 03:29" },
    { value: "04:30", label: "인시 (寅時)", description: "03:30 ~ 05:29" },
    { value: "06:30", label: "묘시 (卯時)", description: "05:30 ~ 07:29" },
    { value: "08:30", label: "진시 (辰時)", description: "07:30 ~ 09:29" },
    { value: "10:30", label: "사시 (巳時)", description: "09:30 ~ 11:29" },
    { value: "12:30", label: "오시 (午時)", description: "11:30 ~ 13:29" },
    { value: "14:30", label: "미시 (未時)", description: "13:30 ~ 15:29" },
    { value: "16:30", label: "신시 (申時)", description: "15:30 ~ 17:29" },
    { value: "18:30", label: "유시 (酉時)", description: "17:30 ~ 19:29" },
    { value: "20:30", label: "술시 (戌時)", description: "19:30 ~ 21:29" },
    { value: "22:30", label: "해시 (亥時)", description: "21:30 ~ 23:29" },
];

interface ZodiacTimeSelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    className?: string;
}

export function ZodiacTimeSelect({
    value,
    onValueChange,
    name = "birth_time",
    className,
}: ZodiacTimeSelectProps) {
    return (
        <Select value={value} onValueChange={onValueChange} name={name}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="태어난 시간 선택" />
            </SelectTrigger>
            <SelectContent>
                {ZODIAC_TIMES.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                        <div className="flex flex-col">
                            <span className="font-medium">{time.label}</span>
                            <span className="text-xs text-muted-foreground">{time.description}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
