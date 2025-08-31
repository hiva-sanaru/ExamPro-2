
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import type { User, Headquarters } from "@/lib/types";
import { cva } from "class-variance-authority";
import { AddUserForm } from "./add-user-form";
import { deleteUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface UserListProps {
  users: User[];
  onUserDeleted: (userId: string) => void;
  onUserUpdated: (user: User) => void;
  headquartersList: Headquarters[];
}

export function UserList({ users, onUserDeleted, onUserUpdated, headquartersList }: UserListProps) {
    const { toast } = useToast();
    const [openEditDialogs, setOpenEditDialogs] = React.useState<Record<string, boolean>>({});

    const handleDialogChange = (userId: string, open: boolean) => {
        setOpenEditDialogs(prev => ({ ...prev, [userId]: open }));
    };
    
    const handleDelete = async (user: User) => {
      try {
        await deleteUser(user.id);
        onUserDeleted(user.id);
        toast({
          title: "ユーザーが削除されました",
          description: `「${user.name}」は正常に削除されました。`
        });
      } catch (error) {
        toast({
          title: "削除中にエラーが発生しました",
          description: (error as Error).message,
          variant: "destructive"
        })
      }
    }

    const badgeVariants = cva(
        "capitalize",
        {
          variants: {
            role: {
              system_administrator: "bg-red-100 text-red-800 border-red-200",
              hq_administrator: "bg-blue-100 text-blue-800 border-blue-200",
              examinee: "bg-gray-100 text-gray-800 border-gray-200",
            },
          },
        }
    )

    const getRoleName = (role: User['role']) => {
        switch(role) {
            case 'system_administrator': return 'システム管理者';
            case 'hq_administrator': return '本部管理者';
            case 'examinee': return '受験者';
        }
    }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <TableHead className="text-primary-foreground">名前</TableHead>
            <TableHead className="text-primary-foreground">社員番号</TableHead>
            <TableHead className="text-primary-foreground text-center">役割</TableHead>
            <TableHead className="text-primary-foreground text-center">本部</TableHead>
            <TableHead className="text-right text-primary-foreground">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.name}
              </TableCell>
              <TableCell className="font-mono">{user.employeeId}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className={badgeVariants({ role: user.role })}>
                  {getRoleName(user.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{user.headquarters || '－'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center gap-2">
                    <Dialog open={openEditDialogs[user.id] || false} onOpenChange={(open) => handleDialogChange(user.id, open)}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">編集</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>ユーザーを編集</DialogTitle>
                                <DialogDescription>
                                    ユーザーの詳細を更新します。
                                </DialogDescription>
                            </DialogHeader>
                            <AddUserForm 
                              user={user} 
                              onFinished={(updatedUser) => {
                                  onUserUpdated(updatedUser);
                                  handleDialogChange(user.id, false);
                              }}
                              headquartersList={headquartersList}
                              onClose={() => handleDialogChange(user.id, false)}
                            />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">削除</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                    この操作は元に戻すことはできません。ユーザー「{user.name}」と関連するすべてのデータが完全に削除されます。
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user)} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
