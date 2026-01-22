import { ProductManagementClient } from "./product-management-client";
import { AnimatedHeader } from "@/components/admin/dashboard-stats";

export default function ProductManagementPage() {
  return (
    <>
      <AnimatedHeader title="Product Management" subtitle="분석 상품 가격 및 판매 상태 관리" />

      <div className="mt-8">
        <ProductManagementClient />
      </div>
    </>
  );
}
