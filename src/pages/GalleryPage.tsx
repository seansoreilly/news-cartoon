import React, { useEffect, useState } from 'react';
import { supabase, TABLE_NAME, STORAGE_BUCKET, isSupabaseConfigured } from '../services/supabaseClient';
import type { GalleryItem } from '../types/gallery';
import { Link } from 'react-router-dom';

const GalleryPage: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }

    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      setLoading(true);
      const client = supabase;
      if (!client) return;

      const { data, error } = await client
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      if (data) {
        // Transform data to include public URL
        const itemsWithUrls = data.map((item: GalleryItem) => {
          const { data: publicUrlData } = client.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(item.image_path);

          return {
            ...item,
            public_url: publicUrlData.publicUrl
          };
        });
        setItems(itemsWithUrls);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load gallery items.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Cartoon Gallery
        </h1>
        <Link 
          to="/" 
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create New
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No cartoons in the gallery yet.</p>
          <Link 
            to="/" 
            className="text-purple-600 font-bold hover:underline mt-2 inline-block"
          >
            Be the first to publish one!
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="aspect-square overflow-hidden bg-gray-100 relative">
              {item.public_url ? (
                <img 
                  src={item.public_url} 
                  alt={item.title} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-800 mb-2 line-clamp-2" title={item.title}>
                {item.title}
              </h3>
              <div className="text-xs text-gray-500 flex justify-between items-center">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                {item.news_url && (
                  <a 
                    href={item.news_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Source
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GalleryPage;
