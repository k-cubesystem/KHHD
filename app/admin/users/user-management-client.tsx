"use client";

import { useState, useEffect } from "react";
import { AdminUser, getUsers, updateUserRole } from "./actions";
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
import { Search, Loader2, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="이메일 또는 이름 검색..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 transition-all font-sans"
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
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-white/50 px-2">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/50">사용자</TableHead>
              <TableHead className="text-white/50">이메일</TableHead>
              <TableHead className="text-white/50">가입일</TableHead>
              <TableHead className="text-white/50">권한(Role)</TableHead>
              <TableHead className="text-right text-white/50">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  <TableCell><div className="h-4 w-24 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 w-24 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-8 bg-white/10 rounded-full animate-pulse ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={5} className="h-40 text-center text-white/40">
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
                    className="border-white/10 hover:bg-white/5 transition-colors group"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </div>
                        <span className="text-white/90">{user.full_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70 font-sans text-sm">{user.email || "-"}</TableCell>
                    <TableCell className="text-white/50 text-xs font-sans">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                      >
                        <SelectTrigger className={cn(
                          "w-[110px] h-8 border-none font-medium text-xs",
                          user.role === 'admin' ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" :
                            user.role === 'tester' ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" :
                              "bg-white/10 text-white/70 hover:bg-white/20"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                          <SelectItem value="user">USER</SelectItem>
                          <SelectItem value="tester" className="text-yellow-400">TESTER</SelectItem>
                          <SelectItem value="admin" className="text-red-400 font-bold">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white hover:bg-white/10">
                        <UserCog className="w-4 h-4" />
                      </Button>
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
