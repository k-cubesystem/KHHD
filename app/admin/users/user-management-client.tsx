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
    <div className="space-y-4 md:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <Input
            placeholder="이메일 또는 이름 검색..."
            className="pl-10 h-9 md:h-10 bg-stone-900/50 border-stone-700/50 text-stone-200 placeholder:text-stone-600 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all font-sans text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-9 w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs md:text-sm font-medium text-stone-400 px-2 font-mono">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-9 w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block rounded-xl border border-zen-border bg-white overflow-hidden shadow-sm">
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          // Skeleton Loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-stone-900/30 rounded-xl border border-stone-700/30">
              <div className="h-4 w-32 bg-stone-800/50 rounded animate-pulse mb-3" />
              <div className="h-3 w-48 bg-stone-800/50 rounded animate-pulse mb-2" />
              <div className="h-8 w-24 bg-stone-800/50 rounded animate-pulse" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="p-8 text-center bg-stone-900/30 rounded-xl border border-stone-700/30">
            <Users className="w-12 h-12 mx-auto mb-3 text-stone-700" />
            <p className="text-sm text-stone-500">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <AnimatePresence>
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 hover:border-gold-500/30 transition-all duration-300 overflow-hidden group"
              >
                {/* Noise Overlay */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
                {/* User Info */}
                <div className="relative flex items-start gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/5 border border-gold-500/20 flex items-center justify-center text-sm font-bold text-gold-400 flex-shrink-0">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-200 truncate text-sm">{user.full_name || "-"}</p>
                    <p className="text-xs text-stone-500 truncate">{user.email || "-"}</p>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="relative flex items-center justify-between gap-2 pt-3 border-t border-stone-700/30">
                  <Select
                    defaultValue={user.role}
                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                  >
                    <SelectTrigger className={cn(
                      "h-7 md:h-8 border font-medium text-xs flex-1 max-w-[110px]",
                      user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        user.role === 'tester' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                          "bg-stone-700/30 text-stone-400 border-stone-600/30"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-700">
                      <SelectItem value="user" className="text-stone-300 hover:bg-stone-800">USER</SelectItem>
                      <SelectItem value="tester" className="text-yellow-400 hover:bg-stone-800">TESTER</SelectItem>
                      <SelectItem value="admin" className="text-red-400 font-bold hover:bg-stone-800">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-500 hover:text-gold-400 hover:bg-stone-800/50">
                        <UserCog className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-stone-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
