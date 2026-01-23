"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSubscription, updateSubscriptionStatus, grantTalismans } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Gift, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface SubscriptionsTableProps {
    subscriptions: AdminSubscription[];
    currentPage: number;
    totalPages: number;
    total: number;
    statusFilter: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "bg-green-100", text: "text-green-700" },
    CANCELLED: { bg: "bg-amber-100", text: "text-amber-700" },
    EXPIRED: { bg: "bg-gray-100", text: "text-gray-600" },
    PAYMENT_FAILED: { bg: "bg-red-100", text: "text-red-700" },
    PAUSED: { bg: "bg-blue-100", text: "text-blue-700" },
    PENDING: { bg: "bg-gray-100", text: "text-gray-500" },
};

const statusLabels: Record<string, string> = {
    ACTIVE: "구독 중",
    CANCELLED: "해지 예정",
    EXPIRED: "만료됨",
    PAYMENT_FAILED: "결제 실패",
    PAUSED: "일시 중지",
    PENDING: "대기 중",
};

export function SubscriptionsTable({
    subscriptions,
    currentPage,
    totalPages,
    total,
    statusFilter,
}: SubscriptionsTableProps) {
    const router = useRouter();
    const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [grantAmount, setGrantAmount] = useState("10");
    const [grantReason, setGrantReason] = useState("");

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("ko-KR");
    };

    const handleStatusFilterChange = (value: string) => {
        router.push(`/admin/subscriptions?status=${value}&page=1`);
    };

    const handlePageChange = (page: number) => {
        router.push(`/admin/subscriptions?status=${statusFilter}&page=${page}`);
    };

    const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
        const result = await updateSubscriptionStatus(subscriptionId, newStatus);
        if (result.success) {
            toast.success("상태가 변경되었습니다.");
            router.refresh();
        } else {
            toast.error(result.error || "상태 변경에 실패했습니다.");
        }
    };

    const handleGrantTalismans = async () => {
        if (!selectedUserId) return;

        const amount = parseInt(grantAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("유효한 수량을 입력하세요.");
            return;
        }

        const result = await grantTalismans(selectedUserId, amount, grantReason || "관리자 수동 지급");
        if (result.success) {
            toast.success(`부적 ${amount}장이 지급되었습니다.`);
            setIsGrantDialogOpen(false);
            setSelectedUserId(null);
            setGrantAmount("10");
            setGrantReason("");
        } else {
            toast.error(result.error || "부적 지급에 실패했습니다.");
        }
    };

    const openGrantDialog = (userId: string) => {
        setSelectedUserId(userId);
        setIsGrantDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="상태 필터" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">전체</SelectItem>
                            <SelectItem value="ACTIVE">구독 중</SelectItem>
                            <SelectItem value="CANCELLED">해지 예정</SelectItem>
                            <SelectItem value="EXPIRED">만료됨</SelectItem>
                            <SelectItem value="PAYMENT_FAILED">결제 실패</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">
                        총 {total}명
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>사용자</TableHead>
                            <TableHead>플랜</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>구독 시작</TableHead>
                            <TableHead>다음 결제</TableHead>
                            <TableHead>가입일</TableHead>
                            <TableHead className="w-[80px]">작업</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    구독자가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            subscriptions.map((sub) => {
                                const statusStyle = statusColors[sub.status] || statusColors.PENDING;
                                return (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {sub.profile?.email || "Unknown"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {sub.user_id.slice(0, 8)}...
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">
                                                {sub.plan?.name || "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${statusStyle.bg} ${statusStyle.text} font-medium`}>
                                                {statusLabels[sub.status] || sub.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatDate(sub.current_period_start)}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {sub.status === "CANCELLED"
                                                ? `종료: ${formatDate(sub.current_period_end)}`
                                                : formatDate(sub.next_billing_date)
                                            }
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatDate(sub.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => openGrantDialog(sub.user_id)}
                                                    >
                                                        <Gift className="w-4 h-4 mr-2" />
                                                        부적 지급
                                                    </DropdownMenuItem>
                                                    {sub.status === "ACTIVE" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(sub.id, "PAUSED")}
                                                        >
                                                            일시 중지
                                                        </DropdownMenuItem>
                                                    )}
                                                    {sub.status === "PAUSED" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(sub.id, "ACTIVE")}
                                                        >
                                                            재활성화
                                                        </DropdownMenuItem>
                                                    )}
                                                    {sub.status !== "CANCELLED" && sub.status !== "EXPIRED" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(sub.id, "CANCELLED")}
                                                            className="text-red-600"
                                                        >
                                                            강제 해지
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                        {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Grant Talismans Dialog */}
            <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>부적 수동 지급</DialogTitle>
                        <DialogDescription>
                            선택한 사용자에게 부적을 지급합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">지급 수량</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="1"
                                max="100"
                                value={grantAmount}
                                onChange={(e) => setGrantAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">지급 사유 (선택)</Label>
                            <Input
                                id="reason"
                                value={grantReason}
                                onChange={(e) => setGrantReason(e.target.value)}
                                placeholder="예: 이벤트 당첨, 고객 보상 등"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
                            취소
                        </Button>
                        <Button onClick={handleGrantTalismans}>
                            지급하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
