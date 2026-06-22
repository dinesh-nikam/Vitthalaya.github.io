'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Medal, User, Loader2, ChevronRight } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string | null;
  imageUrl: string | null;
  bio: string | null;
  reputationScore: number;
  correctionsCount: number;
  versionsCount: number;
  memberSince: string;
}

const RANK_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="w-5 h-5 text-yellow-500" />,
  2: <Medal className="w-5 h-5 text-gray-400" />,
  3: <Medal className="w-5 h-5 text-amber-700" />,
};

const RANK_COLORS: Record<number, string> = {
  1: 'bg-yellow-50 border-yellow-200',
  2: 'bg-gray-50 border-gray-200',
  3: 'bg-amber-50 border-amber-200',
};

export default function LeaderboardClient() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/leaderboard?limit=100')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>अद्याप कोणतेही योगदानकर्ते नाहीत</p>
        <p className="text-sm mt-1">प्रथम योगदान देणारे व्हा!</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{total} एकूण योगदानकर्ते</p>

      <div className="space-y-2">
        {users.map((user) => {
          const rankStyle = RANK_COLORS[user.rank] || 'bg-card border-saffron/10';
          const rankIcon = RANK_ICONS[user.rank];

          return (
            <Link
              key={user.id}
              href={`/profile/${user.id}`}
              className={`flex items-center gap-4 p-4 rounded-lg border hover:shadow-sm transition-all ${rankStyle}`}
            >
              {/* Rank */}
              <div className="w-8 text-center shrink-0">
                {rankIcon || <span className="text-sm font-bold text-muted-foreground">{user.rank}</span>}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-saffron/10 flex items-center justify-center shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-saffron" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {user.name || 'अज्ञात वापरकर्ता'}
                </div>
                {user.bio && (
                  <div className="text-xs text-muted-foreground truncate">{user.bio}</div>
                )}
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{user.correctionsCount} दुरुस्त्या</span>
                  <span>{user.versionsCount} आवृत्त्या</span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-maroon">{user.reputationScore}</div>
                <div className="text-xs text-muted-foreground">गुण</div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
