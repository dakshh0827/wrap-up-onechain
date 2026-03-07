import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from "recharts";
import axios from "axios";
import toast from "react-hot-toast";
import { useArticleStore } from "../stores/articleStore";
import {
  useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt,
  useSwitchChain, useWatchContractEvent, useChainId,
} from "wagmi";
import {
  WRAPUP_ABI, CONTRACT_ADDRESSES,
} from "../wagmiConfig";
import { decodeEventLog } from "viem";
import {
  Download, ExternalLink, AlertCircle, TrendingUp, MessageSquare,
  BarChart3, Globe, CheckCircle, XCircle, ChevronDown, ChevronUp,
  FileText, ThumbsUp, Hexagon, Link2, Loader, Circle, ArrowLeft
} from "lucide-react";

const API_BASE = "https://wrap-up-evolved.onrender.com/api";

const SENTIMENT_COLORS = {
  Positive: "#10b981",
  Negative: "#ef4444",
  Neutral: "#6b7280",
  Balanced: "#8b5cf6",
};

function PublishSteps({ step }) {
  const steps = ["Save to DB", "Upload IPFS", "Sign Tx", "Confirmed"];
  return (
    <div className="flex items-center gap-2 mt-4">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            {i < step ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : i === step ? (
              <Loader className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-600" />
            )}
            <span
              className={`text-[11px] font-bold tracking-wide uppercase ${
                i < step
                  ? "text-emerald-400"
                  : i === step
                  ? "text-white"
                  : "text-zinc-600"
              }`}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-6 h-px ${i < step ? "bg-emerald-500/50" : "bg-zinc-800"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ResearchReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [pendingCommentData, setPendingCommentData] = useState(null);
  const [hasUpvotedResearchLocal, setHasUpvotedResearchLocal] = useState(false);

  const [publishStep, setPublishStep] = useState(-1);
  const [publishIpfsHash, setPublishIpfsHash] = useState(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const currentContractAddress =
    CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[421614];

  const {
    loadResearch,
    uploadResearchToIPFS,
    markResearchOnChainDB,
    prepareResearchCommentForChain,
    markResearchCommentOnChainDB,
    syncResearchUpvotesDB,
    deleteResearchFromDB
  } = useArticleStore();

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const data = await loadResearch(id);
      setResearch(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError(err.message || "Failed to load research");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, [id]);

  const { data: voteHash, isPending: isVoting, writeContract: writeVote } = useWriteContract();
  const { data: commentHash, isPending: isCommenting, writeContract: writeComment } = useWriteContract();
  const { data: publishHash, isPending: isPublishing, writeContract: writePublish, error: publishWriteError, isError: isPublishWriteError } = useWriteContract();

  const { isLoading: isVoteConfirming, isSuccess: isVoteConfirmed, data: voteReceipt } = useWaitForTransactionReceipt({ hash: voteHash });
  const { isLoading: isCommentConfirming, isSuccess: isCommentConfirmed, data: commentReceipt } = useWaitForTransactionReceipt({ hash: commentHash });
  const { isLoading: isPublishConfirming, isSuccess: isPublishConfirmed, isError: isPublishTxError, error: publishTxError, data: publishReceipt } = useWaitForTransactionReceipt({ hash: publishHash });

  const { data: hasUpvotedResearch, refetch: refetchHasUpvotedResearch } =
    useReadContract({
      abi: WRAPUP_ABI,
      address: currentContractAddress,
      functionName: "hasUpvotedArticle",
      args: [address, research?.blockchainId],
      enabled: isConnected && !!research?.blockchainId && research?.onChain,
    });

  const { data: userDisplayName } = useReadContract({
    abi: WRAPUP_ABI,
    address: currentContractAddress,
    functionName: "displayNames",
    args: [address],
    enabled: isConnected && !!address,
  });

  useEffect(() => {
    if (hasUpvotedResearch !== undefined) {
      setHasUpvotedResearchLocal(hasUpvotedResearch);
    }
  }, [hasUpvotedResearch]);

  useWatchContractEvent({
    address: currentContractAddress,
    abi: WRAPUP_ABI,
    eventName: "CommentPosted",
    enabled: !!research?.blockchainId && research?.onChain,
    onLogs(logs) {
      for (const log of logs) {
        try {
          const event = decodeEventLog({ abi: WRAPUP_ABI, data: log.data, topics: log.topics });
          if (research?.blockchainId && event.args.articleId === BigInt(research.blockchainId)) {
            fetchResearch();
            toast.success("New comment detected!");
          }
        } catch {}
      }
    }
  });

  const callContract = (writeFn, config, toastId) => {
    if (!CONTRACT_ADDRESSES[chainId]) {
      toast.loading("Switching to supported network...", { id: toastId });
      switchChain(
        { chainId: 421614 },
        {
          onSuccess: () => writeFn({ ...config, address: CONTRACT_ADDRESSES[421614] }),
          onError: () => toast.error("Network switch failed", { id: toastId }),
        }
      );
    } else {
      writeFn(config);
    }
  };

  const handlePublishToBlockchain = async () => {
    if (!isConnected) { toast.error("Please connect wallet to publish on-chain"); return; }
    if (research.onChain) { toast.error("Already published on blockchain"); return; }

    setPublishStep(0);
    const tid = toast.loading("Publishing research on-chain...");
    try {
      await new Promise((r) => setTimeout(r, 400));
      setPublishStep(1);

      toast.loading("Uploading to IPFS...", { id: tid });
      const hash = await uploadResearchToIPFS(research.id);
      if (!hash) throw new Error("IPFS upload returned no hash");
      setPublishIpfsHash(hash);
      
      toast.loading("Sign transaction in wallet...", { id: tid });
      setPublishStep(2);

      callContract(writePublish, {
        address: currentContractAddress,
        abi: WRAPUP_ABI,
        functionName: "submitResearchReport",
        args: [hash],
      }, tid);
    } catch (err) {
      toast.error(err.message || "Publish failed", { id: tid });
      setPublishStep(-1);
      if (research?.id) {
        deleteResearchFromDB(research.id);
        toast.error("Publish failed. Report deleted for consistency.");
        navigate('/'); 
      }
    }
  };

  useEffect(() => {
    if (isPublishing) toast.loading("Waiting for wallet...", { id: "pubToast" });
    if (isPublishConfirming) { setPublishStep(2); toast.loading("Confirming on blockchain...", { id: "pubToast" }); }

    if (isPublishConfirmed && publishReceipt && publishIpfsHash) {
      setPublishStep(3);
      let blockchainId = null;
      try {
        for (const log of publishReceipt.logs) {
          const event = decodeEventLog({ abi: WRAPUP_ABI, data: log.data, topics: log.topics });
          if (event.eventName === "ArticleSubmitted") { blockchainId = event.args.articleId.toString(); break; }
        }
      } catch {}

      if (blockchainId && address) {
        toast.loading("Finalizing...", { id: "pubToast" });
        markResearchOnChainDB(research.id, blockchainId, address, publishIpfsHash)
          .then(() => {
            toast.success("Research published on-chain!", { id: "pubToast" });
            setTimeout(() => { setPublishStep(-1); fetchResearch(); }, 1500);
          })
          .catch((err) => { toast.error("DB sync failed: " + err.message, { id: "pubToast" }); setPublishStep(-1); });
      } else {
        toast.success("Published on-chain!", { id: "pubToast" });
        setPublishStep(-1);
        setTimeout(fetchResearch, 1500);
      }
    }

    if (isPublishTxError || isPublishWriteError) {
      toast.error(publishTxError?.shortMessage || publishWriteError?.shortMessage || "Transaction failed", { id: "pubToast" });
      setPublishStep(-1);
      if (research?.id) {
        deleteResearchFromDB(research.id);
        toast.error("Transaction failed. Report deleted for consistency.");
        navigate('/');
      }
    }
  }, [isPublishing, isPublishConfirming, isPublishConfirmed, isPublishTxError, isPublishWriteError, publishReceipt]);

  const handleUpvoteResearch = async () => {
    if (!isConnected) { toast.error("Please connect wallet"); return; }
    if (!research.onChain) { toast.error("Research must be on-chain to upvote"); return; }
    if (hasUpvotedResearchLocal) { toast.error("Already upvoted"); return; }

    const toastId = toast.loading("Processing upvote...");
    setResearch((prev) => ({ ...prev, upvotes: prev.upvotes + 1 }));
    setHasUpvotedResearchLocal(true);

    callContract(writeVote, {
      address: currentContractAddress,
      abi: WRAPUP_ABI,
      functionName: "upvoteArticle",
      args: [research.blockchainId],
    }, toastId);
  };

  useEffect(() => {
    if (isVoteConfirmed && voteReceipt) {
      toast.success("Vote confirmed!");
      let upvotes = 0;
      try {
        for (const log of voteReceipt.logs) {
          const event = decodeEventLog({ abi: WRAPUP_ABI, data: log.data, topics: log.topics });
          if (event.eventName === "Upvoted") { upvotes = Number(event.args.newUpvoteCount); break; }
        }
      } catch {}
      if (upvotes > 0) syncResearchUpvotesDB(research.id, upvotes);
      setTimeout(() => { fetchResearch(); refetchHasUpvotedResearch(); }, 3000);
    }
  }, [isVoteConfirmed, voteReceipt]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) { toast.error("Please enter a comment"); return; }
    if (!isConnected) { toast.error("Please connect wallet"); return; }
    if (!research.onChain) { toast.error("Research must be on-chain to comment"); return; }

    const toastId = toast.loading("Preparing comment...");
    try {
      const { commentMongoId, onChainResearchId, ipfsHash } =
        await prepareResearchCommentForChain({
          researchId: research.id,
          content: commentText.trim(),
          author: address,
          authorName: userDisplayName || (address ? `${address.substring(0, 6)}...${address.substring(38)}` : ""),
        });

      setPendingCommentData({ commentMongoId, ipfsHash });
      setResearch((prev) => ({
        ...prev,
        comments: [
          {
            id: commentMongoId, content: commentText.trim(), author: address, authorName: userDisplayName || "",
            upvotes: 0, onChain: false, createdAt: new Date().toISOString(), replies: [],
          },
          ...(prev.comments || []),
        ],
      }));
      setCommentText("");
      toast.loading("Please confirm in wallet...", { id: toastId });

      callContract(writeComment, {
        address: currentContractAddress, abi: WRAPUP_ABI, functionName: "postComment", args: [onChainResearchId, ipfsHash],
      }, toastId);
    } catch (err) {
      toast.error(err.message || "Failed to prepare comment", { id: toastId });
      fetchResearch();
    }
  };

  useEffect(() => {
    if (isCommentConfirmed && commentReceipt && pendingCommentData) {
      toast.success("Comment posted!");
      let onChainCommentId = null;
      try {
        for (const log of commentReceipt.logs) {
          const event = decodeEventLog({ abi: WRAPUP_ABI, data: log.data, topics: log.topics });
          if (event.eventName === "CommentPosted") { onChainCommentId = event.args.commentId.toString(); break; }
        }
      } catch {}
      if (onChainCommentId) {
        markResearchCommentOnChainDB(pendingCommentData.commentMongoId, onChainCommentId, pendingCommentData.ipfsHash);
      }
      setTimeout(() => fetchResearch(), 3000);
    }
  }, [isCommentConfirmed, commentReceipt, pendingCommentData]);

  const handleUpvoteComment = async (comment) => {
    if (!isConnected) { toast.error("Please connect wallet"); return; }
    if (!comment.onChain) { toast.error("Comment not on-chain yet"); return; }
    if (comment.upvotedBy?.some((v) => typeof v === "string" ? v === address : v.address?.toLowerCase() === address?.toLowerCase())) { 
      toast.error("Already upvoted"); return; 
    }

    callContract(writeVote, {
      address: currentContractAddress, abi: WRAPUP_ABI, functionName: "upvoteComment", args: [comment.commentId],
    }, "upvoteCommentToast");
  };

  const toggleSource = (idx) => setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const renderComment = (comment, isReply = false) => {
    const hasUpvoted = comment.upvotedBy?.some((v) => typeof v === "string" ? v === address : v.address?.toLowerCase() === address?.toLowerCase());
    const isCommenter = comment.author?.toLowerCase() === address?.toLowerCase();
    const canUpvote = isConnected && !isCommenter && !hasUpvoted && comment.onChain;

    return (
      <div key={comment.id} className={`${isReply ? "ml-8 pl-8 border-l border-zinc-800/50 mt-4" : "mb-6 pb-6 border-b border-zinc-800/50 last:border-0"}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg border border-zinc-700 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-inner">
              {(comment.authorName || "A")[0].toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-white text-sm block">{comment.authorName || "Anonymous"}</span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">
                {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
              <ThumbsUp className="w-3 h-3" /> {comment.upvotes}
            </button>
            {comment.onChain ? (
              <Hexagon className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            )}
          </div>
        </div>
        <p className="text-zinc-300 mb-3 leading-relaxed text-sm">{comment.content}</p>
        {comment.replies?.length > 0 && (
          <div className="mt-4">{comment.replies.map((r) => renderComment(r, true))}</div>
        )}
      </div>
    );
  };

  if (loading || !research) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
        <BlockchainBackground />
        <div className="text-center relative z-10">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium tracking-wide">Loading Research Context...</p>
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
          <button onClick={() => navigate("/research")} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold transition-colors">
            Back to Hub
          </button>
        </div>
      </div>
    );
  }

  const viz = research.visualizationData;
  const isPublishInProgress = publishStep >= 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      <BlockchainBackground />
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10 flex-grow">
        
        {/* Navigation & Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/research")} className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to AI Engine
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight drop-shadow-md">
                {research.topic}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded-lg shadow-sm">
                  <BarChart3 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  {viz.totalSources} Sources Synthesized
                </span>
                <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded-lg shadow-sm font-mono">
                  {new Date(research.createdAt).toLocaleDateString()}
                </span>
                {research.onChain ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-lg flex items-center gap-2 font-medium shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Hexagon className="w-4 h-4" /> On-Chain #{research.blockchainId}
                  </span>
                ) : (
                  <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-1.5 rounded-lg font-medium">
                    Off-Chain (DB only)
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 flex-shrink-0">
              {!research.onChain && isConnected && (
                <button
                  onClick={handlePublishToBlockchain}
                  disabled={isPublishInProgress || isPublishing || isPublishConfirming}
                  className="bg-emerald-500 text-black px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  {isPublishInProgress || isPublishing || isPublishConfirming ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Link2 className="w-5 h-5" />
                  )}
                  {isPublishInProgress || isPublishing || isPublishConfirming ? "Minting..." : "Mint Report"}
                </button>
              )}
              {!research.onChain && !isConnected && (
                <div className="text-xs text-zinc-500 italic pt-2 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800">
                  Connect wallet to mint
                </div>
              )}
            </div>
          </div>

          {/* Publish progress */}
          {isPublishInProgress && (
            <div className="bg-zinc-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 mb-6 shadow-xl">
              <p className="text-sm text-emerald-400 font-bold mb-2 uppercase tracking-widest">Minting in Progress</p>
              <PublishSteps step={publishStep} />
            </div>
          )}

          {/* Credibility disclaimer */}
          <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-5 flex gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-yellow-500 mr-2">Credibility Notice:</strong> 
              This AI-generated report synthesizes information from multiple decentralized sources. Always verify critical data with original context.
            </div>
          </div>
        </div>

        {/* Content Blocks using unified glassmorphic style */}
        
        {/* Executive Summary */}
        <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
            <FileText className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>
          </div>
          <p className="text-zinc-300 text-lg leading-relaxed whitespace-pre-line font-medium">
            {research.executiveSummary}
          </p>
        </section>

        {/* Key Insights */}
        <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8 border-b border-zinc-800/50 pb-4">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold tracking-tight">Core Synthesis</h2>
          </div>
          <div className="grid gap-4">
            {research.keyInsights.map((insight, idx) => (
              <div key={idx} className="flex gap-5 bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/20 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold font-mono shadow-inner">
                  0{idx + 1}
                </div>
                <p className="text-zinc-300 pt-1.5 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Visualizations Grid */}
        <section className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-100">
              <BarChart3 className="w-5 h-5 text-emerald-400" /> Sentiment Analysis
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={viz.sentimentDistribution} cx="50%" cy="50%"
                  labelLine={false} label={({ sentiment, percentage }) => `${sentiment}: ${percentage}%`}
                  outerRadius={80} dataKey="count" stroke="none"
                >
                  {viz.sentimentDistribution.map((entry, i) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[entry.sentiment] || "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", border: "1px solid #27272a", borderRadius: "12px" }} itemStyle={{ color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-100">
              <Globe className="w-5 h-5 text-emerald-400" /> Platform Spread
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={viz.platformDistribution}>
                <XAxis dataKey="platform" stroke="#52525b" tick={{fill: "#a1a1aa", fontSize: 12}} />
                <YAxis stroke="#52525b" tick={{fill: "#a1a1aa", fontSize: 12}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", border: "1px solid #27272a", borderRadius: "12px" }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-bold mb-6 text-zinc-100">Credibility Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={viz.credibilityDistribution} layout="vertical">
                <XAxis type="number" stroke="#52525b" tick={{fill: "#a1a1aa", fontSize: 12}} />
                <YAxis type="category" dataKey="level" stroke="#52525b" tick={{fill: "#a1a1aa", fontSize: 12}} width={80} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", border: "1px solid #27272a", borderRadius: "12px" }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-bold mb-6 text-zinc-100">Thematic Clusters</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={viz.thematicClusters} outerRadius={80}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="theme" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <PolarRadiusAxis stroke="#3f3f46" tick={false} axisLine={false} />
                <Radar name="Mentions" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", border: "1px solid #27272a", borderRadius: "12px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Comparative Analysis */}
        <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-8 shadow-xl">
          <div className="border-b border-zinc-800/50 pb-4 mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Comparative Deep Dive</h2>
          </div>
          
          <div className="overflow-x-auto mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/50">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/80">
                <tr>
                  {["Source", "Platform", "Argument", "Sentiment", "Credibility"].map((h) => (
                    <th key={h} className="p-4 text-zinc-400 font-bold text-xs uppercase tracking-wider border-b border-zinc-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {research.comparativeAnalysis.comparisonTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4">
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2 text-sm">
                        {row.source?.substring(0, 30)}... <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="p-4 text-zinc-300 text-sm">{row.platform}</td>
                    <td className="p-4 text-zinc-400 text-sm leading-relaxed max-w-xs">{row.mainArgument?.substring(0, 70)}...</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: (SENTIMENT_COLORS[row.sentiment] || "#6b7280") + "15", color: SENTIMENT_COLORS[row.sentiment] || "#6b7280", border: `1px solid ${(SENTIMENT_COLORS[row.sentiment] || "#6b7280")}30` }}>
                        {row.sentiment}
                      </span>
                    </td>
                    <td className="p-4 capitalize text-zinc-300 text-sm font-medium">{row.credibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {research.comparativeAnalysis.insights && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 shadow-inner">
                <h4 className="font-bold text-zinc-200 mb-4 tracking-wide">Identified Patterns</h4>
                <ul className="list-disc list-inside text-zinc-400 space-y-2 text-sm leading-relaxed marker:text-emerald-500">
                  {research.comparativeAnalysis.insights.patterns?.map((p, idx) => <li key={idx}>{p}</li>)}
                </ul>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 shadow-inner">
                <h4 className="font-bold text-zinc-200 mb-4 tracking-wide">Major Agreements</h4>
                <ul className="list-disc list-inside text-zinc-400 space-y-2 text-sm leading-relaxed marker:text-blue-500">
                  {research.comparativeAnalysis.insights.majorAgreements?.map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Consensus vs Contradiction */}
        <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-zinc-800/50 pb-4">
            <MessageSquare className="w-6 h-6 text-emerald-400" /> Consensus & Contradiction
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-emerald-100">Widely Agreed Points</h3>
              </div>
              <ul className="space-y-4">
                {research.consensusVsContradiction.widelyAgreedPoints?.map((p, idx) => (
                  <li key={idx} className="flex gap-3 text-zinc-300 text-sm leading-relaxed">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center gap-2 mb-5">
                <XCircle className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-lg text-orange-100">Debated Views</h3>
              </div>
              <div className="space-y-5">
                {research.consensusVsContradiction.debatedViews?.map((d, idx) => (
                  <div key={idx} className="border-l-2 border-orange-500/30 pl-4">
                    <h4 className="font-bold text-zinc-200 mb-2">{d.topic}</h4>
                    <ul className="text-sm text-zinc-400 space-y-1.5 list-disc list-inside marker:text-orange-500/50">
                      {d.positions?.map((pos, pidx) => <li key={pidx}>{pos}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {research.consensusVsContradiction.minorityPerspectives?.length > 0 && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 shadow-inner">
              <h3 className="font-bold text-lg mb-4 text-purple-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Minority Perspectives
              </h3>
              <ul className="grid sm:grid-cols-2 gap-4 text-zinc-300 text-sm">
                {research.consensusVsContradiction.minorityPerspectives.map((p, idx) => (
                  <li key={idx} className="flex gap-2.5 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                    <span className="text-purple-400 flex-shrink-0 mt-0.5">◆</span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Source Comparison Report */}
        {research.sourceComparisonReport && (
          <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 mb-8 shadow-xl">
            <div className="border-b border-zinc-800/50 pb-4 mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-emerald-400" /> Granular Source Comparison
              </h2>
            </div>
            
            <div className="overflow-x-auto mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/50">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/80">
                  <tr>
                    {["#", "Source", "Platform", "Credibility", "Depth", "Bias", "Uniqueness"].map((h) => (
                      <th key={h} className="p-4 text-zinc-400 font-bold text-xs uppercase tracking-wider border-b border-zinc-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {(research.sourceComparisonReport.sourceRatings || []).map((s) => {
                    const isRec = (research.sourceComparisonReport.recommendedReading || []).includes(s.index);
                    return (
                      <tr key={s.index} className={`hover:bg-zinc-900/50 transition-colors ${isRec ? "bg-emerald-500/5" : ""}`}>
                        <td className="p-4 text-zinc-500 font-mono font-bold">{s.index}</td>
                        <td className="p-4 max-w-[200px]">
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 text-xs leading-snug">
                            <span className="truncate">{s.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {isRec && <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded mt-2 inline-block shadow-sm">Recommended</span>}
                        </td>
                        <td className="p-4 text-zinc-400 capitalize text-xs font-medium">{s.platform}</td>
                        {[{ val: s.credibility, color: "#10b981" }, { val: s.depth, color: "#3b82f6" }].map((bar, i) => (
                          <td key={i} className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full rounded-full" style={{ width: `${bar.val * 10}%`, backgroundColor: bar.color }} />
                              </div>
                              <span className="text-xs text-zinc-300 font-mono font-bold">{bar.val}</span>
                            </div>
                          </td>
                        ))}
                        <td className="p-4">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm border ${
                            s.bias === "Low" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                            s.bias === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          }`}>{s.bias}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${s.uniqueness * 10}%` }} />
                            </div>
                            <span className="text-xs text-zinc-300 font-mono font-bold">{s.uniqueness}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {research.sourceComparisonReport.mostCredibleSource && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 shadow-inner">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrophyIcon className="w-3.5 h-3.5" /> Most Credible
                  </div>
                  <div className="text-white font-bold text-lg mb-2">Source #{research.sourceComparisonReport.mostCredibleSource.index}</div>
                  <div className="text-zinc-400 text-sm leading-relaxed">{research.sourceComparisonReport.mostCredibleSource.reason}</div>
                </div>
              )}
              {research.sourceComparisonReport.mostUniqueSource && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 shadow-inner">
                  <div className="text-[11px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ZapIcon className="w-3.5 h-3.5" /> Most Unique
                  </div>
                  <div className="text-white font-bold text-lg mb-2">Source #{research.sourceComparisonReport.mostUniqueSource.index}</div>
                  <div className="text-zinc-400 text-sm leading-relaxed">{research.sourceComparisonReport.mostUniqueSource.reason}</div>
                </div>
              )}
              {research.sourceComparisonReport.overallVerdict && (
                <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-5 shadow-inner">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Overall Verdict</div>
                  <div className="text-zinc-300 text-sm leading-relaxed">{research.sourceComparisonReport.overallVerdict}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Upvote & Discussion - Minted Only */}
        {research.onChain && (
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            
            {/* Interactive Sidebar / Stats */}
            <div className="lg:col-span-4 order-last lg:order-first space-y-6">
              <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 text-center shadow-xl sticky top-24">
                <div className="flex justify-center gap-8 mb-8">
                  <div>
                    <div className="text-5xl font-black text-white mb-2">{research.upvotes}</div>
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Upvotes</div>
                  </div>
                  <div>
                    <div className="text-5xl font-black text-white mb-2">{research.comments?.length || 0}</div>
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Comments</div>
                  </div>
                </div>
                <button
                  onClick={handleUpvoteResearch}
                  disabled={!isConnected || hasUpvotedResearchLocal || isVoting}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg ${
                    !isConnected || hasUpvotedResearchLocal || isVoting
                      ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                      : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    {isVoting ? "Voting..." : hasUpvotedResearchLocal ? "Upvoted" : "Upvote Report"}
                  </span>
                </button>
              </section>
            </div>

            {/* Comments Thread */}
            <div className="lg:col-span-8">
              <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 md:p-10 shadow-xl">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-zinc-800/50 pb-4">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                  Community Discussion
                </h2>

                {isConnected ? (
                  <form onSubmit={handleComment} className="mb-10 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4 shadow-inner focus-within:border-emerald-500/30 transition-all">
                    <textarea
                      className="w-full bg-transparent p-2 text-white placeholder-zinc-500 focus:outline-none resize-none text-sm leading-relaxed"
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your thoughts on this synthesis..."
                      disabled={isCommenting}
                    />
                    <div className="flex justify-end mt-2 pt-2 border-t border-zinc-800/50">
                      <button
                        type="submit"
                        disabled={isCommenting || !commentText.trim()}
                        className="bg-emerald-500 text-black px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        {isCommenting ? "Posting..." : "Comment"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-zinc-950/50 p-8 text-center border border-zinc-800/80 rounded-2xl mb-10 shadow-inner">
                    <p className="text-zinc-400 text-sm font-medium">Connect your wallet to join the discussion.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {research.comments?.length > 0 ? (
                    research.comments.map((c) => renderComment(c))
                  ) : (
                    <p className="text-zinc-600 italic text-center py-8">No comments yet. Be the first!</p>
                  )}
                </div>
              </section>
            </div>

          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}

// Simple internal icon components for layout
function TrophyIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}
function ZapIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
