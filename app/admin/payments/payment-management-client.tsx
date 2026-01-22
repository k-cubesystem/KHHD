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
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">성공</Badge>;
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">실패</Badge>;
      case 'test_charge': return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">테스트</Badge>;
      default: return <Badge variant="outline" className="text-white/50">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">상태 필터:</span>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="all">모든 결제</SelectItem>
              <SelectItem value="completed">결제 성공</SelectItem>
              <SelectItem value="test_charge">테스트 충전</SelectItem>
              <SelectItem value="failed">실패/취소</SelectItem>
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
              <TableHead className="text-white/50">주문 ID</TableHead>
              <TableHead className="text-white/50">사용자</TableHead>
              <TableHead className="text-white/50">금액</TableHead>
              <TableHead className="text-white/50">크레딧</TableHead>
              <TableHead className="text-white/50">상태</TableHead>
              <TableHead className="text-white/50">일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  <TableCell><div className="h-4 w-32 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-10 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 w-16 bg-white/10 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-white/10 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={6} className="h-40 text-center text-white/40">
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
                    className="border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-white/60">{payment.order_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-white/90">{payment.profiles?.full_name || "Unknown"}</span>
                        <span className="text-xs text-white/40">{payment.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">
                      ₩{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white/80">
                        +{payment.credits_purchased}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-xs text-white/50">
                      {new Date(payment.created_at).toLocaleString()}
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
