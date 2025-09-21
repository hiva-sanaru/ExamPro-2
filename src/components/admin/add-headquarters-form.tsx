
"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Headquarters } from "@/lib/types";
import { addHeadquarters } from "@/services/headquartersService";

const headquartersSchema = z.object({
  code: z.string().min(1, { message: "本部コードは必須です。" }),
  name: z.string().min(1, { message: "本部名は必須です。" }),
});

type HeadquartersFormValues = z.infer<typeof headquartersSchema>;

interface AddHeadquartersFormProps {
    onFinished: (hq: Headquarters) => void;
    onClose?: () => void;
}

export function AddHeadquartersForm({ onFinished, onClose }: AddHeadquartersFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<HeadquartersFormValues>({
    resolver: zodResolver(headquartersSchema),
    defaultValues: {
      code: "",
      name: "",
    },
  });

  const onSubmit = async (data: HeadquartersFormValues) => {
    setIsLoading(true);
    try {
        await addHeadquarters(data);
        toast({
            title: "本部が正常に追加されました！",
            description: `コード: ${data.code}, 名前: ${data.name}`,
        });
        onFinished(data);
        onClose?.();
    } catch(error) {
        toast({
            title: "作成中にエラーが発生しました",
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>本部コード</FormLabel>
              <FormControl>
                <Input placeholder="例: hamamatsu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>本部名</FormLabel>
              <FormControl>
                <Input placeholder="例: 浜松本部" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "作成中..." : "本部を作成"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
