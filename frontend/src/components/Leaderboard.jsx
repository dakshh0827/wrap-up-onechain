import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui';
import axios from 'axios';
import { Trophy, ThumbsUp, MessageSquare, Star, FileText } from 'lucide-react';

const API_BASE = 'https://wrap-up-evolved.onrender.com/api';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/leaderboard/top`);
      setLeaderboard(response.data || []);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (article) => {
    const articleId = article.id || article._id;
    if (articleId) navigate(`/curated/${articleId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) return null;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getRankStyle = (index) => {
    if (index === 0) return { bg: 'bg-emerald-500', text: 'text-black', label: '1st' };
    if (index === 1) return { bg: 'bg-white', text: 'text-black', label: '2nd' };
    return { bg: 'bg-zinc-700', text: 'text-white', label: '3rd' };
  };

  return (
    <div className="mb-16">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            Community Top Picks
          </h2>
        </div>
        <div className="text-zinc-500 text-sm font-mono">
          Weekly Ranking
        </div>
      </div>

      {/* Top 3 Podium Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {topThree.map((article, index) => {
          const style = getRankStyle(index);
          return (
            <Card
              key={article.id || article._id}
              variant="interactive"
              onClick={() => handleArticleClick(article)}
              className="overflow-hidden flex flex-col p-0"
            >
              <div className="relative h-40 bg-zinc-900">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-zinc-700" />
                  </div>
                )}
                <div className={`absolute top-4 left-4 ${style.bg} ${style.text} font-bold px-3 py-1.5 rounded-lg text-xs shadow-lg`}>
                  {style.label} Place
                </div>
              </div>

              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                  {article.title}
                </h3>
                
                <div className="mt-auto flex items-center gap-4 text-xs font-mono text-zinc-400 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{article.upvotes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{article.commentCount || 0}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* List View for Rest */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Runner Ups</h3>
          {rest.map((article) => (
            <div
              key={article.id || article._id}
              onClick={() => handleArticleClick(article)}
              className="group bg-zinc-900 border border-zinc-800 hover:bg-zinc-900/80 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-xl border border-zinc-700 text-zinc-400 font-mono text-sm group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-all">
                #{article.rank}
              </div>

              <div className="flex-grow min-w-0">
                <h3 className="text-white font-medium text-sm truncate pr-4 group-hover:text-emerald-400 transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Score: {article.score}
                  </span>
                  <span className="text-xs text-zinc-500">
                    by {article.curatorName || 'Anon'}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 hidden sm:block">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-700">
                  <ThumbsUp className="w-3 h-3" />
                  {article.upvotes}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}