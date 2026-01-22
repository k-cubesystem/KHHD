"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { updateProductAction } from "./actions";
import type { PricePlan } from "@/types/auth";

interface Props {
  initialProducts: PricePlan[];
}

export function ProductManagementClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<PricePlan[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpdate = async (product: PricePlan) => {
    setLoading(product.id);
    try {
      const result = await updateProductAction(product);
      if (result.success) {
        toast.success("상품이 업데이트되었습니다.");
        setEditingId(null);
      } else {
        toast.error(result.error || "업데이트 실패");
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const handleChange = (
    id: string,
    field: keyof PricePlan,
    value: any
  ) => {
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
    setEditingId(id);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card
            key={product.id}
            className={`p-6 border transition-all ${
              product.is_active
                ? "bg-white/5 border-white/10"
                : "bg-white/[0.02] border-white/5 opacity-60"
            }`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#D4AF37]/10">
                    <Package className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.credits} 크레딧
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {product.is_active ? "활성" : "비활성"}
                  </span>
                  <Switch
                    checked={product.is_active}
                    onCheckedChange={(checked) =>
                      handleChange(product.id, "is_active", checked)
                    }
                  />
                </div>
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">가격 (원)</Label>
                <Input
                  type="number"
                  value={product.price}
                  onChange={(e) =>
                    handleChange(product.id, "price", parseInt(e.target.value) || 0)
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Badge Input */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  배지 텍스트
                </Label>
                <Input
                  value={product.badge_text || ""}
                  onChange={(e) =>
                    handleChange(product.id, "badge_text", e.target.value || null)
                  }
                  placeholder="예: 가장 인기, 최저가"
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">설명</Label>
                <Input
                  value={product.description || ""}
                  onChange={(e) =>
                    handleChange(product.id, "description", e.target.value)
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Save Button */}
              {editingId === product.id && (
                <Button
                  onClick={() => handleUpdate(product)}
                  disabled={loading === product.id}
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#B8962E]"
                >
                  {loading === product.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      변경사항 저장
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>등록된 상품이 없습니다.</p>
          <p className="text-xs mt-1">마이그레이션을 먼저 실행해주세요.</p>
        </div>
      )}
    </div>
  );
}
