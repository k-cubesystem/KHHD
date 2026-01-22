"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
}

interface Props {
  initialPayments: Payment[];
}

export function PaymentManagementClient({ initialPayments }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredPayments = useMemo(() => {
    return initialPayments.filter((payment) => {
      // Status filter
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      // Search filter (order_id or user name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrderId = payment.order_id.toLowerCase().includes(query);
        const matchesName = payment.profiles?.full_name?.toLowerCase().includes(query);
        if (!matchesOrderId && !matchesName) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom) {
        const paymentDate = new Date(payment.created_at);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) {
          return false;
        }
      }

      if (dateTo) {
        const paymentDate = new Date(payment.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [initialPayments, statusFilter, searchQuery, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = statusFilter !== "all" || searchQuery || dateFrom || dateTo;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "완료", className: "bg-green-400/20 text-green-400" };
      case "pending":
        return { label: "대기", className: "bg-yellow-400/20 text-yellow-400" };
      default:
        return { label: "실패", className: "bg-red-400/20 text-red-400" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">검색</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="주문 ID 또는 회원명..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">상태</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">시작일</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        {/* Date To */}
        <div className="w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">종료일</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 text-muted-foreground hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            초기화
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="w-3 h-3" />
        {hasFilters ? (
          <span>
            필터 적용됨: {filteredPayments.length}건 / 전체 {initialPayments.length}건
          </span>
        ) : (
          <span>전체 {initialPayments.length}건</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                주문 ID
              </th>
              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                회원
              </th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">
                금액
              </th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                상태
              </th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">
                일시
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  {hasFilters ? "필터 조건에 맞는 결제 내역이 없습니다." : "결제 내역이 없습니다."}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const badge = getStatusBadge(payment.status);
                return (
                  <tr
                    key={payment.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {payment.order_id}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium">
                          {payment.profiles?.full_name || "익명"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {payment.profiles?.id}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold">
                        {payment.amount?.toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleString("ko-KR")}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
