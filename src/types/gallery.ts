export interface GalleryItem {
  id: string;
  created_at: string;
  title: string;
  image_path: string;
  news_url?: string;
  news_source?: string;
  public_url?: string; // Computed url after retrieving from storage
}
