import { useState, useEffect } from 'react';
import { File, FileText, Image, Download, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentListProps {
  applicationId: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  created_at: string | null;
}

export function DocumentList({ applicationId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('application_attachments')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [applicationId]);

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'ดาวน์โหลดล้มเหลว',
        description: 'ไม่สามารถดาวน์โหลดไฟล์ได้',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: 'ไม่สามารถแสดงตัวอย่างได้',
        description: 'เกิดข้อผิดพลาดในการเปิดไฟล์',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>ไม่มีเอกสารแนบ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">เอกสารแนบ ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            {getFileIcon(doc.file_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              {doc.created_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString('th-TH')}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePreview(doc)}
                title="แสดงตัวอย่าง"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                title="ดาวน์โหลด"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
