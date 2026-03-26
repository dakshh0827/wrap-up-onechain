import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import { useParams, useNavigate } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import toast from "react-hot-toast";

// --- ONECHAIN / SUI IMPORTS (Replacing Wagmi) ---
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { PACKAGE_ID } from "../constants";

import { ThumbsUp, MessageSquare, ArrowLeft, ExternalLink, FileText, Newspaper, Key, BarChart2, X, Clock, Hexagon, User, AlertCircle } from "lucide-react";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    selectedArticle: storeArticle, loadArticle, 
    prepareCommentForChain // We'll use this just for DB saving in the MVP
  } = useArticleStore();
  
  const [article, setArticle] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasUpvotedArticleLocal, setHasUpvotedArticleLocal] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // --- ONECHAIN WALLET HOOKS ---
  const account = useCurrentAccount();
  const isConnected = !!account;
  const address = account?.address;
  const suiClient = useSuiClient();

  // Load article from store
  useEffect(() => {
    if (storeArticle) setArticle(JSON.parse(JSON.stringify(storeArticle)));
  }, [storeArticle]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        await loadArticle(id);
      } catch (err) {
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id, loadArticle]);

  const isCurator = isConnected && article?.curator?.toLowerCase() === address?.toLowerCase();
  const canUpvoteArticle = isConnected && !isCurator && !hasUpvotedArticleLocal;

  // --- MOCK SMART CONTRACT CALLS FOR MVP DEMO ---
  // Since the AI Track MVP focuses on AI reports, we handle legacy interactions via DB for the demo

  const handleUpvoteArticle = async () => {
    if (!canUpvoteArticle) {
      if (!isConnected) toast.error("Please connect OneWallet");
      else if (isCurator) toast.error("Cannot upvote your own article");
      else if (hasUpvotedArticleLocal) toast.error("Already upvoted");
      return;
    }
    
    setIsVoting(true);
    const toastId = toast.loading('Processing upvote...');
    
    // Simulate network delay for demo effect
    setTimeout(() => {
        setArticle(prev => ({ ...prev, upvotes: prev.upvotes + 1 }));
        setHasUpvotedArticleLocal(true);
        toast.success("Article Upvoted!", { id: toastId });
        setIsVoting(false);
    }, 1500);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) { toast.error("Please enter a comment"); return; }
    if (!isConnected) { toast.error("Please connect OneWallet to comment"); return; }
    
    setIsCommenting(true);
    const toastId = toast.loading('Posting comment...');

    try {
      // For MVP, we just use your DB logic. In a full production app, you would use useSignAndExecuteTransaction here.
      const pseudoName = address ? `${address.substring(0, 6)}...${address.substring(38)}` : 'OneChain User';
      
      setArticle(prev => ({
        ...prev,
        comments: [{
          id: Date.now().toString(), // Mock ID
          content: commentText.trim(),
          author: address,
          authorName: pseudoName,
          upvotes: 0,
          upvotedBy: [],
          onChain: true, // Optimistic UI
          createdAt: new Date().toISOString(),
          replies: []
        }, ...(prev.comments || [])]
      }));
      
      setCommentText("");
      toast.success('Comment posted successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to post comment', { id: toastId });
    } finally {
        setIsCommenting(false);
    }
  };

  const handleReply = async (parentComment) => {
    if (!replyText.trim()) { toast.error("Please enter a reply"); return; }
    if (!isConnected) { toast.error("Please connect OneWallet to reply"); return; }
    
    const toastId = toast.loading('Posting reply...');
    
    setTimeout(() => {
        toast.success('Reply posted!', { id: toastId });
        setReplyText("");
        setReplyingTo(null);
    }, 1000);
  };

  const handleUpvoteComment = async (comment) => {
    if (!isConnected) { toast.error("Please connect OneWallet"); return; }
    if (comment.upvotedBy?.some(vote => typeof vote === 'string' ? vote === address : vote.address?.toLowerCase() === address?.toLowerCase())) {
      toast.error("Already upvoted"); return;
    }
    if (comment.author?.toLowerCase() === address?.toLowerCase()) { toast.error("Cannot upvote own comment"); return; }
    
    toast.success('Comment upvoted!');
  };

  const renderComment = (comment, isReply = false) => {
    const hasUpvoted = comment.upvotedBy?.some(vote => typeof vote === 'string' ? vote === address : vote.address?.toLowerCase() === address?.toLowerCase());
    const isCommenter = comment.author?.toLowerCase() === address?.toLowerCase();
    const canUpvote = isConnected && !isCommenter && !hasUpvoted && comment.onChain;
    
    return (
      <div key={comment.id} className={`${isReply ? "ml-8 pl-8 border-l border-zinc-800/50 mt-4" : "mb-6 pb-6 border-b border-zinc-800/50 last:border-0"}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg border border-zinc-700 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-inner">
              {(comment.authorName || 'A')[0].toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-white text-sm block">{comment.authorName || 'Anonymous'}</span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">
                {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpvoteComment(comment)}
              disabled={!canUpvote}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                !canUpvote ? "border-transparent text-zinc-600" : "border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 bg-zinc-900/50"
              }`}
            >
              <ThumbsUp className="w-3 h-3" /> <span>{comment.upvotes}</span>
            </button>
            {comment.onChain ? (
               <Hexagon className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
               <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
            )}
          </div>
        </div>
        
        <p className="text-zinc-300 mb-3 leading-relaxed text-sm">{comment.content}</p>
        
        {!isReply && isConnected && (
            <button onClick={() => setReplyingTo(comment.id)} className="text-emerald-400 text-xs font-bold hover:underline">Reply</button>
        )}
        
        {replyingTo === comment.id && (
          <div className="mt-4 pl-4 border-l-2 border-emerald-500/50">
            <textarea
              className="w-full bg-zinc-950/50 border border-zinc-800/80 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none shadow-inner"
              rows={2}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleReply(comment)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shadow-lg shadow-emerald-500/20">Post</button>
              <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="text-zinc-500 hover:text-zinc-300 text-xs px-3 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">{comment.replies.map(reply => renderComment(reply, true))}</div>
        )}
      </div>
    );
  };

  if (loading || !article) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
        <BlockchainBackground />
        <div className="text-center max-w-md relative z-10 bg-zinc-900/50 backdrop-blur-md p-8 rounded-2xl border border-red-500/30">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-6 leading-relaxed">{error}</p>
          <button onClick={() => navigate("/curated")} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold transition-colors">
            Back to Registry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white relative font-sans flex flex-col">
      <BlockchainBackground />
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 relative z-10 max-w-6xl flex-grow">
        
        <div className="mb-10">
          <button onClick={() => navigate('/curated')} className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Registry
          </button>
        </div>
        
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight drop-shadow-md">
                {article.title}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm mb-4">
                <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded-lg shadow-sm font-mono">
                  {new Date(article.createdAt).toLocaleDateString()}
                </span>
                {article.onChain ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-lg flex items-center gap-2 font-medium shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Hexagon className="w-4 h-4" /> Validated by OneChain
                  </span>
                ) : (
                  <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-1.5 rounded-lg font-medium">
                    Draft (Off-Chain)
                  </span>
                )}
                {article.curator && (
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-1.5 rounded-lg flex items-center gap-2 font-medium">
                    <User className="w-4 h-4" /> Curated by {article.curatorName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <article className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl mb-12">
            {article.imageUrl && (
              <div className="w-full h-64 md:h-96 overflow-hidden relative border-b border-zinc-800/80">
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent"></div>
              </div>
            )}

            <div className="p-8 md:p-10">
                <div className="grid lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-10">
                        <section>
                            <h3 className="text-2xl font-bold mb-5 flex items-center gap-3 border-b border-zinc-800/50 pb-3">
                              <FileText className="w-6 h-6 text-emerald-400" /> Abstract
                            </h3>
                            <p className="text-zinc-300 leading-relaxed text-lg font-medium">{article.summary}</p>
                        </section>

                        {article.detailedSummary && (
                             <section className="bg-zinc-950/50 p-8 rounded-2xl border border-zinc-800/50 shadow-inner">
                                <h3 className="text-xl font-bold mb-5 flex items-center gap-2 text-white">
                                  <Newspaper className="w-5 h-5 text-emerald-400" /> Synthesis
                                </h3>
                                <div className="text-zinc-400 leading-relaxed whitespace-pre-line text-[15px]">{article.detailedSummary}</div>
                             </section>
                        )}
                        
                        {article.keyPoints?.length > 0 && (
                            <section>
                                 <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b border-zinc-800/50 pb-3">
                                   <Key className="w-6 h-6 text-emerald-400" /> Key Takeaways
                                 </h3>
                                 <div className="grid gap-4">
                                    {article.keyPoints.map((point, i) => (
                                        <div key={i} className="flex gap-5 bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/20 transition-colors">
                                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/30 shadow-inner">0{i+1}</span>
                                            <p className="text-zinc-300 pt-1.5 leading-relaxed">{point}</p>
                                        </div>
                                    ))}
                                 </div>
                            </section>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="sticky top-24">
                            <a href={article.articleUrl} target="_blank" rel="noopener noreferrer" 
                              className="block w-full bg-emerald-500 text-black text-center py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 mb-6 flex items-center justify-center gap-2"
                            >
                                Read Original URL <ExternalLink className="w-5 h-5" />
                            </a>

                            <div className="bg-zinc-950/50 border border-zinc-800/80 p-8 rounded-2xl mb-6 shadow-inner text-center">
                                <div className="mb-8">
                                    <div className="text-6xl font-black text-white mb-2">{article.upvotes}</div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Community Votes</div>
                                </div>
                                <button
                                    onClick={handleUpvoteArticle}
                                    disabled={!canUpvoteArticle || isVoting}
                                    className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg ${
                                        canUpvoteArticle 
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:shadow-emerald-500/20' 
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                                    }`}
                                >
                                    {isVoting ? 'Voting...' : hasUpvotedArticleLocal ? 'Upvoted' : 'Upvote Article'}
                                </button>
                            </div>

                            {article.statistics?.length > 0 && (
                                <div className="bg-zinc-950/50 border border-zinc-800/80 p-6 rounded-2xl shadow-inner">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Extracted Data Points</h4>
                                    <div className="space-y-3">
                                      {article.statistics.map((stat, i) => (
                                          <div key={i} className="flex justify-between items-center border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                                              <div className="text-xs text-zinc-400 font-medium pr-4">{stat.label}</div>
                                              <div className="text-base font-bold text-emerald-400 whitespace-nowrap">{stat.value}</div>
                                          </div>
                                      ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </article>

        <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-12 shadow-xl">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-zinc-800/50 pb-4">
              <MessageSquare className="w-6 h-6 text-emerald-400" /> Discussion ({article.comments?.length || 0})
            </h3>
            
            {isConnected ? (
                <form onSubmit={handleComment} className="mb-10 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4 shadow-inner focus-within:border-emerald-500/30 transition-all">
                    <textarea
                        className="w-full bg-transparent p-2 text-white placeholder-zinc-500 focus:outline-none resize-none text-sm leading-relaxed"
                        rows={3}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Add to the discussion..."
                        disabled={isCommenting}
                    />
                    <div className="flex justify-end mt-2 pt-2 border-t border-zinc-800/50">
                        <button type="submit" disabled={isCommenting || !commentText.trim()} className="bg-emerald-500 text-black px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20">
                            {isCommenting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-zinc-950/50 p-8 text-center border border-zinc-800/80 rounded-2xl mb-10 shadow-inner">
                    <p className="text-zinc-400 text-sm font-medium">Connect OneWallet to join the conversation.</p>
                </div>
            )}

            <div className="space-y-2">
                {article.comments?.length > 0 ? article.comments.map(c => renderComment(c)) : <p className="text-zinc-600 italic text-center py-6">No comments yet.</p>}
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}