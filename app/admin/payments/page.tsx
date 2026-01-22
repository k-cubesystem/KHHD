import { PaymentManagementClient } from "./payment-management-client";
import { AnimatedHeader } from "@/components/admin/dashboard-stats";

export default function PaymentManagementPage() {
  return (
    <>
      <AnimatedHeader title="Payment History" subtitle="전체 결제 내역 조회 및 상태 확인" />

      <div className="mt-8">
        <PaymentManagementClient />
      </div>
    </>
  );
}
