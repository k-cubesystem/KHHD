"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Minus, Eye, Users, Calendar, User2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserRoleAction, adjustUserCreditsAction, getUserFamilyMembersAction, type FamilyMember } from "./actions";
import type { UserRole } from "@/types/auth";

interface User {
  id: string;
  full_name: string | null;
  credits: number;
  role: UserRole;
  updated_at: string;
}

interface Props {
  initialUsers: User[];
}

export function UserManagementClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(userId);
    try {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.success) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        toast.success("권한이 변경되었습니다.");
      } else {
        toast.error(result.error || "권한 변경 실패");
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const handleCreditAdjust = async (userId: string, amount: number) => {
    setLoading(userId);
    try {
      const result = await adjustUserCreditsAction(userId, amount);
      if (result.success) {
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, credits: result.newBalance! } : u
          )
        );
        toast.success(
          `크레딧이 ${amount > 0 ? "추가" : "차감"}되었습니다. (잔액: ${result.newBalance})`
        );
      } else {
        toast.error(result.error || "크레딧 조정 실패");
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const handleViewDetail = async (user: User) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const result = await getUserFamilyMembersAction(user.id);
      if (result.success) {
        setFamilyMembers(result.data || []);
      } else {
        toast.error(result.error || "가족 정보를 불러올 수 없습니다.");
        setFamilyMembers([]);
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
      setFamilyMembers([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatGender = (gender: string | null) => {
    if (gender === "male") return "남성";
    if (gender === "female") return "여성";
    return "-";
  };

  const formatCalendarType = (type: string | null) => {
    if (type === "solar") return "양력";
    if (type === "lunar") return "음력";
    return "-";
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-400/20 text-red-400";
      case "tester":
        return "bg-yellow-400/20 text-yellow-400";
      default:
        return "bg-gray-400/20 text-gray-400";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "tester":
        return "테스터";
      default:
        return "일반";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="이름 또는 ID로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                회원
              </th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                크레딧
              </th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                권한
              </th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                크레딧 조정
              </th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">
                최근 활동
              </th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                상세
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium">
                        {user.full_name || "이름 없음"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {user.id}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold">{user.credits || 0}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as UserRole)
                        }
                        disabled={loading === user.id}
                      >
                        <SelectTrigger className="w-[120px] h-8 bg-white/5 border-white/10">
                          <SelectValue>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">일반</SelectItem>
                          <SelectItem value="tester">테스터</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-white/10 hover:bg-red-400/20 hover:text-red-400"
                        onClick={() => handleCreditAdjust(user.id, -1)}
                        disabled={loading === user.id || (user.credits || 0) <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-white/10 hover:bg-green-400/20 hover:text-green-400"
                        onClick={() => handleCreditAdjust(user.id, 1)}
                        disabled={loading === user.id}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 border-white/10 hover:bg-green-400/20 hover:text-green-400"
                        onClick={() => handleCreditAdjust(user.id, 10)}
                        disabled={loading === user.id}
                      >
                        +10
                      </Button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.updated_at).toLocaleDateString("ko-KR")}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                      onClick={() => handleViewDetail(user)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        총 {filteredUsers.length}명의 회원
      </div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User2 className="w-5 h-5 text-[#D4AF37]" />
              {selectedUser?.full_name || "이름 없음"} 상세 정보
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="p-4 rounded-lg bg-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{selectedUser?.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">크레딧</span>
                <span className="font-bold">{selectedUser?.credits || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">권한</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(selectedUser?.role || "user")}`}>
                  {getRoleLabel(selectedUser?.role || "user")}
                </span>
              </div>
            </div>

            {/* Family Members */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                등록된 가족/지인 ({familyMembers.length}명)
              </h4>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
                </div>
              ) : familyMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  등록된 가족/지인이 없습니다.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.relationship || "관계 미지정"}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.gender === "male"
                            ? "bg-blue-400/20 text-blue-400"
                            : member.gender === "female"
                            ? "bg-pink-400/20 text-pink-400"
                            : "bg-gray-400/20 text-gray-400"
                        }`}>
                          {formatGender(member.gender)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {member.birth_date} ({formatCalendarType(member.calendar_type)})
                        </span>
                        {member.birth_time && (
                          <span>
                            {member.birth_time}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
