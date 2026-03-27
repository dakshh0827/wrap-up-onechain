import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Section } from "../components/Layout";
import { Button, Card, Badge } from "../components/ui";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import axios from "axios";
import toast from "react-hot-toast";

// --- OneChain / Sui Imports ---
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction, 
  useSuiClient 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, CLOCK_ID } from "../constants";

import {
  Scale, Link2, Loader, Trophy, Shield, Zap, Globe,
  Star, CheckCircle, TrendingUp, BookOpen,
  ArrowRight, Hexagon, Circle,
} from "lucide-react";
import { useArticleStore } from "../stores/articleStore";

const API_BASE = 'https://wrap-up-onechain.onrender.com/api';

const DIMENSION_META = {
  credibility:    { label: "Credibility",    icon: Shield,      color: "#10b981" },
  depth:          { label: "Depth",          icon: BookOpen,    color: "#3b82f6" },
  bias:           { label: "Bias Level",     icon: Scale,       color: "#f59e0b" },
  truthiness:     { label: "Truthiness",     icon: CheckCircle, color: "#10b981" },
  impact:         { label: "Impact",         icon: TrendingUp,  color: "#8b5cf6" },
  writingQuality: { label: "Writing Quality", icon: Star,        color: "#f59e0b" },
  publicPresence: { label: "Public Presence", icon: Globe,       color: "#3b82f6" },
  originality:    { label: "Originality",    icon: Zap,         color: "#8b5cf6" },
};

function ScoreBar({ score, color, size = "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`w-full bg-zinc-800/50 rounded-full overflow-hidden ${h}`}>
      <div
        className={`${h} rounded-full transition-all duration-700`}
        style={{ width: `${score * 10}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ArticleCard({ meta, label, accent }) {
  if (!meta) return null;
  return (
    <div className="flex-1 p-5 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm transition-all hover:border-opacity-60 shadow-lg" style={{ borderColor: accent + "40" }}>
      <div 
        className="text-xs font-bold uppercase tracking-wider mb-4 px-3 py-1.5 rounded-lg inline-block"
        style={{ backgroundColor: accent + "15", color: accent }}
      >
        {label}
      </div>
      {meta.image && (
        <img 
          src={meta.image} 
          alt={meta.title} 
          className="w-full h-36 object-cover rounded-xl mb-4 opacity-90 transition-opacity hover:opacity-100"
          onError={(e) => (e.target.style.display = "none")} 
        />
      )}
      <h3 className="font-bold text-white text-lg leading-snug mb-3 line-clamp-2">{meta.title}</h3>
      <div className="text-xs text-zinc-400 space-y-2 font-medium">
        {meta.publisher && <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> {meta.publisher}</div>}
        {meta.author && <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5" /> {meta.author}</div>}
        {meta.date && <div className="flex items-center gap-2"><Hexagon className="w-3.5 h-3.5" /> {new Date(meta.date).toLocaleDateString()}</div>}
      </div>
      {meta.description && (
        <p className="text-zinc-500 text-sm mt-4 line-clamp-3 leading-relaxed">{meta.description}</p>
      )}
    </div>
  );
}

export default function ComparatorPage() {
  const [urlOne, setUrlOne] = useState("");
  const [urlTwo, setUrlTwo] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);

  const [publishStep, setPublishStep] = useState(-1);
  const [publishIpfsHash, setPublishIpfsHash] = useState(null);
  const [savedComparison, setSavedComparison] = useState(null);

  const { deleteComparisonFromDB } = useArticleStore();

  // --- OneChain Hooks ---
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!urlOne.trim() || !urlTwo.trim()) { toast.error("Please enter both article URLs"); return; }
    try { new URL(urlOne); new URL(urlTwo); } catch { toast.error("Invalid URL format"); return; }
    if (urlOne === urlTwo) { toast.error("Please enter two different URLs"); return; }

    setLoading(true);
    setComparison(null);
    setSavedComparison(null);
    setPublishStep(-1);
    setPublishIpfsHash(null);

    const tid = toast.loading("Scraping & analyzing articles...");
    try {
      const res = await axios.post(`${API_BASE}/comparisons/generate`, {
        urlOne: urlOne.trim(),
        urlTwo: urlTwo.trim(),
      });
      
      setComparison(res.data.comparison);
      toast.success(res.data.cached ? "Loaded cached comparison!" : "Analysis complete! Ready to curate.", { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.error || "Comparison failed", { id: tid });
    } finally {
      setLoading(false);
    }
  };

  const handleCurate = async () => {
    if (!account) { toast.error("Connect wallet to publish"); return; }
    if (!comparison) return;

    setPublishStep(0);
    const tid = toast.loading("Publishing comparison on-chain...");

    try {
      // 1. Database Prep
      const res = await axios.post(`${API_BASE}/comparisons/generate`, { action: 'prepare', comparisonData: comparison });
      const dbComp = res.data.comparison;
      setSavedComparison(dbComp);
      setPublishStep(1);

      // 2. IPFS Upload
      toast.loading("Uploading to IPFS...", { id: tid });
      const ipfsRes = await axios.post(`${API_BASE}/comparisons/upload-ipfs`, { comparisonId: dbComp.id });
      const { ipfsHash } = ipfsRes.data;
      if (!ipfsHash) throw new Error("IPFS upload failed");
      setPublishIpfsHash(ipfsHash);
      setPublishStep(2);

      // 3. OneChain Transaction Building
      toast.loading("Querying OneChain Profile...", { id: tid });
      
      // Fetch the user's UserProfile object from their wallet
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE_ID}::platform::UserProfile` },
      });

      if (ownedObjects.data.length === 0) {
        throw new Error("You must register a UserProfile on OneChain first!");
      }

      const userProfileId = ownedObjects.data[0].data.objectId;

      toast.loading("Sign transaction in OneWallet...", { id: tid });

      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::platform::submit_ai_research`,
        arguments: [
          tx.object(userProfileId),
          tx.pure.string(ipfsHash),
          tx.object(CLOCK_ID)
        ],
      });

      // Execute the transaction
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            setPublishStep(3);
            toast.loading("Finalizing Database Sync...", { id: tid });
            
            try {
              // Note: Using the transaction digest (hash) as the blockchainId for DB syncing
              await axios.post(`${API_BASE}/comparisons/mark-onchain`, {
                comparisonId: dbComp.id,
                blockchainId: result.digest, 
                curator: account.address,
                ipfsHash: ipfsHash,
              });
              
              toast.success("Comparison published to OneChain!", { id: tid });
              setComparison((prev) => ({ 
                ...prev, 
                onChain: true, 
                blockchainId: result.digest, 
                ipfsHash: ipfsHash 
              }));
              setPublishStep(-1);
            } catch (syncErr) {
              toast.error("DB sync failed: " + syncErr.message, { id: tid });
              setPublishStep(-1);
            }
          },
          onError: (txErr) => {
            toast.error(txErr.message || "Transaction failed", { id: tid });
            if (dbComp?.id) deleteComparisonFromDB(dbComp.id);
            setPublishStep(-1);
          }
        }
      );

    } catch (err) {
      toast.error(err.message || "Publish failed", { id: tid });
      if (savedComparison?.id) {
        deleteComparisonFromDB(savedComparison.id);
        setSavedComparison(null);
      }
      setPublishStep(-1);
    }
  };

  const report = comparison?.report;
  const isPublishInProgress = publishStep >= 0;
  const isFullyRevealed = comparison?.onChain || publishStep === 3;

  const features = [
    { icon: Link2, title: "Paste URLs", desc: "Drop any two article links — news, blogs, research papers." },
    { icon: Scale, title: "AI Analysis", desc: "AI scrapes and scores across 8 critical dimensions." },
    { icon: Hexagon, title: "Mint Report", desc: "Store comparison permanently on-chain via IPFS." },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      <BlockchainBackground />
      <Navbar />

      <main className="flex-grow relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Section className="py-16">
            
            {/* Hero */}
            <div className="text-center mb-16 animate-fade-in">
              <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Scale className="w-3.5 h-3.5 mr-1.5 inline-block" />
                AI Article Comparator
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                Compare Any Two{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                  Articles.
                </span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Paste two URLs. AI scrapes and evaluates across 8 dimensions. Mint securely to OneChain to view the full deep-dive consensus.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleCompare} className="mb-16 relative z-10">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {[
                  { val: urlOne, set: setUrlOne, label: "Article 1", accent: "#10b981", placeholder: "https://techcrunch.com/..." },
                  { val: urlTwo, set: setUrlTwo, label: "Article 2", accent: "#3b82f6", placeholder: "https://theverge.com/..." },
                ].map(({ val, set, label, accent, placeholder }) => (
                  <div key={label} className="relative group">
                    <div 
                      className="absolute top-0 left-0 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-tl-2xl rounded-br-2xl z-10" 
                      style={{ backgroundColor: accent + "20", color: accent }}
                    >
                      {label}
                    </div>
                    <div 
                      className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl pt-10 pb-5 px-5 transition-all duration-300 group-focus-within:shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                      style={{ borderColor: val ? accent + "50" : undefined }}
                    >
                      <input 
                        type="url" 
                        value={val} 
                        onChange={(e) => set(e.target.value)} 
                        placeholder={placeholder} 
                        className="w-full bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm md:text-base" 
                        disabled={loading} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || !urlOne.trim() || !urlTwo.trim()}
                  size="lg"
                  className="px-10 py-4 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" /> 
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Scale className="w-5 h-5 mr-2" /> 
                      Compare Articles 
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Comparison Results Area */}
            {comparison && report && (
              <div className="space-y-10 animate-fade-in">
                {/* Article Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                  <ArticleCard meta={comparison.articleOneMeta} label="Article 1" accent="#10b981" />
                  <ArticleCard meta={comparison.articleTwoMeta} label="Article 2" accent="#3b82f6" />
                </div>

                {/* Overall Scores Preview */}
                <Card variant="elevated" className="p-8 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                    <Trophy className="w-5 h-5 text-emerald-400" /> Overall Scores (Preview)
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { label: "Article 1", pct: report.overallScores?.article1Percentage || 0, accent: "#10b981", isWinner: report.verdict?.winner === "article1" },
                      { label: "Article 2", pct: report.overallScores?.article2Percentage || 0, accent: "#3b82f6", isWinner: report.verdict?.winner === "article2" },
                    ].map((item) => (
                      <div 
                        key={item.label} 
                        className={`relative p-6 rounded-2xl border bg-zinc-950/50 transition-all ${item.isWinner ? "border-opacity-80 shadow-lg" : "border-zinc-800"}`} 
                        style={{ borderColor: item.isWinner ? item.accent : undefined }}
                      >
                        {item.isWinner && (
                          <div 
                            className="absolute -top-3 left-6 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md" 
                            style={{ backgroundColor: item.accent, color: "#000" }}
                          >
                            Winner
                          </div>
                        )}
                        <div className="flex items-end justify-between mb-4">
                          <span className="font-bold text-zinc-300">{item.label}</span>
                          <span className="text-4xl font-black" style={{ color: item.accent }}>{item.pct}%</span>
                        </div>
                        <ScoreBar score={item.pct / 10} color={item.accent} />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Unified Curation/Preview Card */}
                {!isFullyRevealed && (
                  <Card className="max-w-4xl mx-auto overflow-hidden animate-fade-in border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
                          Analysis Ready to Curate
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-8 text-center">
                      <p className="text-zinc-400 mb-8 max-w-xl mx-auto leading-relaxed">
                        We've successfully scored these articles. Click "Curate & Mint" to permanently log these findings on the OneChain network and unlock the comprehensive deep-dive report.
                      </p>

                      {/* Unified Status Tracking */}
                      <div className="space-y-3 mb-8 max-w-2xl mx-auto text-left">
                        {[
                          { label: "Database Sync", done: publishStep > 0, active: publishStep === 0 },
                          { label: "IPFS Pinning", done: publishStep > 1, active: publishStep === 1 },
                          { label: "OneChain Mint", done: publishStep === 3, active: publishStep === 2 },
                        ].map((row, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-5 py-3.5 rounded-xl border text-sm transition-all ${
                              row.done ? "border-emerald-500/30 bg-emerald-500/5" :
                              row.active ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]" :
                              "border-zinc-800/60 bg-zinc-950/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {row.done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                               row.active ? <Loader className="w-4 h-4 text-emerald-400 animate-spin" /> :
                               <Circle className="w-4 h-4 text-zinc-600" />}
                              <span className={row.done ? "text-emerald-400 font-medium" : row.active ? "text-white font-medium" : "text-zinc-500"}>
                                {row.label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={handleCurate}
                        disabled={!account || isPublishInProgress}
                        size="lg"
                        className="px-10 py-4 shadow-lg shadow-emerald-500/20"
                      >
                        {isPublishInProgress ? (
                          <><Loader className="w-5 h-5 animate-spin mr-2" /> Minting Process...</>
                        ) : (
                          <><Link2 className="w-5 h-5 mr-2" /> Curate & Mint Report</>
                        )}
                      </Button>
                      {!account && <p className="text-xs text-zinc-500 mt-4">Connect OneWallet to unlock details</p>}
                    </div>
                  </Card>
                )}

                {/* Full Details Revealed - Minted */}
                {isFullyRevealed && (
                  <div className="space-y-8 animate-fade-in">
                    <Card className="p-8 border border-emerald-500/20 bg-zinc-900/40 backdrop-blur-md">
                      <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Final Verdict</div>
                      <p className="text-white font-medium text-lg mb-3">{report.verdict.shortVerdict}</p>
                      <p className="text-zinc-400 text-sm leading-relaxed">{report.verdict.fullVerdict}</p>
                    </Card>
                    
                    <Card variant="success" className="p-6 bg-emerald-500/5 border border-emerald-500/30 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-emerald-400 mb-1 flex items-center gap-2">
                            <Hexagon className="w-4 h-4" /> Published On-Chain
                          </h3>
                          <p className="text-zinc-400 text-sm">
                            Tx Digest: {comparison.blockchainId?.substring(0, 16)}... | IPFS: {comparison.ipfsHash?.substring(0, 20)}...
                          </p>
                        </div>
                        <div className="bg-emerald-500/20 px-4 py-2 rounded-xl font-bold text-emerald-400 text-sm shadow-inner">
                          ✓ Curated
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Default State Feature Grid */}
            {!comparison && !loading && (
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {features.map((step, i) => (
                  <Card key={i} className="p-8 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 hover:border-emerald-500/30 transition-all group hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                    <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center mb-5 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors">
                      <step.icon className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <h3 className="font-bold text-white mb-2 text-lg">{step.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
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
