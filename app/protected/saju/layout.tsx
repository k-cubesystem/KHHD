import { ReactNode } from "react";

export default function SajuLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative min-h-screen">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] right-[5%] w-[500px] h-[500px] bg-[#D4AF37]/3 rounded-full blur-[180px]" />
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {children}
            </div>
        </div>
    );
}
