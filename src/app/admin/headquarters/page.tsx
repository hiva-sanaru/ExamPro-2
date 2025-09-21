
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Loader2, Building, PlusCircle, Edit } from 'lucide-react';
import Papa from 'papaparse';
import { getHeadquarters, addHeadquarters, deleteHeadquarters, updateHeadquarters } from '@/services/headquartersService';
import type { Headquarters as HeadquartersType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AddHeadquartersForm } from '@/components/admin/add-headquarters-form';


interface Headquarters extends HeadquartersType {
  // code and name are in HeadquartersType
}

export default function HeadquartersPage() {
  const { toast } = useToast();
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddHqOpen, setAddHqOpen] = useState(false);
  const [editingHq, setEditingHq] = useState<Headquarters | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHeadquarters = useCallback(async () => {
    setIsLoading(true);
    try {
      const hqs = await getHeadquarters();
      setHeadquarters(hqs);
    } catch (error) {
      console.error("Failed to load headquarters from Firestore", error);
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
    fetchHeadquarters();
  }, [fetchHeadquarters]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse<{code: string, name: string}>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data.filter(item => item.code && item.name);
        
        const newHqs = parsedData.filter(newItem => 
            !headquarters.some(hq => hq.code === newItem.code)
        );

        if (newHqs.length > 0) {
          try {
            await Promise.all(newHqs.map(hq => addHeadquarters(hq)));
            toast({
              title: 'CSVが正常にインポートされました',
              description: `${newHqs.length}件の本部が新しく追加されました。`,
            });
            fetchHeadquarters(); // Refresh list from firestore
          } catch(error) {
            toast({
              title: 'データベースへの保存中にエラーが発生しました',
              description: (error as Error).message,
              variant: 'destructive',
            });
          }
        } else {
             toast({
                title: 'インポートする新しいデータがありません',
                description: 'CSV内のすべての本部は既に存在します。',
            });
        }
        setIsUploading(false);
      },
      error: (error) => {
        toast({
          title: 'CSVの解析中にエラーが発生しました',
          description: error.message,
          variant: 'destructive',
        });
        setIsUploading(false);
      },
    });

    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveHeadquarters = async (code: string) => {
    try {
        await deleteHeadquarters(code);
        setHeadquarters(prev => prev.filter(hq => hq.code !== code));
        toast({
            title: '本部が削除されました',
        });
    } catch(error) {
        toast({
            title: '削除中にエラーが発生しました',
            description: (error as Error).message,
            variant: 'destructive',
        });
    }
  }

  const handleHeadquartersAdded = (newHq: Headquarters) => {
    setHeadquarters(prev => [...prev, newHq].sort((a, b) => a.code.localeCompare(b.code)));
  };
  
  const handleHeadquartersUpdated = (updatedHq: Headquarters) => {
    setHeadquarters(prev => prev.map(hq => hq.code === updatedHq.code ? updatedHq : hq));
    setEditingHq(null);
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">本部管理</h1>
        <p className="text-muted-foreground">CSVファイルをインポートするか、新規追加ボタンから本部情報を登録・管理します。</p>
      </div>

       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録済みの本部総数</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${headquarters.length}件`}
            </div>
            <p className="text-xs text-muted-foreground">
                現在データベースに登録されている本部の数
            </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline text-xl">本部リスト</CardTitle>
                <CardDescription>
                    CSVファイルには 'code' と 'name' のヘッダーを含めてください。
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".csv"
                />
                <Button onClick={handleImportClick} disabled={isUploading} variant="outline">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'インポート中...' : 'CSVをインポート'}
                </Button>
                 <Dialog open={isAddHqOpen} onOpenChange={setAddHqOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新規追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新しい本部を追加</DialogTitle>
                            <DialogDescription>
                                新しい本部のコードと名前を入力してください。
                            </DialogDescription>
                        </DialogHeader>
                        <AddHeadquartersForm
                            onFinished={handleHeadquartersAdded}
                            onClose={() => setAddHqOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90">
                        <TableHead className="text-primary-foreground">本部コード</TableHead>
                        <TableHead className="text-primary-foreground">本部名</TableHead>
                        <TableHead className="text-right text-primary-foreground">アクション</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                               <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                            </TableCell>
                        </TableRow>
                    ) : headquarters.length > 0 ? (
                        headquarters.map((hq) => (
                            <TableRow key={hq.code}>
                                <TableCell className="font-medium">{hq.code}</TableCell>
                                <TableCell>{hq.name}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Dialog open={editingHq?.code === hq.code} onOpenChange={(isOpen) => !isOpen && setEditingHq(null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon" onClick={() => setEditingHq(hq)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>本部を編集</DialogTitle>
                                                    <DialogDescription>
                                                        「{editingHq?.name}」の情報を更新します。
                                                    </DialogDescription>
                                                </DialogHeader>
                                                {editingHq && (
                                                    <AddHeadquartersForm
                                                        isEditing={true}
                                                        headquarters={editingHq}
                                                        onFinished={handleHeadquartersUpdated}
                                                        onClose={() => setEditingHq(null)}
                                                    />
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveHeadquarters(hq.code)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            <span className="sr-only">削除</span>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                データがありません。CSVをインポートするか、新規追加してください。
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
