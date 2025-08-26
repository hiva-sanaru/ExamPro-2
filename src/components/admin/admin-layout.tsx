
"use client"
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileCheck2, Users, LogOut, Building, KeyRound, Loader2, BookOpen } from "lucide-react";
import { findUserByEmployeeId } from "@/services/userService";
import type { User } from "@/lib/types";


export function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const employeeId = localStorage.getItem('loggedInUserEmployeeId');
        if (employeeId) {
            findUserByEmployeeId(employeeId)
                .then(user => {
                    setCurrentUser(user);
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const allMenuItems = [
        { href: "/admin/dashboard", label: "試験管理", icon: LayoutDashboard, roles: ['system_administrator'] },
        { href: "/admin/review", label: "提出物", icon: FileCheck2, roles: ['system_administrator', 'hq_administrator'] },
        { href: "/admin/users", label: "ユーザー", icon: Users, roles: ['system_administrator'] },
        { href: "/admin/headquarters", label: "本部管理", icon: Building, roles: ['system_administrator'] },
        { href: "/admin/change-password", label: "パスワード変更", icon: KeyRound, roles: ['system_administrator', 'hq_administrator'] },
        { href: "/admin/manual", label: "マニュアル", icon: BookOpen, roles: ['system_administrator', 'hq_administrator'] },
    ];

    const visibleMenuItems = currentUser 
        ? allMenuItems.filter(item => item.roles.includes(currentUser.role))
        : [];

    return (
        <SidebarProvider>
            <Sidebar variant="sidebar" collapsible="icon">
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <span className="font-headline text-lg font-semibold text-primary-foreground">SANARU</span>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {visibleMenuItems.map((item) => (
                             <SidebarMenuItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <Separator className="my-2 bg-sidebar-border" />
                    <div className="flex flex-col gap-2 p-2">
                         <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:w-8">
                            <div className="flex flex-col truncate">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-10">
                                        <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground" />
                                    </div>
                                ) : currentUser ? (
                                    <>
                                        <span className="text-sm font-semibold text-sidebar-foreground">{currentUser.name}</span>
                                        <span className="text-xs text-sidebar-foreground/70">{currentUser.employeeId}</span>
                                    </>
                                ) : (
                                    <span className="text-sm font-semibold text-sidebar-foreground">ゲストユーザー</span>
                                )}
                            </div>
                        </div>
                        <Link href="/login">
                            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center">
                                <LogOut className="size-4 shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden">ログアウト</span>
                            </Button>
                        </Link>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <SidebarTrigger className="md:hidden absolute top-4 right-4" />
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
