import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProductManagementClient } from "./product-management-client";

async function getProducts() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("price_plans")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Admin] Error fetching products:", error);
    return [];
  }

  return products || [];
}

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">상품 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          결제 상품의 가격과 크레딧을 관리합니다.
        </p>
      </div>

      {/* Products */}
      <Card className="p-6 bg-white/5 border-white/10">
        <ProductManagementClient initialProducts={products} />
      </Card>
    </div>
  );
}
