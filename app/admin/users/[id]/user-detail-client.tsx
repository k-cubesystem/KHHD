"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/auth";
import { updateUserRole, deleteUser } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Calendar, CreditCard, Users, FileText, ExternalLink } from "lucide-react";
import Link from "next/link"; // Changed from 'next/link' to match usage if needed, but standard import is fine

interface UserDetailClientProps {
    user: any;
    sajuRecords: any[];
    familyMembers: any[];
    payments: any[];
}

export function UserDetailClient({ user, sajuRecords, familyMembers, payments }: UserDetailClientProps) {
    const router = useRouter();
    const [role, setRole] = useState<UserRole>(user.role as UserRole);

    const handleRoleChange = async (newRole: UserRole) => {
        setRole(newRole);
        toast.promise(updateUserRole(user.id, newRole), {
            loading: "권한 변경 중...",
            success: "권한이 변경되었습니다.",
            error: "권한 변경 실패"
        });
    };

    const handleDelete = async () => {
        if (!confirm("⚠️ 경고: 정말로 이 사용자를 영구 삭제하시겠습니까?\n모든 데이터가 사라지며 복구할 수 없습니다.")) return;

        const toastId = toast.loading("사용자 삭제 처리 중...");
        const result = await deleteUser(user.id);

        if (result.success) {
            toast.success("사용자가 삭제되었습니다.", { id: toastId });
            router.push("/admin/users");
        } else {
            toast.error("삭제 실패: " + result.error, { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {user.full_name || "이름 없음"}
                            <div className="text-sm">
                                {role === 'admin' && <Badge variant="destructive">ADMIN</Badge>}
                                {role === 'tester' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">TESTER</Badge>}
                                {role === 'user' && <Badge variant="outline">USER</Badge>}
                            </div>
                        </h1>
                        <p className="text-muted-foreground font-mono text-sm">{user.email}</p>
                    </div>
                </div>

                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                    <Trash2 className="w-4 h-4" /> 사용자 삭제
                </Button>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                    <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3">
                        기본 정보
                    </TabsTrigger>
                    <TabsTrigger value="saju" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3">
                        사주 비록 ({sajuRecords.length})
                    </TabsTrigger>
                    <TabsTrigger value="family" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3">
                        가족 관계 ({familyMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3">
                        결제 내역 ({payments.length})
                    </TabsTrigger>
                </TabsList>

                {/* 1. Profile Tab */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>계정 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>사용자 ID (UUID)</Label>
                                    <Input value={user.id} readOnly className="font-mono bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>이메일</Label>
                                    <Input value={user.email || ""} readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>이름</Label>
                                    <Input value={user.full_name || ""} readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>가입일 / 수정일</Label>
                                    <Input value={new Date(user.updated_at || user.created_at).toLocaleString()} readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-primary font-bold">권한 (Role)</Label>
                                    <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">USER (일반)</SelectItem>
                                            <SelectItem value="tester">TESTER (테스터)</SelectItem>
                                            <SelectItem value="admin">ADMIN (관리자)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        * 관리자 권한 부여 시 모든 데이터에 접근 가능합니다. 주의하세요.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. Saju Records Tab */}
                <TabsContent value="saju" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>저장된 사주 풀이</CardTitle>
                            <CardDescription>사용자가 저장한 사주 분석 기록입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sajuRecords.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">저장된 기록이 없습니다.</div>
                            ) : (
                                <div className="space-y-4">
                                    {sajuRecords.map((record) => (
                                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full text-primary">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{record.name}님 사주</p>
                                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                                        {record.birth_year}.{record.birth_month}.{record.birth_day} {record.birth_hour}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">{record.ganji_year}년 {record.ganji_month}월 {record.ganji_day}일 {record.ganji_hour}시</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-muted-foreground block">
                                                    {new Date(record.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Family Tab */}
                <TabsContent value="family" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>가족 관계</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {familyMembers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">등록된 가족이 없습니다.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {familyMembers.map((member) => (
                                        <div key={member.id} className="p-4 border rounded-lg flex items-center gap-3">
                                            <div className="bg-secondary p-3 rounded-full">
                                                <Users className="w-5 h-5 text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-bold">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.relationship}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {member.birth_year}.{member.birth_month}.{member.birth_day}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. Payments Tab */}
                <TabsContent value="payments" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>결제 내역</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {payments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">결제 내역이 없습니다.</div>
                            ) : (
                                <div className="space-y-2">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="flex justify-between items-center p-3 border-b last:border-0">
                                            <div>
                                                <p className="font-bold">{payment.amount.toLocaleString()}원</p>
                                                <p className="text-xs text-muted-foreground font-mono">{payment.order_id}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                                    {payment.status}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(payment.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
