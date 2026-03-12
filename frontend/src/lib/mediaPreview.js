export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv'];
export const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.ppt', '.pptx'];

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const isImageUrl = (url) => {
  const value = String(url || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => value.includes(ext));
};

export const isVideoUrl = (url) => {
  const value = String(url || '').toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => value.includes(ext));
};

export const isDocumentUrl = (url) => {
  const value = String(url || '').toLowerCase();
  return DOCUMENT_EXTENSIONS.some((ext) => value.includes(ext));
};

export const getDocumentLabel = (attachment) => {
  const mime = String(attachment?.mime_type || '').toLowerCase();
  const source = String(attachment?.url || attachment?.filename || '').toLowerCase();

  if (mime.includes('pdf') || source.includes('.pdf')) return 'PDF';
  if (mime.includes('spreadsheet') || source.includes('.xls') || source.includes('.xlsx') || source.includes('.csv')) return 'Tableur';
  if (mime.includes('word') || source.includes('.doc') || source.includes('.docx')) return 'Document';
  if (source.includes('.txt')) return 'Texte';
  if (source.includes('.ppt')) return 'Presentation';
  return 'Fichier';
};

export const getVideoEmbedUrl = (url) => {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname;

  if (host === 'youtu.be') {
    const id = path.split('/').filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (path === '/watch') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const shorts = path.match(/^\/shorts\/([^/?#]+)/);
    if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
  }

  if (host === 'instagram.com' || host === 'm.instagram.com') {
    const match = path.match(/^\/(reel|p|tv)\/([^/?#]+)/);
    if (match?.[1] && match?.[2]) {
      return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
    }
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = path.match(/\/video\/(\d+)/);
    if (match?.[1]) return `https://www.tiktok.com/embed/v2/${match[1]}`;
  }

  if (host === 'vimeo.com') {
    const match = path.match(/^\/(\d+)/);
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
  }

  if (host === 'dailymotion.com') {
    const match = path.match(/^\/video\/([^/?#]+)/);
    if (match?.[1]) return `https://www.dailymotion.com/embed/video/${match[1]}`;
  }

  return null;
};

export const isEmbeddableVideoUrl = (url) => Boolean(getVideoEmbedUrl(url));
