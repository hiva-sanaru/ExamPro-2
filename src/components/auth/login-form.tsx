
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { findUserByEmployeeId } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  employeeId: z.string().length(8, { message: "社員番号は8桁である必要があります。"}).regex(/^[0-9]+$/, { message: "社員番号は半角数字でなければなりません。"}),
  password: z.string().min(1, { message: "パスワードは必須です。" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeId: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
        const user = await findUserByEmployeeId(data.employeeId);

        if (!user || (user.password && user.password !== data.password)) {
            toast({
                title: "ログイン失敗",
                description: "社員番号またはパスワードが正しくありません。",
                variant: "destructive"
            });
            setIsLoading(false);
            return;
        }

        if (user.role === 'examinee') {
            toast({
                title: "ログインエラー",
                description: "このアカウントは管理者用ではありません。トップページから試験を開始してください。",
                variant: "destructive"
            });
            setIsLoading(false);
            return;
        }

        localStorage.setItem('loggedInUserEmployeeId', user.employeeId);

        if (user.role === 'system_administrator' || user.role === 'hq_administrator') {
            router.push("/admin/dashboard");
        } else {
            toast({
                title: "ログイン失敗",
                description: "このユーザーには役割が割り当てられていません。",
                variant: "destructive"
            });
        }

    } catch (error) {
        console.error("Login error:", error);
        toast({
            title: "ログインエラー",
            description: "ログイン中に予期せぬエラーが発生しました。",
            variant: "destructive"
        });
    } finally {
        setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">管理者サインイン</CardTitle>
        <CardDescription>管理者アカウントでアクセスするための情報を入力してください。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>社員番号</FormLabel>
                   <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="12345678" {...field} className="pl-10" />
                    </FormControl>
                  </div>
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
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "サインイン"}
                {!isLoading && <ArrowRight />}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
