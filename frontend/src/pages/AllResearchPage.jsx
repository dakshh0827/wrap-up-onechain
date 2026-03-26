import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import { Section } from "../components/Layout";
import { Button, Card, Badge } from "../components/ui";
import axios from "axios";
import { Brain, Calendar, User, ThumbsUp, MessageSquare, Hexagon, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE = 'https://wrap-up-evolved.onrender.com/api';

export default function AllResearchPage() {
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResearch();
  }, [page]);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/research?page=${page}&limit=12`);

      const data = response.data;

      // Defensive: handle various possible response shapes
      const items = data?.research ?? data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);
      const pages = data?.pagination?.totalPages ?? data?.totalPages ?? 1;

      setResearch(items);
      setTotalPages(pages);
    } catch (error) {
      console.error('Failed to load research:', error);
      setResearch([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
        <BlockchainBackground />
        <div className="text-center relative z-10">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium tracking-wide">Loading Research Reports...</p>
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <Brain className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">Research Reports</h1>
                </div>
                <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
                  Explore comprehensive, AI-generated multi-source deep dives across various topics.
                </p>
              </div>

              <div className="flex items-center gap-3">
                 <Button onClick={() => navigate('/research')} size="md" className="shadow-lg shadow-emerald-500/20">
                   Generate New Report
                 </Button>
              </div>
            </div>

            {research.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 backdrop-blur-sm animate-fade-in">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Brain className="w-10 h-10 text-zinc-600" />
                </div>
                <p className="text-zinc-400 text-lg mb-8 font-medium">No research reports yet. Be the first to mint one!</p>
                <Button onClick={() => navigate('/research')} size="lg" className="shadow-lg shadow-emerald-500/20">
                  Create Research Report
                </Button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  {research.map((report) => (
                    <Card
                      key={report.id}
                      variant="interactive"
                      onClick={() => navigate(`/research/${report.id}`)}
                      className="p-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] transition-all duration-300 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-3">
                          <h3 className="text-xl font-extrabold text-white mb-2 leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {report.topic}
                          </h3>
                        </div>
                        {report.onChain && (
                          <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Hexagon className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </div>

                      <p className="text-zinc-400 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                        {report.executiveSummary}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-5">
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 px-2.5 py-1 rounded-md border border-zinc-800/80">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md shadow-sm">
                          <TrendingUp className="w-3 h-3" />
                          {report.metadata?.totalSources || 0} sources
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-5 border-t border-zinc-800/50">
                        <div className="flex items-center gap-4 text-sm font-bold">
                          <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-300 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{report.upvotes}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-300 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                            <span>{report.commentCount || 0}</span>
                          </div>
                        </div>

                        {report.curatorName && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[100px]">{report.curatorName}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <Button
                      variant="secondary"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      size="md"
                      className="bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Prev
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 rounded-xl font-bold transition-all shadow-md ${
                              page === pageNum
                                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                                : 'bg-zinc-900/60 border border-zinc-800/80 text-white hover:border-emerald-500/50 hover:bg-zinc-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="secondary"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      size="md"
                      className="bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}