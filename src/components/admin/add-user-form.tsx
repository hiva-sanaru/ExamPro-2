
"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { User, Headquarters } from "@/lib/types";
import { addUser, updateUser } from "@/services/userService";

const userSchema = (isEditing: boolean) => z.object({
    name: z.string().min(1, { message: "名前は必須です。" }),
    employeeId: z.string().length(8, { message: "社員番号は8桁である必要があります。"}).regex(/^[0-9]+$/, { message: "社員番号は半角数字でなければなりません。"}),
    password: isEditing 
        ? z.string().min(8, { message: "パスワードは8文字以上である必要があります。" }).optional().or(z.literal(''))
        : z.string().min(8, { message: "パスワードは8文字以上である必要があります。" }),
    role: z.enum(["system_administrator", "hq_administrator"], {
        required_error: "役割を選択する必要があります。",
    }),
    headquarters: z.string().optional(),
}).refine(data => {
    if ((data.role === 'hq_administrator') && !data.headquarters) {
        return false;
    }
    return true;
}, {
    message: "本部管理者の場合は本部を選択してください。",
    path: ["headquarters"],
});


interface AddUserFormProps {
    user?: User; 
    onFinished: (user: User) => void;
    headquartersList: Headquarters[];
    onClose?: () => void;
}


export function AddUserForm({ user, onFinished, headquartersList, onClose }: AddUserFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!user;
  
  type UserFormValues = z.infer<ReturnType<typeof userSchema>>;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(isEditing)),
    defaultValues: {
      name: user?.name || "",
      employeeId: user?.employeeId || "",
      password: "",
      role: user?.role === 'examinee' ? 'hq_administrator' : user?.role || "hq_administrator",
      headquarters: user?.headquarters || "",
    },
  });
  
  const role = form.watch("role");

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true);
    try {
        let userData: Partial<User> = {
            name: data.name,
            employeeId: data.employeeId,
            role: data.role,
            headquarters: (data.role === 'hq_administrator') ? data.headquarters : '',
            avatarUrl: `https://placehold.co/40x40.png?text=${data.name.substring(0,2).toUpperCase()}`
        };

        if (data.password) {
            userData.password = data.password;
        }

        if (isEditing && user) {
            await updateUser(user.id, userData);
            toast({
                title: "ユーザーが正常に更新されました！",
                description: `名前: ${data.name}, 社員番号: ${data.employeeId}`,
            });
            onFinished({ ...user, ...userData });
        } else {
            // Ensure password is set for new user. The schema should enforce this.
            if (!userData.password) {
                throw new Error("Password is required for new users.");
            }
            const newUserId = await addUser(userData as Omit<User, 'id'>);
            const newUser = { id: newUserId, ...userData } as User;
            toast({
                title: "ユーザーが正常に追加されました！",
                description: `名前: ${data.name}, 社員番号: ${data.employeeId}`,
            });
            onFinished(newUser);
        }
        onClose?.();
    } catch(error) {
        toast({
            title: isEditing ? "更新中にエラーが発生しました" : "作成中にエラーが発生しました",
            description: (error as Error).message,
            variant: "destructive"
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input placeholder="田中 太郎" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>社員番号</FormLabel>
              <FormControl>
                <Input placeholder="12345678" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <FormControl>
                <Input type="password" placeholder={isEditing ? "変更する場合のみ入力" : "••••••••"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>役割</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="役割を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hq_administrator">本部管理者</SelectItem>
                  <SelectItem value="system_administrator">システム管理者</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {(role === 'hq_administrator') && (
            <FormField
            control={form.control}
            name="headquarters"
            render={({ field }) => (
                <FormItem>
                <FormLabel>本部</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="本部を選択" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {headquartersList.map(hq => (
                            <SelectItem key={hq.code} value={hq.name}>{hq.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? (isEditing ? "更新中..." : "作成中...") : (isEditing ? "変更を保存" : "ユーザーを作成")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
