
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { AddUserForm } from "@/components/admin/add-user-form";
import { UserList } from "@/components/admin/user-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getUsers, getHeadquarters } from "@/services"; // Assuming barrel file for services
import type { User, UserRole, Headquarters } from "@/lib/types";
import { PlusCircle, Search, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [headquartersList, setHeadquartersList] = useState<Headquarters[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [hqFilter, setHqFilter] = useState("all");
    const [isAddUserOpen, setAddUserOpen] = useState(false);

    const fetchUsersAndHqs = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedHqs] = await Promise.all([
                getUsers(),
                getHeadquarters()
            ]);
            setUsers(fetchedUsers);
            setHeadquartersList(fetchedHqs);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast({
                title: 'データの読み込みに失敗しました',
                description: 'データベースへの接続に問題がある可能性があります。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsersAndHqs();
    }, [fetchUsersAndHqs]);
    
    const filteredUsers = useMemo(() => users.filter((user: User) => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(lowercasedSearchTerm);
        const employeeIdMatch = user.employeeId.includes(lowercasedSearchTerm);
        const roleMatch = roleFilter === 'all' || user.role === roleFilter;
        const hqMatch = hqFilter === 'all' || user.headquarters === hqFilter;
        return (nameMatch || employeeIdMatch) && roleMatch && hqMatch;
    }), [users, searchTerm, roleFilter, hqFilter]);

    const handleUserAdded = (newUser: User) => {
        setUsers(prev => [...prev, newUser]);
    };

    const handleUserUpdated = (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    };

    const handleUserDeleted = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">ユーザー管理</h1>
                <p className="text-muted-foreground">システム内のすべてのユーザーを管理します。</p>
            </div>
             <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div>
                                <CardTitle className="font-headline text-xl">ユーザーリスト</CardTitle>
                                {!isLoading && <CardDescription>{filteredUsers.length}人のユーザーが見つかりました。</CardDescription>}
                            </div>
                            <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full sm:w-auto mt-2 sm:mt-0 bg-chart-1 hover:bg-chart-1/90">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        ユーザーを追加
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>新規ユーザーを追加</DialogTitle>
                                        <DialogDescription>
                                            新しいユーザーの詳細を入力してください。
                                        </DialogDescription>
                                    </DialogHeader>
                                    <AddUserForm 
                                        onFinished={handleUserAdded} 
                                        headquartersList={headquartersList}
                                        onClose={() => setAddUserOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="名前または社員番号で検索..." 
                                    className="pl-10 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="役割で絞り込み" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべての役割</SelectItem>
                                    <SelectItem value="system_administrator">システム管理者</SelectItem>
                                    <SelectItem value="hq_administrator">本部管理者</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={hqFilter} onValueChange={setHqFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="本部で絞り込み" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべての本部</SelectItem>
                                    {headquartersList.map(hq => (
                                        <SelectItem key={hq.code} value={hq.name}>{hq.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <UserList users={filteredUsers} onUserDeleted={handleUserDeleted} onUserUpdated={handleUserUpdated} headquartersList={headquartersList} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
