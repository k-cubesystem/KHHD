import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    // URL 파라미터에서 데이터 추출
    const name = searchParams.get("name") || "사용자";
    const element = searchParams.get("element") || "木";
    const type = searchParams.get("type") || "detail";
    const score = searchParams.get("score") || "85";

    // 오행별 색상
    const elementColors: Record<string, { bg: string; accent: string }> = {
        木: { bg: "#E8F5E9", accent: "#2E7D32" },
        火: { bg: "#FFEBEE", accent: "#C62828" },
        土: { bg: "#FFF8E1", accent: "#F57F17" },
        金: { bg: "#F3E5F5", accent: "#6A1B9A" },
        水: { bg: "#E3F2FD", accent: "#1565C0" },
    };

    const colors = elementColors[element] || elementColors["木"];

    // 타입별 템플릿
    if (type === "compatibility") {
        return new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.bg,
                        fontFamily: "sans-serif",
                        padding: "60px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            backgroundColor: "white",
                            borderRadius: "24px",
                            padding: "60px",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
                            border: `4px solid ${colors.accent}`,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: "bold",
                                color: colors.accent,
                                marginBottom: 20,
                            }}
                        >
                            ✨ 궁합 분석 결과
                        </div>
                        <div
                            style={{
                                fontSize: 120,
                                fontWeight: "bold",
                                color: colors.accent,
                                marginBottom: 20,
                            }}
                        >
                            {score}점
                        </div>
                        <div
                            style={{
                                fontSize: 48,
                                color: "#666",
                                textAlign: "center",
                            }}
                        >
                            {name}님의 궁합 분석
                        </div>
                        <div
                            style={{
                                marginTop: 40,
                                fontSize: 32,
                                color: "#999",
                            }}
                        >
                            해화당 • Haehwadang
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    }

    // 기본 사주 상세 템플릿
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.bg,
                    fontFamily: "sans-serif",
                    padding: "60px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        backgroundColor: "white",
                        borderRadius: "24px",
                        padding: "60px",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
                        border: `4px solid ${colors.accent}`,
                    }}
                >
                    <div
                        style={{
                            fontSize: 96,
                            fontWeight: "bold",
                            color: colors.accent,
                            marginBottom: 30,
                        }}
                    >
                        {element}
                    </div>
                    <div
                        style={{
                            fontSize: 56,
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: 20,
                        }}
                    >
                        {name}님의 사주
                    </div>
                    <div
                        style={{
                            fontSize: 40,
                            color: "#666",
                            textAlign: "center",
                        }}
                    >
                        일간: {element} | 사주명리 분석 완료
                    </div>
                    <div
                        style={{
                            marginTop: 40,
                            fontSize: 32,
                            color: "#999",
                        }}
                    >
                        해화당 • Haehwadang
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
