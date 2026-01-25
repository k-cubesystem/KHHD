"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Heart, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface FamilyNode {
    id: string;
    name: string;
    relationship: string;
    birthDate: string;
}

export interface CompatibilityEdge {
    from: string; // node id
    to: string; // node id
    score: number; // 0-100
    type: "love" | "business" | "friendship";
}

interface CompatibilityMatrixProps {
    nodes: FamilyNode[];
    edges: CompatibilityEdge[];
}

export function CompatibilityMatrix({ nodes, edges }: CompatibilityMatrixProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 100;

    // Calculate circular positions for nodes
    useEffect(() => {
        const newPositions: Record<string, { x: number; y: number }> = {};
        const angleStep = (2 * Math.PI) / nodes.length;

        nodes.forEach((node, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start from top
            newPositions[node.id] = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        });

        setPositions(newPositions);
    }, [nodes, centerX, centerY, radius]);

    // Get compatibility score between two nodes
    const getCompatibility = (nodeId1: string, nodeId2: string): CompatibilityEdge | null => {
        return (
            edges.find(
                (e) =>
                    (e.from === nodeId1 && e.to === nodeId2) ||
                    (e.from === nodeId2 && e.to === nodeId1)
            ) || null
        );
    };

    // Get color based on compatibility score
    const getScoreColor = (score: number): string => {
        if (score >= 80) return "#C5B358"; // zen-gold (Very Good)
        if (score >= 60) return "#8B6E58"; // zen-wood (Good)
        if (score >= 40) return "#989390"; // zen-muted (Neutral)
        return "#E5E3DF"; // zen-border (Low)
    };

    // Get edge type icon
    const getTypeIcon = (type: CompatibilityEdge["type"]) => {
        switch (type) {
            case "love":
                return <Heart className="w-3 h-3 text-red-500" />;
            case "business":
                return <Sparkles className="w-3 h-3 text-gold-500" />;
            case "friendship":
                return <Users className="w-3 h-3 text-blue-500" />;
        }
    };

    // Download as image
    const handleDownload = async () => {
        if (!svgRef.current) return;

        try {
            // Create a canvas from SVG
            const svgData = new XMLSerializer().serializeToString(svgRef.current);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const img = new Image();
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                canvas.width = width;
                canvas.height = height;

                // White background
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                // Download
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `compatibility-matrix-${Date.now()}.png`;
                    a.click();
                    toast.success("이미지가 다운로드되었습니다.");
                });
            };

            img.src = url;
        } catch (error) {
            console.error("Download error:", error);
            toast.error("이미지 다운로드에 실패했습니다.");
        }
    };

    // Get related edges for a node
    const getRelatedEdges = (nodeId: string): CompatibilityEdge[] => {
        return edges.filter((e) => e.from === nodeId || e.to === nodeId);
    };

    if (nodes.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-zen-muted mb-4" />
                <p className="text-zen-muted">가족 및 지인 정보를 추가하여 궁합 그래프를 확인하세요.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-zen-text flex items-center gap-2">
                        <Users className="w-6 h-6 text-zen-gold" />
                        인연 궁합 매트릭스
                    </h2>
                    <p className="text-sm text-zen-muted mt-1">
                        가족 및 지인 간의 궁합 관계를 한눈에 확인하세요
                    </p>
                </div>

                <Button
                    onClick={handleDownload}
                    className="bg-zen-wood text-white hover:bg-zen-wood/90"
                >
                    <Download className="w-4 h-4 mr-2" />
                    이미지 저장
                </Button>
            </div>

            {/* Legend */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-zen-muted" />
                        <span className="font-semibold">점수:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#C5B358]" />
                        <span>80-100 (매우 좋음)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#8B6E58]" />
                        <span>60-79 (좋음)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#989390]" />
                        <span>40-59 (보통)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#E5E3DF]" />
                        <span>0-39 (낮음)</span>
                    </div>
                </div>
            </Card>

            {/* SVG Graph */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-zen-bg via-white to-zen-bg/50">
                        <svg
                            ref={svgRef}
                            width={width}
                            height={height}
                            className="mx-auto"
                            viewBox={`0 0 ${width} ${height}`}
                        >
                            {/* Edges (drawn first, so they appear behind nodes) */}
                            <g className="edges">
                                {edges.map((edge) => {
                                    const fromPos = positions[edge.from];
                                    const toPos = positions[edge.to];

                                    if (!fromPos || !toPos) return null;

                                    const isHighlighted =
                                        selectedNode === edge.from ||
                                        selectedNode === edge.to ||
                                        hoveredEdge === `${edge.from}-${edge.to}`;

                                    return (
                                        <motion.line
                                            key={`${edge.from}-${edge.to}`}
                                            x1={fromPos.x}
                                            y1={fromPos.y}
                                            x2={toPos.x}
                                            y2={toPos.y}
                                            stroke={getScoreColor(edge.score)}
                                            strokeWidth={isHighlighted ? 4 : 2}
                                            opacity={isHighlighted ? 1 : 0.4}
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.4 }}
                                            transition={{ duration: 0.8, delay: 0.2 }}
                                            onMouseEnter={() => setHoveredEdge(`${edge.from}-${edge.to}`)}
                                            onMouseLeave={() => setHoveredEdge(null)}
                                            style={{ cursor: "pointer" }}
                                        />
                                    );
                                })}
                            </g>

                            {/* Nodes */}
                            <g className="nodes">
                                {nodes.map((node, index) => {
                                    const pos = positions[node.id];
                                    if (!pos) return null;

                                    const isSelected = selectedNode === node.id;
                                    const relatedEdges = getRelatedEdges(node.id);

                                    return (
                                        <motion.g
                                            key={node.id}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            whileHover={{ scale: 1.1 }}
                                            onClick={() =>
                                                setSelectedNode(isSelected ? null : node.id)
                                            }
                                            style={{ cursor: "pointer" }}
                                        >
                                            {/* Node Circle */}
                                            <circle
                                                cx={pos.x}
                                                cy={pos.y}
                                                r={isSelected ? 40 : 35}
                                                fill="white"
                                                stroke={isSelected ? "#C5B358" : "#8B6E58"}
                                                strokeWidth={isSelected ? 3 : 2}
                                            />

                                            {/* Node Label */}
                                            <text
                                                x={pos.x}
                                                y={pos.y}
                                                textAnchor="middle"
                                                dy="0.3em"
                                                fontSize="14"
                                                fontWeight="bold"
                                                fill="#2C2A29"
                                            >
                                                {node.name}
                                            </text>

                                            {/* Relationship Badge */}
                                            <text
                                                x={pos.x}
                                                y={pos.y + 50}
                                                textAnchor="middle"
                                                fontSize="11"
                                                fill="#989390"
                                            >
                                                {node.relationship}
                                            </text>

                                            {/* Connection Count */}
                                            {relatedEdges.length > 0 && (
                                                <circle
                                                    cx={pos.x + 25}
                                                    cy={pos.y - 25}
                                                    r="12"
                                                    fill="#C5B358"
                                                />
                                            )}
                                            {relatedEdges.length > 0 && (
                                                <text
                                                    x={pos.x + 25}
                                                    y={pos.y - 25}
                                                    textAnchor="middle"
                                                    dy="0.3em"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                    fill="white"
                                                >
                                                    {relatedEdges.length}
                                                </text>
                                            )}
                                        </motion.g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </CardContent>
            </Card>

            {/* Selected Node Details */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <Card className="p-6 bg-gold-50/50 border-gold-300">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-gold-500" />
                                    {nodes.find((n) => n.id === selectedNode)?.name}님의 궁합 정보
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {getRelatedEdges(selectedNode).map((edge) => {
                                        const otherNodeId =
                                            edge.from === selectedNode ? edge.to : edge.from;
                                        const otherNode = nodes.find((n) => n.id === otherNodeId);

                                        if (!otherNode) return null;

                                        return (
                                            <div
                                                key={`${edge.from}-${edge.to}`}
                                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-zen-border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getTypeIcon(edge.type)}
                                                    <div>
                                                        <p className="font-semibold text-sm">
                                                            {otherNode.name}
                                                        </p>
                                                        <p className="text-xs text-zen-muted">
                                                            {otherNode.relationship}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    className={cn(
                                                        "px-3 py-1 font-bold",
                                                        edge.score >= 80 && "bg-gold-100 text-gold-800 border-gold-300",
                                                        edge.score >= 60 && edge.score < 80 && "bg-zen-wood/20 text-zen-wood border-zen-wood/30",
                                                        edge.score >= 40 && edge.score < 60 && "bg-gray-100 text-gray-700 border-gray-300",
                                                        edge.score < 40 && "bg-gray-50 text-gray-500 border-gray-200"
                                                    )}
                                                >
                                                    {edge.score}점
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
