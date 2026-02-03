"use client";

import { useState, useEffect } from "react";
import { AdminPayment, getPayments } from "./actions";
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
import { Loader2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PaymentManagementClient() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, page]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const { data, total } = await getPayments(page, limit, statusFilter);
      setPayments(data);
      setTotal(total);
    } catch (error) {
      toast.error("결제 내역을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] md:text-[10px]">성공</Badge>;
      case 'failed': return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] md:text-[10px]">실패</Badge>;
      case 'test_charge': return <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] md:text-[10px]">테스트</Badge>;
      default: return <Badge variant="outline" className="text-stone-500 border-stone-700 text-[9px] md:text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-stone-100 font-serif">결제 내역</h1>
        <p className="text-xs md:text-sm text-stone-500">
          회원들의 결제 및 충전 기록을 확인하세요.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-stone-500 font-medium">상태 필터:</span>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[140px] md:w-[180px] h-8 md:h-9 bg-stone-900/50 border-stone-700/50 text-stone-200 text-xs md:text-sm">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-700">
              <SelectItem value="all" className="text-stone-300">모든 결제</SelectItem>
              <SelectItem value="completed" className="text-emerald-400">결제 성공</SelectItem>
              <SelectItem value="test_charge" className="text-yellow-400">테스트 충전</SelectItem>
              <SelectItem value="failed" className="text-red-400">실패/취소</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-8 w-8 md:h-9 md:w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
          <span className="text-xs md:text-sm font-medium text-stone-400 px-2 font-mono">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-8 w-8 md:h-9 md:w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block rounded-xl border border-stone-700/30 bg-gradient-to-br from-stone-800/30 to-stone-900/20 overflow-hidden shadow-lg">
        <Table>
          <TableHeader className="bg-stone-900/50">
            <TableRow className="border-stone-700/30 hover:bg-stone-800/50">
              <TableHead className="text-stone-400 font-serif text-xs">주문 ID</TableHead>
              <TableHead className="text-stone-400 font-serif text-xs">사용자</TableHead>
              <TableHead className="text-stone-400 font-serif text-xs">금액</TableHead>
              <TableHead className="text-stone-400 font-serif text-xs">크레딧</TableHead>
              <TableHead className="text-stone-400 font-serif text-xs">상태</TableHead>
              <TableHead className="text-stone-400 font-serif text-xs">일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-stone-700/30">
                  <TableCell><div className="h-4 w-32 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-10 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 w-16 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-stone-800/50 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow className="border-stone-700/30">
                <TableCell colSpan={6} className="h-40 text-center text-stone-500">
                  결제 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {payments.map((payment) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-stone-700/30 hover:bg-stone-800/30 transition-colors group"
                  >
                    <TableCell className="font-mono text-xs text-stone-500">{payment.order_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-stone-200 font-medium">{payment.profiles?.full_name || "Unknown"}</span>
                        <span className="text-xs text-stone-500">{payment.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold tabular-nums text-stone-100 font-mono">
                      ₩{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-gold-500/10 text-gold-400 border border-gold-500/20 text-xs">
                        +{payment.credits_purchased}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-xs text-stone-500">
                      {new Date(payment.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 bg-stone-900/30 rounded-xl border border-stone-700/30">
              <div className="h-4 w-32 bg-stone-800/50 rounded animate-pulse mb-3" />
              <div className="h-3 w-48 bg-stone-800/50 rounded animate-pulse mb-2" />
              <div className="h-8 w-24 bg-stone-800/50 rounded animate-pulse" />
            </div>
          ))
        ) : payments.length === 0 ? (
          <div className="p-8 text-center bg-stone-900/30 rounded-xl border border-stone-700/30">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-700" />
            <p className="text-sm text-stone-500">결제 내역이 없습니다.</p>
          </div>
        ) : (
          <AnimatePresence>
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 hover:border-gold-500/30 transition-all duration-300 overflow-hidden group"
              >
                {/* Noise Overlay */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                {/* Payment Info */}
                <div className="relative space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-200 truncate text-sm">{payment.profiles?.full_name || "익명"}</p>
                      <p className="text-xs text-stone-500 truncate">{payment.profiles?.email}</p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-stone-700/30">
                    <div>
                      <p className="text-xs text-stone-500">결제 금액</p>
                      <p className="text-base font-bold text-stone-100 font-mono">₩{payment.amount.toLocaleString()}</p>
                    </div>
                    <Badge className="bg-gold-500/10 text-gold-400 border border-gold-500/20 text-xs">
                      +{payment.credits_purchased}장
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-stone-700/30">
                    <p className="text-[10px] text-stone-600 font-mono">{payment.order_id}</p>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      {new Date(payment.created_at).toLocaleString('ko-KR')}
                    </p>
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
