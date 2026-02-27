import { useState, useRef } from 'react';
import { uploadApi } from '../services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  File,
  Loader2,
  Download,
  Trash2
} from 'lucide-react';

const FileUploader = ({ itemType, itemId, attachments = [], onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    for (const file of files) {
      try {
        await uploadApi.upload(itemType, itemId, file);
        toast.success(`"${file.name}" uploadé`);
      } catch (error) {
        toast.error(`Erreur avec "${file.name}"`);
      }
    }
    
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (attachment) => {
    if (!window.confirm(`Supprimer "${attachment.original_name}" ?`)) return;
    
    setDeleting(attachment.id);
    try {
      await uploadApi.delete(itemType, itemId, attachment.id);
      toast.success('Fichier supprimé');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return FileImage;
    if (mimeType?.includes('pdf') || mimeType?.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileUrl = (filename) => {
    return `${process.env.REACT_APP_BACKEND_URL}/uploads/${filename}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Fichiers ({attachments.length})
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !itemId}
          data-testid="upload-file-btn"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Ajouter
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
      </div>

      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mime_type);
            const isImage = attachment.mime_type?.startsWith('image/');
            
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 group"
              >
                {isImage ? (
                  <img
                    src={getFileUrl(attachment.filename)}
                    alt={attachment.original_name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.original_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(getFileUrl(attachment.filename), '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(attachment)}
                    disabled={deleting === attachment.id}
                  >
                    {deleting === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {itemId ? 'Aucun fichier attaché' : 'Sauvegardez d\'abord pour ajouter des fichiers'}
        </p>
      )}
    </div>
  );
};

export default FileUploader;
