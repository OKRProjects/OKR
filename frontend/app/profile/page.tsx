'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import ProfileForm from '@/components/ProfileForm';
import { api, Profile } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await login();
        return;
      }
      setUser(currentUser);
      loadProfile();
    } catch (error) {
      console.error('Error loading user:', error);
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error loading profile:', err);
      
      if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('500')) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryData = await api.getProfile();
          setProfile(retryData);
        } catch (retryErr) {
          console.error('Retry failed:', retryErr);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (user) {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setEditing(false);
      } catch (err) {
        if (err instanceof Error && err.message.includes('404')) {
          // Profile still doesn't exist
        }
      }
    }
  };

  if (isLoading || loading || !user) {
    return (
      <AppLayout title="Profile" description="Manage your profile information">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!profile && !editing) {
    return (
      <AppLayout title="Profile" description="Manage your profile information">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">You haven't created a profile yet.</p>
            <Button onClick={() => setEditing(true)}>
              Create Profile
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (editing) {
    return (
      <AppLayout title={profile ? 'Edit Profile' : 'Create Profile'} description="Update your profile information">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              {profile && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
            <ProfileForm profile={profile || undefined} onSuccess={handleProfileUpdate} />
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout title="Profile" description="Manage your profile information">
      <Card className="overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-12">
          <div className="flex items-center space-x-6">
            {profile.profileImageUrl ? (
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <Image
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <span className="text-5xl text-white font-bold">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 text-white">
              <h1 className="text-4xl font-bold mb-2">{profile.displayName}</h1>
              {user?.email && (
                <p className="text-white/80 text-lg">{user.email}</p>
              )}
            </div>
            <Button
              onClick={() => setEditing(true)}
              variant="secondary"
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Content */}
        <CardContent className="px-6 py-8">
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}

          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Member since</span>
                <p className="font-medium">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last updated</span>
                <p className="font-medium">
                  {profile.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex space-x-4">
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
