'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import Link from 'next/link';
import DashboardShell from '@/components/DashboardShell';
import { motion } from 'motion/react';
import { Clock, User as UserIcon, Mic, Volume2 } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardShell>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-3xl font-bold mb-1">Overview</h2>
            <p className="text-gray-400">Welcome to your control center</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Last updated: Just now</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-[#4F8CFF]/20 to-[#4F8CFF]/5 p-3 rounded-xl">
              <UserIcon className="w-6 h-6 text-[#4F8CFF]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Profile</h3>
              <p className="text-sm text-gray-400">View and edit your profile</p>
            </div>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center text-[#4F8CFF] hover:text-[#6BA0FF] text-sm font-medium"
          >
            Go to Profile →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-white/20 transition-all"
        >
          <h3 className="text-xl font-semibold mb-2">Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h3>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-3 rounded-xl">
              <Mic className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Voice-to-Text</h3>
              <p className="text-sm text-gray-400">Transcribe audio to text</p>
            </div>
          </div>
          <Link
            href="/voice-to-text"
            className="inline-flex items-center text-[#4F8CFF] hover:text-[#6BA0FF] text-sm font-medium"
          >
            Go to Voice-to-Text →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-3 rounded-xl">
              <Volume2 className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Text-to-Voice</h3>
              <p className="text-sm text-gray-400">Convert text to speech</p>
            </div>
          </div>
          <Link
            href="/text-to-voice"
            className="inline-flex items-center text-[#4F8CFF] hover:text-[#6BA0FF] text-sm font-medium"
          >
            Go to Text-to-Voice →
          </Link>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
