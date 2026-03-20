import { useEffect, useRef, useState } from 'react';
import { mediaApi } from '../services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog';
import { isImageUrl, isVideoUrl, getVideoEmbedUrl } from '../lib/mediaPreview';
import {
  Upload,
  FileImage,
  FileText,
  File,
  FileVideo,
  Loader2,
  Download,
  Trash2,
  Link2,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';

const FileUploader = ({ itemType, itemId, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [savingLink, setSavingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [previewMedia, setPreviewMedia] = useState(null);
  const fileInputRef = useRef(null);

  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';

  const toMediaUrl = (media) => {
    if (media.kind === 'link') return media.url;
    if (!media.access_url) return null;
    return `${baseUrl}${media.access_url}`;
  };

  const isImageMedia = (media, resolvedUrl = '') => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('image/')) return true;
    return isImageUrl(resolvedUrl || media?.url);
  };

  const isVideoMedia = (media, resolvedUrl = '') => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('video/')) return true;
    const target = resolvedUrl || media?.url;
    return isVideoUrl(target) || Boolean(getVideoEmbedUrl(target));
  };

  const formatFileSize = (bytes) => {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchMedia = async () => {
    if (!itemId) {
      setMediaItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await mediaApi.list({ item_type: itemType, item_id: itemId });
      setMediaItems(res.data || []);
    } catch {
      toast.error('Erreur chargement medias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, itemId]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !itemId) return;

    setUploading(true);
    try {
      for (const file of files) {
        await mediaApi.upload({
          file,
          itemType,
          itemId,
          isFloating: false,
          previewOnCard: true,
          title: file.name,
        });
      }
      toast.success('Media ajoute');
      await fetchMedia();
      if (onUpdate) onUpdate();
    } catch {
      toast.error('Erreur upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateLink = async () => {
    if (!linkUrl.trim()) return;
    if (!itemId) {
      toast.error('Sauvegardez d abord l item');
      return;
    }

    setSavingLink(true);
    try {
      await mediaApi.createLink({
        url: linkUrl.trim(),
        title: linkTitle.trim() || undefined,
        item_type: itemType,
        item_id: itemId,
        is_floating: false,
        preview_on_card: true,
      });
      setLinkUrl('');
      setLinkTitle('');
      toast.success('Lien ajoute');
      await fetchMedia();
      if (onUpdate) onUpdate();
    } catch {
      toast.error('Erreur ajout lien');
    } finally {
      setSavingLink(false);
    }
  };

  const handleTogglePreview = async (media) => {
    try {
      await mediaApi.togglePreview(media.id);
      await fetchMedia();
      if (onUpdate) onUpdate();
    } catch {
      toast.error('Erreur mise a jour preview');
    }
  };

  const handleDelete = async (media) => {
    if (!window.confirm(`Supprimer "${media.title || media.original_name || media.url}" ?`)) return;
    setDeleting(media.id);
    try {
      await mediaApi.delete(media.id);
      await fetchMedia();
      if (onUpdate) onUpdate();
      toast.success('Media supprime');
    } catch {
      toast.error('Erreur suppression media');
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (media, resolvedUrl = '') => {
    if (isImageMedia(media, resolvedUrl)) return FileImage;
    if (isVideoMedia(media, resolvedUrl)) return FileVideo;
    if (String(media?.mime_type || '').includes('pdf') || String(media?.mime_type || '').includes('document')) return FileText;
    return File;
  };

  const previewUrl = previewMedia ? toMediaUrl(previewMedia) : '';
  const previewIsImage = previewMedia && previewUrl ? isImageMedia(previewMedia, previewUrl) : false;
  const previewIsVideo = previewMedia && previewUrl ? isVideoMedia(previewMedia, previewUrl) : false;
  const previewEmbedUrl = previewMedia?.kind === 'link' && previewUrl ? getVideoEmbedUrl(previewUrl) : null;
  const PreviewIcon = getFileIcon(previewMedia, previewUrl);

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3 bg-muted/10 overflow-hidden w-full max-w-full min-w-0">
      <div className="flex items-center justify-between gap-2 w-full min-w-0">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Medias
        </Label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || !itemId}>
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Ajouter fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 w-full min-w-0">
        <Input className="md:col-span-7" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <Input className="md:col-span-4" placeholder="Titre (optionnel)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
        <Button type="button" className="md:col-span-1" variant="secondary" onClick={handleCreateLink} disabled={savingLink || !linkUrl.trim()}>
          {savingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</div>
      ) : mediaItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun media.</p>
      ) : (
        <div className="space-y-2">
          {mediaItems.map((media) => {
            const url = toMediaUrl(media);
            const imagePreview = url && isImageMedia(media, url);
            const videoPreview = url && isVideoMedia(media, url);
            const embedUrl = media.kind === 'link' ? getVideoEmbedUrl(url) : null;
            const Icon = getFileIcon(media, url);
            return (
              <div key={media.id} className="w-full min-w-0 overflow-hidden grid grid-cols-[48px_minmax(0,1fr)] md:grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 p-2 rounded-md bg-secondary/20 border border-border/40">
                {imagePreview ? (
                  <button
                    type="button"
                    className="h-12 w-12 rounded overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setPreviewMedia(media)}
                    title="Afficher en grand"
                  >
                    <img src={url} alt={media.title || media.original_name || 'media'} className="h-12 w-12 rounded object-cover" />
                  </button>
                ) : videoPreview ? (
                  embedUrl ? (
                    <button
                      type="button"
                      className="h-12 w-12 rounded overflow-hidden border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setPreviewMedia(media)}
                      title="Afficher en grand"
                    >
                      <iframe
                        src={embedUrl}
                        title={media.title || media.original_name || 'video'}
                        className="h-12 w-12 rounded border border-border/40"
                        allow="autoplay; encrypted-media; picture-in-picture"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="h-12 w-12 rounded overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setPreviewMedia(media)}
                      title="Afficher en grand"
                    >
                      <video src={url} className="h-12 w-12 rounded object-cover" muted preload="metadata" />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="h-12 w-12 rounded bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setPreviewMedia(media)}
                    title="Afficher en grand"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    className="text-sm font-medium truncate break-all text-left hover:underline"
                    onClick={() => setPreviewMedia(media)}
                    title="Afficher en grand"
                  >
                    {media.title || media.original_name || media.url}
                  </button>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    {media.kind === 'file' ? <span>{formatFileSize(media.size)}</span> : <span>Lien externe</span>}
                    {media.preview_on_card ? <Badge variant="default">Preview ON</Badge> : <Badge variant="outline">Preview OFF</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 md:justify-end">
                  {url && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTogglePreview(media)}>
                    {media.preview_on_card ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(media)} disabled={deleting === media.id}>
                    {deleting === media.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewMedia} onOpenChange={(open) => { if (!open) setPreviewMedia(null); }}>
        <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewMedia?.title || previewMedia?.original_name || previewMedia?.url || 'Aperçu média'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {previewIsImage && previewUrl && (
              <img src={previewUrl} alt={previewMedia?.title || 'media'} className="w-full max-h-[70vh] object-contain rounded-md border border-border/40 bg-black/20" />
            )}

            {previewIsVideo && previewUrl && (
              previewEmbedUrl ? (
                <iframe
                  src={previewEmbedUrl}
                  title={previewMedia?.title || 'video'}
                  className="w-full h-[70vh] rounded-md border border-border/40 bg-black/20"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={previewUrl} className="w-full max-h-[70vh] rounded-md border border-border/40 bg-black/20" controls autoPlay />
              )
            )}

            {!previewIsImage && !previewIsVideo && (
              <div className="w-full min-h-[220px] rounded-md border border-border/40 bg-secondary/20 flex flex-col items-center justify-center gap-3 text-center p-4">
                <PreviewIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground break-all">
                  Aperçu direct non disponible pour ce type de média.
                </p>
              </div>
            )}

            {previewUrl && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => window.open(previewUrl, '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileUploader;
