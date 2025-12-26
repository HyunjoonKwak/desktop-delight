import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { backupApi, formatFileSize, type BackupInfo } from '@/lib/tauri-api';
import {
  Archive,
  Download,
  Trash2,
  RefreshCw,
  FolderOpen,
  Clock,
  HardDrive,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react';

interface BackupManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupManager({ open, onOpenChange }: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupInfo | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null);
  const { toast } = useToast();

  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await backupApi.listBackups();
      setBackups(list);
    } catch (error) {
      toast({
        title: '백업 목록 로드 실패',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadBackups();
    }
  }, [open]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const result = await backupApi.backupDesktop();
      toast({
        title: '백업 완료',
        description: `${result.files_count}개 파일 (${formatFileSize(result.total_size)}) 백업됨`,
      });
      loadBackups();
    } catch (error) {
      toast({
        title: '백업 실패',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setRestoring(true);
    try {
      const count = await backupApi.restoreBackup(restoreTarget.path);
      toast({
        title: '복원 완료',
        description: `${count}개 파일이 복원되었습니다`,
      });
      setRestoreTarget(null);
    } catch (error) {
      toast({
        title: '복원 실패',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await backupApi.deleteBackup(deleteTarget.path);
      toast({
        title: '백업 삭제됨',
        description: deleteTarget.name,
      });
      setDeleteTarget(null);
      loadBackups();
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse from Desktop_backup_YYYYMMDD_HHMMSS format
    const match = dateStr.match(/Desktop_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [, year, month, day, hour, min] = match;
      return `${year}년 ${month}월 ${day}일 ${hour}:${min}`;
    }
    return dateStr;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              바탕화면 백업 관리
            </DialogTitle>
            <DialogDescription>
              바탕화면을 백업하여 정리 작업 전에 안전하게 보관하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Backup Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleBackup}
                disabled={backingUp}
                className="flex-1"
              >
                {backingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    백업 중...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    지금 백업하기
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={loadBackups}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  백업 위치: 문서/Desktop_Backups
                </p>
              </CardContent>
            </Card>

            {/* Backup List */}
            <div>
              <h4 className="text-sm font-medium mb-2">백업 목록</h4>
              <ScrollArea className="h-[300px] rounded-md border">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Archive className="h-12 w-12 mb-2 opacity-50" />
                    <p>백업이 없습니다</p>
                    <p className="text-xs">위 버튼을 눌러 첫 백업을 만드세요</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {backups.map((backup) => (
                      <Card key={backup.path} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {formatDate(backup.name)}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {backup.file_count}개 파일
                              </span>
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                {formatFileSize(backup.size)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {backup.created_at}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setRestoreTarget(backup)}
                              title="복원"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(backup)}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>백업을 복원하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget && (
                <>
                  <strong>{formatDate(restoreTarget.name)}</strong> 백업을 복원합니다.
                  <br />
                  <br />
                  기존 파일과 이름이 같은 경우 기존 파일은 자동으로 이름이 변경됩니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  복원 중...
                </>
              ) : (
                '복원'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>백업을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{formatDate(deleteTarget.name)}</strong> 백업이 영구 삭제됩니다.
                  <br />
                  이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
