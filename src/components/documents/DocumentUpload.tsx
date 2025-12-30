import { useState, useCallback } from 'react';
import { Upload, File, X, Loader2, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  applicationId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  existingFiles?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
}

const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({
  applicationId,
  onUploadComplete,
  maxFiles = 5,
  existingFiles = [],
}: DocumentUploadProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const getUserId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    return data?.id;
  };

  const uploadFile = async (file: File) => {
    const userId = await getUserId();
    if (!userId) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดเอกสาร',
        variant: 'destructive',
      });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${applicationId || 'temp'}/${fileName}`;

    const { error } = await supabase.storage
      .from('application-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    return {
      id: crypto.randomUUID(),
      name: file.name,
      path: filePath,
      type: file.type,
      size: file.size,
    };
  };

  const handleFiles = async (fileList: FileList) => {
    const newFiles = Array.from(fileList);

    // Validate
    if (files.length + newFiles.length > maxFiles) {
      toast({
        title: 'เกินจำนวนที่กำหนด',
        description: `อัปโหลดได้สูงสุด ${maxFiles} ไฟล์`,
        variant: 'destructive',
      });
      return;
    }

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'ไฟล์ไม่รองรับ',
          description: `${file.name} - รองรับเฉพาะ PDF, รูปภาพ และ Word`,
          variant: 'destructive',
        });
        return;
      }

      if (file.size > maxFileSize) {
        toast({
          title: 'ไฟล์ใหญ่เกินไป',
          description: `${file.name} - ขนาดสูงสุด 10MB`,
          variant: 'destructive',
        });
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: UploadedFile[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const uploaded = await uploadFile(newFiles[i]);
        if (uploaded) {
          uploadedFiles.push(uploaded);
        }
        setUploadProgress(((i + 1) / newFiles.length) * 100);
      }

      const allFiles = [...files, ...uploadedFiles];
      setFiles(allFiles);
      onUploadComplete?.(allFiles);

      toast({
        title: 'อัปโหลดสำเร็จ',
        description: `อัปโหลด ${uploadedFiles.length} ไฟล์เรียบร้อย`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'อัปโหลดล้มเหลว',
        description: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = async (fileToRemove: UploadedFile) => {
    try {
      const { error } = await supabase.storage
        .from('application-documents')
        .remove([fileToRemove.path]);

      if (error) throw error;

      const newFiles = files.filter((f) => f.id !== fileToRemove.id);
      setFiles(newFiles);
      onUploadComplete?.(newFiles);

      toast({
        title: 'ลบไฟล์สำเร็จ',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'ลบไฟล์ล้มเหลว',
        variant: 'destructive',
      });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          dragActive && 'border-primary bg-primary/5',
          uploading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
                <Progress value={uploadProgress} className="w-full max-w-xs mb-2" />
                <p className="text-sm text-muted-foreground">
                  กำลังอัปโหลด... {Math.round(uploadProgress)}%
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  รองรับ PDF, รูปภาพ (JPG, PNG, GIF) และ Word (สูงสุด {maxFiles} ไฟล์,
                  ไม่เกิน 10MB ต่อไฟล์)
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept={allowedTypes.join(',')}
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    เลือกไฟล์
                  </label>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            ไฟล์ที่อัปโหลด ({files.length}/{maxFiles})
          </p>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeFile(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
