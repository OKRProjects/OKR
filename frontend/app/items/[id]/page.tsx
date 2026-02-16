'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ItemForm from '@/components/ItemForm';
import { api, Item } from '@/lib/api';

export default function EditItemPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const loadItem = async () => {
      if (params.id && typeof params.id === 'string') {
        try {
          const data = await api.getItem(params.id);
          setItem(data);
        } catch (err) {
          console.error('Failed to load item:', err);
          router.push('/dashboard');
        } finally {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadItem();
    }
  }, [params.id, user, router]);

  if (isLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Item</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <ItemForm item={item} />
        </div>
      </div>
    </div>
  );
}
