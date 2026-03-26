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
import toast from "react-hot-toast";
import { useArticleStore } from "../stores/articleStore";

// --- ONECHAIN (SUI) IMPORTS ---
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { PACKAGE_ID, CLOCK_ID } from "../constants"; 

import {
  Download, ExternalLink, AlertCircle, TrendingUp, MessageSquare,
  BarChart3, Globe, CheckCircle, XCircle, ChevronDown, ChevronUp,
  FileText, ThumbsUp, Hexagon, Link2, Loader, Circle, ArrowLeft
} from "lucide-react";

const SENTIMENT_COLORS = {
  Positive: "#10b981",
  Negative: "#ef4444",
  Neutral: "#6b7280",
  Balanced: "#8b5cf6",
};

function PublishSteps({ step }) {
  const steps = ["Verify Profile", "Upload IPFS", "Sign Tx", "Confirmed"];
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
  const [commentText, setCommentText] = useState("");
  const [hasUpvotedResearchLocal, setHasUpvotedResearchLocal] = useState(false);
  const [publishStep, setPublishStep] = useState(-1);

  // --- ONECHAIN SETUP ---
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const isConnected = !!account;
  const address = account?.address;

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


  // ==========================================
  // ONECHAIN: MINT AI REPORT TRANSACTION
  // ==========================================
  const handlePublishToBlockchain = async () => {
    if (!isConnected) { toast.error("Please connect your OneWallet"); return; }
    if (research.onChain) { toast.error("Already published on OneChain"); return; }

    const tid = toast.loading("Verifying OneChain Profile...");
    setPublishStep(0);

    try {
      // 1. Fetch User Profile Object from Wallet
      const objects = await suiClient.getOwnedObjects({
        owner: address,
        filter: { StructType: `${PACKAGE_ID}::platform::UserProfile` },
      });

      if (objects.data.length === 0) {
        throw new Error("No User Profile found. Please click 'Create Profile' in the Navbar first!");
      }
      const userProfileId = objects.data[0].data.objectId;

      // 2. Upload to IPFS
      setPublishStep(1);
      toast.loading("Uploading AI Synthesis to IPFS...", { id: tid });
      const hash = await uploadResearchToIPFS(research.id);
      if (!hash) throw new Error("IPFS upload returned no hash");

      // 3. Build & Sign Move Transaction
      setPublishStep(2);
      toast.loading("Please sign the transaction in OneWallet...", { id: tid });
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::platform::submit_ai_research`,
        arguments: [
          tx.object(userProfileId),
          tx.pure.string(hash),
          tx.object(CLOCK_ID)
        ],
      });

      const response = await signAndExecuteTransaction({ transaction: tx });

      toast.loading("Confirming on OneChain...", { id: tid });
      const receipt = await suiClient.waitForTransaction({ 
        digest: response.digest, 
        options: { showEvents: true } 
      });

      // 4. Finalize DB Sync
      setPublishStep(3);
      toast.loading("Finalizing Database...", { id: tid });
      
      // Extract the new ResearchReport Object ID from the emitted event
      const event = receipt.events?.find(e => e.type.includes('ReportSubmittedEvent'));
      const blockchainId = event?.parsedJson?.report_id || response.digest;

      await markResearchOnChainDB(research.id, blockchainId, address, hash);
      
      toast.success("AI Research Minted on OneChain!", { id: tid });
      setPublishStep(-1);
      fetchResearch();

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Minting failed", { id: tid });
      setPublishStep(-1);
      if (research?.id && publishStep < 2) {
        deleteResearchFromDB(research.id);
        toast.error("Process aborted. Report deleted for consistency.");
        navigate('/'); 
      }
    }
  };

  // ==========================================
  // OFF-CHAIN SOCIAL FEATURES (Hackathon MVP)
  // ==========================================
  const handleUpvoteResearch = async () => {
    if (!isConnected) { toast.error("Please connect wallet"); return; }
    if (hasUpvotedResearchLocal) { toast.error("Already upvoted"); return; }

    const toastId = toast.loading("Processing upvote...");
    setResearch((prev) => ({ ...prev, upvotes: prev.upvotes + 1 }));
    setHasUpvotedResearchLocal(true);

    try {
      await syncResearchUpvotesDB(research.id, research.upvotes + 1);
      toast.success("Vote recorded!", { id: toastId });
    } catch (err) {
      toast.error("Failed to upvote", { id: toastId });
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isConnected) { toast.error("Please connect wallet"); return; }

    const toastId = toast.loading("Posting comment...");
    try {
      // Create comment in DB
      const { commentMongoId } = await prepareResearchCommentForChain({
        researchId: research.id,
        content: commentText.trim(),
        author: address,
        authorName: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      });

      // Bypass blockchain step for MVP demo, mark directly in DB
      await markResearchCommentOnChainDB(commentMongoId, "off-chain-demo", "ipfs-hash-placeholder");

      setCommentText("");
      toast.success("Comment posted!", { id: toastId });
      fetchResearch();
    } catch (err) {
      toast.error(err.message || "Failed to post comment", { id: toastId });
    }
  };

  const renderComment = (comment, isReply = false) => {
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
        </div>
        <p className="text-zinc-300 mb-3 leading-relaxed text-sm">{comment.content}</p>
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
                    <Hexagon className="w-4 h-4" /> OneChain #{research.blockchainId.substring(0,8)}...
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
                  disabled={isPublishInProgress}
                  className="bg-emerald-500 text-black px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  {isPublishInProgress ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Link2 className="w-5 h-5" />
                  )}
                  {isPublishInProgress ? "Minting..." : "Mint Report"}
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

        {/* Content Blocks */}
        
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
        </section>

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
                  disabled={!isConnected || hasUpvotedResearchLocal}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg ${
                    !isConnected || hasUpvotedResearchLocal
                      ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                      : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    {hasUpvotedResearchLocal ? "Upvoted" : "Upvote Report"}
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
                    />
                    <div className="flex justify-end mt-2 pt-2 border-t border-zinc-800/50">
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="bg-emerald-500 text-black px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                         Comment
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-zinc-950/50 p-8 text-center border border-zinc-800/80 rounded-2xl mb-10 shadow-inner">
                    <p className="text-zinc-400 text-sm font-medium">Connect your OneWallet to join the discussion.</p>
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