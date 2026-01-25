import { ShamanChatInterface } from "@/components/ai/shaman-chat-interface";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI 신당 | 해화당",
    description: "천지인의 지혜로 당신의 고민을 풀어드리는 AI 상담",
};

export default function AIShamanPage() {
    return <ShamanChatInterface />;
}
