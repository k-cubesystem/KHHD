import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { UserManagementClient } from "./user-management-client";

async function getUsers() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Admin] Error fetching users:", error);
    return [];
  }

  return users || [];
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">회원 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          등록된 회원 정보를 조회하고 권한을 관리합니다.
        </p>
      </div>

      {/* User Table */}
      <Card className="p-6 bg-white/5 border-white/10">
        <UserManagementClient initialUsers={users} />
      </Card>
    </div>
  );
}
