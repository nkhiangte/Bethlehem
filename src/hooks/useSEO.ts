import { useEffect } from 'react';
import { updateDocumentMetadata, SEOMetadata } from '../lib/seo';

export function useSEO(meta: SEOMetadata) {
  useEffect(() => {
    updateDocumentMetadata(meta);
  }, [meta.title, meta.description, meta.imageUrl, meta.url, meta.type]);
}
