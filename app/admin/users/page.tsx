import { UserManagementClient } from "./user-management-client";
import { AnimatedHeader } from "@/components/admin/dashboard-stats";

export default function UserManagementPage() {
  return (
    <>
      <AnimatedHeader title="User Management" subtitle="회원 목록 조회 및 권한 관리" />

      <div className="mt-8">
        <UserManagementClient />
      </div>
    </>
  );
}
