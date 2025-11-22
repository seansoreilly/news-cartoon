import { supabase, STORAGE_BUCKET, TABLE_NAME, isSupabaseConfigured } from './supabaseClient';

export const uploadToGallery = async (
  base64Image: string,
  title: string,
  newsUrl: string,
  newsSource: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Gallery service not configured' };
  }

  try {
    // 1. Convert base64 to Blob
    const base64Data = base64Image.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // 2. Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
    const filePath = `${filename}`;

    // 3. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 4. Insert record into DB
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .insert([
        {
          title: title,
          image_path: filePath,
          news_url: newsUrl,
          news_source: newsSource
        }
      ]);

    if (dbError) throw dbError;

    return { success: true };

  } catch (error) {
    console.error('Gallery upload failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};
