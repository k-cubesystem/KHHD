'use client'

import { useState, useEffect } from 'react'
import { AdminUser, getUsers, updateUserRole, deleteUser } from './actions'
import { UserRole } from '@/types/auth'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Trash2,
  Users,
  RefreshCw,
  Save,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function UserManagementClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const limit = 10

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, total } = await getUsers(page, limit, searchTerm)
      setUsers(data)
      setTotal(total)
    } catch (error) {
      toast.error('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (
      !confirm(
        '정말 이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터(결제, 사주기록 등)가 삭제됩니다.'
      )
    ) {
      return
    }

    const toastId = toast.loading('사용자 삭제 중...')
    try {
      const result = await deleteUser(userId)
      if (result.success) {
        toast.success('사용자가 삭제되었습니다.', { id: toastId })
        fetchUsers() // Refresh list
      } else {
        toast.error('삭제 실패: ' + result.error, { id: toastId })
      }
    } catch (e) {
      toast.error('삭제 중 오류가 발생했습니다.', { id: toastId })
    }
  }

  // Role 선택만 (저장 X) — pendingRoles에 임시 저장
  const handleRoleSelect = (userId: string, newRole: UserRole) => {
    const currentUser = users.find((u) => u.id === userId)
    if (currentUser?.role === newRole) {
      // 원래 값으로 되돌리면 pending 제거
      setPendingRoles((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } else {
      setPendingRoles((prev) => ({ ...prev, [userId]: newRole }))
    }
  }

  // 저장 버튼 클릭 시 실제 저장
  const handleRoleSave = async (userId: string) => {
    const newRole = pendingRoles[userId]
    if (!newRole) return

    setSavingId(userId)
    const result = await updateUserRole(userId, newRole)
    setSavingId(null)

    if (result.success) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      setPendingRoles((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      toast.success('권한이 저장되었습니다.')
    } else {
      toast.error('권한 변경 실패: ' + result.error)
    }
  }

  const totalPages = Math.ceil(total / limit)

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

        {/* Refresh + Pagination */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            disabled={loading}
            title="새로고침"
            className="h-9 w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-9 w-9 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block rounded-xl border border-stone-800 bg-stone-950/50 overflow-hidden shadow-sm backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-stone-900/80 border-b border-stone-800">
            <TableRow className="border-stone-800 hover:bg-stone-900/50">
              <TableHead className="text-stone-400 font-serif font-medium">사용자</TableHead>
              <TableHead className="text-stone-400 font-serif font-medium">이메일</TableHead>
              <TableHead className="text-stone-400 font-serif font-medium">가입일</TableHead>
              <TableHead className="text-stone-400 font-serif font-medium">권한(Role)</TableHead>
              <TableHead className="text-right text-stone-400 font-serif font-medium">
                관리
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-stone-800/50">
                  <TableCell>
                    <div className="h-4 w-24 bg-stone-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-stone-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-stone-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-24 bg-stone-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-8 bg-stone-800 rounded-full animate-pulse ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow className="border-stone-800">
                <TableCell colSpan={5} className="h-40 text-center text-stone-500">
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
                    className="border-stone-800/50 hover:bg-stone-900/40 transition-colors group"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-bold text-stone-300">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <span className="text-stone-200">{user.full_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-stone-400 font-sans text-sm">
                      {user.email || '-'}
                    </TableCell>
                    <TableCell className="text-stone-500 text-xs font-sans font-mono animate-in fade-in">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={pendingRoles[user.id] ?? user.role}
                        onValueChange={(val) => handleRoleSelect(user.id, val as UserRole)}
                      >
                        <SelectTrigger
                          className={cn(
                            'w-[110px] h-8 border-none font-medium text-xs rounded-md shadow-sm transition-all',
                            pendingRoles[user.id]
                              ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                              : user.role === 'admin'
                                ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20'
                                : user.role === 'tester'
                                  ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20 hover:bg-yellow-500/20'
                                  : 'bg-stone-800 text-stone-400 ring-1 ring-stone-700 hover:bg-stone-700 hover:text-stone-300'
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-stone-950 border-stone-800">
                          <SelectItem
                            value="user"
                            className="text-stone-300 hover:bg-stone-900 focus:bg-stone-900 focus:text-stone-200"
                          >
                            USER
                          </SelectItem>
                          <SelectItem
                            value="tester"
                            className="text-yellow-400 hover:bg-stone-900 focus:bg-stone-900"
                          >
                            TESTER
                          </SelectItem>
                          <SelectItem
                            value="admin"
                            className="text-red-400 font-bold hover:bg-stone-900 focus:bg-stone-900"
                          >
                            ADMIN
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pendingRoles[user.id] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-400 hover:text-green-400 hover:bg-green-500/10 rounded-full transition-colors"
                            onClick={() => handleRoleSave(user.id)}
                            disabled={savingId === user.id}
                            title="권한 저장"
                          >
                            {savingId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Link href={`/admin/users/${user.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-stone-500 hover:text-gold-400 hover:bg-stone-800 rounded-full transition-colors"
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
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
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-200 truncate text-sm">
                      {user.full_name || '-'}
                    </p>
                    <p className="text-xs text-stone-500 truncate">{user.email || '-'}</p>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="relative flex items-center justify-between gap-2 pt-3 border-t border-stone-700/30">
                  <Select
                    value={pendingRoles[user.id] ?? user.role}
                    onValueChange={(val) => handleRoleSelect(user.id, val as UserRole)}
                  >
                    <SelectTrigger
                      className={cn(
                        'h-7 md:h-8 border font-medium text-xs flex-1 max-w-[110px]',
                        pendingRoles[user.id]
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : user.role === 'admin'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : user.role === 'tester'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : 'bg-stone-700/30 text-stone-400 border-stone-600/30'
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-700">
                      <SelectItem value="user" className="text-stone-300 hover:bg-stone-800">
                        USER
                      </SelectItem>
                      <SelectItem value="tester" className="text-yellow-400 hover:bg-stone-800">
                        TESTER
                      </SelectItem>
                      <SelectItem
                        value="admin"
                        className="text-red-400 font-bold hover:bg-stone-800"
                      >
                        ADMIN
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    {pendingRoles[user.id] && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-400 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => handleRoleSave(user.id)}
                        disabled={savingId === user.id}
                        title="권한 저장"
                      >
                        {savingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    <Link href={`/admin/users/${user.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-stone-500 hover:text-gold-400 hover:bg-stone-800/50"
                      >
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
  )
}
