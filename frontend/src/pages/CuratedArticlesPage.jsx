import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Leaderboard from "../components/Leaderboard";
import { Section } from "../components/Layout";
import { Button, Card, Badge } from "../components/ui";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BookOpen, ThumbsUp, MessageSquare, Inbox, Hexagon, FileText, TrendingUp, Plus, AlertCircle } from "lucide-react";

const API_BASE = 'http://localhost:5001/api';

export default function CuratedArticlesPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/articles/all`);

      // Defensive: handle various possible response shapes
      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : data?.articles ?? data?.results ?? data?.data ?? [];

      setArticles(items);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load articles');
      setArticles([]);
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
        <BlockchainBackground />
        <div className="text-center relative z-10">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium tracking-wide">Loading Archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      <BlockchainBackground />
      <Navbar />
      
      <main className="flex-grow relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Section className="py-16">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <FileText className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">Legacy Curation</h1>
                </div>
                <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
                  Curated insights from across the decentralized web. Verified by community, permanently stored on OneChain.
                </p>
              </div>
              
              <div className="flex gap-6 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
                <div className="flex flex-col items-center px-4 border-r border-zinc-800/80">
                  <span className="text-3xl font-black text-white mb-1">{articles.length}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Articles</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <span className="text-3xl font-black text-emerald-400 mb-1">
                    {articles.reduce((a, b) => a + (b.upvotes || 0), 0)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Votes</span>
                </div>
              </div>
            </div>

            <div className="mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <Leaderboard />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-zinc-800/50 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 text-xl font-bold text-white">
                <BookOpen className="w-6 h-6 text-emerald-400" /> All Entries
              </div>
              <Button onClick={() => navigate('/legacy')} size="md" className="shadow-lg shadow-emerald-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Submit URL
              </Button>
            </div>

            {/* Grid */}
            {error ? (
              <div className="p-8 border border-red-500/30 bg-zinc-900/40 backdrop-blur-md rounded-2xl text-center shadow-xl">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 backdrop-blur-sm">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Inbox className="w-10 h-10 text-zinc-600" />
                </div>
                <p className="text-zinc-400 text-lg mb-8 font-medium">No articles found in the registry.</p>
                <Button onClick={() => navigate('/legacy')} size="lg" className="shadow-lg shadow-emerald-500/20">
                  Submit Your First URL
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
                {articles.map((article) => (
                  <Card 
                    key={article.id || article._id}
                    variant="interactive"
                    onClick={() => handleArticleClick(article)}
                    className="overflow-hidden flex flex-col p-0 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="h-52 overflow-hidden relative bg-zinc-950 border-b border-zinc-800/80">
                      {article.imageUrl ? (
                        <>
                          <img 
                            src={article.imageUrl} 
                            alt={article.title} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60"></div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
                          <FileText className="w-14 h-14 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4">
                        <Badge className={`${article.onChain ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/80 text-zinc-400 border-zinc-700"} backdrop-blur-md font-bold px-3 py-1 shadow-lg`}>
                          {article.onChain ? (
                            <>
                              <Hexagon className="w-3.5 h-3.5 mr-1.5 inline-block" />
                              Minted
                            </>
                          ) : (
                            'Draft'
                          )}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-extrabold text-white mb-3 leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                        {article.summary}
                      </p>
                      
                      <div className="pt-5 border-t border-zinc-800/50 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                        <span>
                          {new Date(article.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <ThumbsUp className="w-4 h-4" /> {article.upvotes || 0}
                          </span>
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <MessageSquare className="w-4 h-4" /> {article.comments?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}