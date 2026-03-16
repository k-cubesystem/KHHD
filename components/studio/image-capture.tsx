"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageCaptureProps {
    onImageCapture: (base64: string, file: File) => void;
    acceptedFormats?: string;
    maxSizeMB?: number;
}

export function ImageCapture({
    onImageCapture,
    acceptedFormats = "image/*",
    maxSizeMB = 10,
}: ImageCaptureProps) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (file: File) => {
        setError(null);

        // Validate file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            setError(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`);
            return;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("이미지 파일만 업로드 가능합니다.");
            return;
        }

        // Read file and convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const base64Data = base64.split(",")[1]; // Remove data:image/...;base64, prefix
            setPreview(base64);
            onImageCapture(base64Data, file);
        };
        reader.readAsDataURL(file);
    };

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const clearPreview = () => {
        setPreview(null);
        setError(null);
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Card className="card-glass-manse p-6 border-gold-500/20">
            <div className="space-y-4">
                <AnimatePresence mode="wait">
                    {!preview ? (
                        <motion.div
                            key="upload-options"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {/* Camera Capture (Mobile) */}
                            <Button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-gold-500/30 
                  bg-transparent hover:bg-gold-500/5 
                  flex flex-col gap-3 text-white"
                            >
                                <Camera className="w-10 h-10 text-gold-500" />
                                <span className="text-sm font-sans">사진 촬영하기</span>
                            </Button>
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept={acceptedFormats}
                                capture="environment"
                                onChange={handleCameraCapture}
                                className="hidden"
                            />

                            {/* File Upload (Desktop) */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-gold-500/30 text-gold-500 
                  hover:bg-gold-500/10"
                            >
                                <Upload className="w-5 h-5 mr-2" />
                                갤러리에서 선택
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={acceptedFormats}
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            <p className="text-xs text-white/40 text-center font-sans">
                                최대 {maxSizeMB}MB까지 업로드 가능합니다
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative"
                        >
                            <div className="relative rounded-lg overflow-hidden border-2 border-gold-500/30">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-auto max-h-[400px] object-contain bg-black/20"
                                />
                                <Button
                                    onClick={clearPreview}
                                    className="absolute top-3 right-3 w-10 h-10 p-0 
                    bg-black/60 hover:bg-black/80 rounded-full border border-white/20"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </Button>
                            </div>
                            <p className="text-xs text-gold-500 text-center mt-2 font-sans">
                                ✓ 이미지가 선택되었습니다
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                {error && (
                    <p
                        className="text-sm text-red-400 text-center font-sans anim-fade-in-up"
                        style={{
                            '--fade-y': '-10px',
                            animation: 'fade-in-up 0.3s ease-out both',
                        } as React.CSSProperties}
                    >
                        {error}
                    </p>
                )}
            </div>
        </Card>
    );
}
