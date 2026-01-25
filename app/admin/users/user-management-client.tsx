"use client";

import { useState, useEffect } from "react";
import { AdminUser, getUsers, updateUserRole, deleteUser } from "./actions";
import { UserRole } from "@/types/auth";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Loader2, ChevronLeft, ChevronRight, UserCog, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UserManagementClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, total } = await getUsers(page, limit, searchTerm);
      setUsers(data);
      setTotal(total);
    } catch (error) {
      toast.error("사용자 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("정말 이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터(결제, 사주기록 등)가 삭제됩니다.")) {
      return;
    }

    const toastId = toast.loading("사용자 삭제 중...");
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        toast.success("사용자가 삭제되었습니다.", { id: toastId });
        fetchUsers(); // Refresh list
      } else {
        toast.error("삭제 실패: " + result.error, { id: toastId });
      }
    } catch (e) {
      toast.error("삭제 중 오류가 발생했습니다.", { id: toastId });
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const oldUsers = [...users];

    // Optimistic Update
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast.info("권한을 변경 중입니다...");

    const result = await updateUserRole(userId, newRole);

    if (result.success) {
      toast.success("사용자 권한이 변경되었습니다.");
    } else {
      setUsers(oldUsers); // Rollback
      toast.error("권한 변경 실패: " + result.error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zen-muted" />
          <Input
            placeholder="이메일 또는 이름 검색..."
            className="pl-10 bg-white border-zen-border text-zen-text placeholder:text-zen-muted focus:border-zen-gold transition-all font-sans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Pagination (Simple) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="bg-white border-zen-border text-zen-text hover:bg-zen-bg"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-zen-muted px-2">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="bg-white border-zen-border text-zen-text hover:bg-zen-bg"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zen-border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zen-bg/50">
            <TableRow className="border-zen-border hover:bg-zen-bg/80">
              <TableHead className="text-zen-muted font-serif">사용자</TableHead>
              <TableHead className="text-zen-muted font-serif">이메일</TableHead>
              <TableHead className="text-zen-muted font-serif">가입일</TableHead>
              <TableHead className="text-zen-muted font-serif">권한(Role)</TableHead>
              <TableHead className="text-right text-zen-muted font-serif">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-zen-border">
                  <TableCell><div className="h-4 w-24 bg-zen-bg rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-zen-bg rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-zen-bg rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 w-24 bg-zen-bg rounded animate-pulse" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-8 bg-zen-bg rounded-full animate-pulse ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow className="border-zen-border">
                <TableCell colSpan={5} className="h-40 text-center text-zen-muted">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {users.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-zen-border hover:bg-zen-bg/30 transition-colors group"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zen-wood/10 flex items-center justify-center text-xs font-bold text-zen-wood">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </div>
                        <span className="text-zen-text">{user.full_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zen-text/70 font-sans text-sm">{user.email || "-"}</TableCell>
                    <TableCell className="text-zen-muted text-xs font-sans">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                      >
                        <SelectTrigger className={cn(
                          "w-[110px] h-8 border-none font-medium text-xs",
                          user.role === 'admin' ? "bg-red-50 text-red-600 hover:bg-red-100" :
                            user.role === 'tester' ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100" :
                              "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-zen-border">
                          <SelectItem value="user">USER</SelectItem>
                          <SelectItem value="tester" className="text-yellow-600">TESTER</SelectItem>
                          <SelectItem value="admin" className="text-red-600 font-bold">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zen-muted hover:text-zen-wood hover:bg-zen-bg">
                            <UserCog className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zen-muted hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
