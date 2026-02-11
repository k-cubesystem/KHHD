"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin } from "lucide-react";
import { toast } from "sonner";

interface KakaoAddressSearchProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

export function KakaoAddressSearch({ label, value, onChange, placeholder }: KakaoAddressSearchProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // 카카오 주소 검색 API 스크립트 로드
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Kakao address script");
      toast.error("주소 검색 서비스를 불러올 수 없습니다.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSearchAddress = () => {
    if (!isScriptLoaded) {
      toast.error("주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // @ts-ignore - Daum Postcode API
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
        let fullAddress = "";
        let extraAddress = "";

        if (data.userSelectedType === "R") {
          // 도로명 주소
          fullAddress = data.roadAddress;
        } else {
          // 지번 주소
          fullAddress = data.jibunAddress;
        }

        // 법정동명이 있을 경우 추가
        if (data.bname !== "" && /[동|로|가]$/g.test(data.bname)) {
          extraAddress += data.bname;
        }
        // 건물명이 있고, 공동주택일 경우 추가
        if (data.buildingName !== "" && data.apartment === "Y") {
          extraAddress += extraAddress !== "" ? ", " + data.buildingName : data.buildingName;
        }
        // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
        if (extraAddress !== "") {
          fullAddress += " (" + extraAddress + ")";
        }

        onChange(fullAddress);
      },
      theme: {
        bgColor: "#0A0A0A", // 배경색
        searchBgColor: "#1A1A1A", // 검색창 배경색
        contentBgColor: "#151515", // 본문 배경색
        pageBgColor: "#0A0A0A", // 페이지 배경색
        textColor: "#E0E0E0", // 기본 텍스트 색상
        queryTextColor: "#FFFFFF", // 검색창 텍스트 색상
        emphTextColor: "#D4AF37", // 강조 텍스트 색상 (Gold)
      },
    }).open();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`address-${label}`} className="text-sm font-light text-ink-light">
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/40" strokeWidth={1} />
          <Input
            id={`address-${label}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-surface/50 border-primary/20 focus:border-primary font-light pl-10"
            placeholder={placeholder || "주소를 검색하세요"}
            readOnly
          />
        </div>
        <Button
          type="button"
          onClick={handleSearchAddress}
          variant="outline"
          className="px-4 flex-shrink-0"
          disabled={!isScriptLoaded}
        >
          <Search className="w-4 h-4 mr-1" strokeWidth={1} />
          검색
        </Button>
      </div>
      <p className="text-xs text-ink-light/40 font-light">
        카카오 주소 검색으로 정확한 주소를 입력하세요
      </p>
    </div>
  );
}
