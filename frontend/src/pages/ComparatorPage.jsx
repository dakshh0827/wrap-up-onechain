import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import toast from "react-hot-toast";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { WRAPUP_ABI, CONTRACT_ADDRESSES } from "../wagmiConfig";
import { decodeEventLog } from "viem";
import {
  Scale, Link2, Loader, ExternalLink, Trophy, Shield, Zap, Globe,
  Star, AlertCircle, CheckCircle, XCircle, TrendingUp, BookOpen,
  ArrowRight, Hexagon, BarChart3, Circle,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const DIMENSION_META = {
  credibility:    { label: "Credibility",     icon: Shield,      color: "#10b981" },
  depth:          { label: "Depth",            icon: BookOpen,    color: "#3b82f6" },
  bias:           { label: "Bias Level",       icon: Scale,       color: "#f59e0b" },
  truthiness:     { label: "Truthiness",       icon: CheckCircle, color: "#10b981" },
  impact:         { label: "Impact",           icon: TrendingUp,  color: "#8b5cf6" },
  writingQuality: { label: "Writing Quality", icon: Star,        color: "#f59e0b" },
  publicPresence: { label: "Public Presence", icon: Globe,       color: "#3b82f6" },
  originality:    { label: "Originality",     icon: Zap,         color: "#8b5cf6" },
};

function ScoreBar({ score, color, size = "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`w-full bg-[#27272a] rounded-full overflow-hidden ${h}`}>
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
    <div className="bg-[#18181b] border rounded-xl p-5 flex-1" style={{ borderColor: accent + "50" }}>
      <div className="text-xs font-bold uppercase tracking-wider mb-3 px-2 py-1 rounded inline-block"
        style={{ backgroundColor: accent + "20", color: accent }}>
        {label}
      </div>
      {meta.image && (
        <img src={meta.image} alt={meta.title} className="w-full h-32 object-cover rounded-lg mb-3 opacity-80"
          onError={(e) => (e.target.style.display = "none")} />
      )}
      <h3 className="font-bold text-white text-base leading-snug mb-2 line-clamp-2">{meta.title}</h3>
      <div className="text-xs text-zinc-500 space-y-1">
        {meta.publisher && <div>📰 {meta.publisher}</div>}
        {meta.author && <div>✍️ {meta.author}</div>}
        {meta.date && <div>📅 {new Date(meta.date).toLocaleDateString()}</div>}
      </div>
      {meta.description && (
        <p className="text-zinc-400 text-xs mt-3 line-clamp-3 leading-relaxed">{meta.description}</p>
      )}
    </div>
  );
}

// Publish step indicator
function PublishSteps({ step }) {
  const steps = ["Save to DB", "Upload IPFS", "Sign Tx", "Confirmed"];
  return (
    <div className="flex items-center gap-2 mt-2">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1">
            {i < step ? (
              <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
            ) : i === step ? (
              <Loader className="w-3.5 h-3.5 text-[#10b981] animate-spin" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span className={`text-[10px] font-medium ${i < step ? "text-[#10b981]" : i === step ? "text-white" : "text-zinc-600"}`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 h-px ${i < step ? "bg-[#10b981]" : "bg-[#27272a]"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ComparatorPage() {
  const [urlOne, setUrlOne] = useState("");
  const [urlTwo, setUrlTwo] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);

  // Publish flow state
  const [publishStep, setPublishStep] = useState(-1);
  const [publishIpfsHash, setPublishIpfsHash] = useState(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const currentContractAddress =
    CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[421614];

  const {
    data: publishHash,
    isPending: isPublishing,
    writeContract: writePublish,
    error: publishWriteError,
    isError: isPublishWriteError,
  } = useWriteContract();

  const {
    isLoading: isPublishConfirming,
    isSuccess: isPublishConfirmed,
    isError: isPublishTxError,
    error: publishTxError,
    data: publishReceipt,
  } = useWaitForTransactionReceipt({ hash: publishHash });

  // ── Generate comparison ─────────────────────────────────────────────────
  const handleCompare = async (e) => {
    e.preventDefault();
    if (!urlOne.trim() || !urlTwo.trim()) {
      toast.error("Please enter both article URLs");
      return;
    }
    try {
      new URL(urlOne);
      new URL(urlTwo);
    } catch {
      toast.error("Invalid URL format");
      return;
    }
    if (urlOne === urlTwo) {
      toast.error("Please enter two different URLs");
      return;
    }

    setLoading(true);
    setComparison(null);
    setPublishStep(-1);
    setPublishIpfsHash(null);

    const tid = toast.loading("🔬 Scraping & analyzing articles...");
    try {
      const res = await axios.post(`${API_BASE}/comparisons/generate`, {
        urlOne: urlOne.trim(),
        urlTwo: urlTwo.trim(),
      });
      // Comparison is automatically saved to DB inside the backend handler
      setComparison(res.data.comparison);
      toast.success(
        res.data.cached ? "Loaded cached comparison!" : "Comparison complete — saved to database!",
        { id: tid }
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Comparison failed", { id: tid });
    } finally {
      setLoading(false);
    }
  };

  // ── Publish on-chain: DB already saved → IPFS → chain ──────────────────
  const handlePublishOnChain = async () => {
    if (!isConnected) { toast.error("Connect wallet to publish"); return; }
    if (!comparison) return;
    if (comparison.onChain) { toast.error("Already on-chain"); return; }

    setPublishStep(0);
    const tid = toast.loading("Publishing comparison on-chain...");

    try {
      // Step 0: DB record already created by handleCompare — mark done instantly
      await new Promise((r) => setTimeout(r, 300));
      setPublishStep(1);

      // Step 1: Upload to IPFS
      toast.loading("Uploading to IPFS...", { id: tid });
      const ipfsRes = await axios.post(`${API_BASE}/comparisons/upload-ipfs`, {
        comparisonId: comparison.id,
      });
      const { ipfsHash } = ipfsRes.data;
      if (!ipfsHash) throw new Error("IPFS upload failed");
      setPublishIpfsHash(ipfsHash);
      setPublishStep(2);

      // Step 2: Submit to blockchain
      toast.loading("Sign transaction in wallet...", { id: tid });

      const doWrite = () => {
        writePublish({
          address: currentContractAddress,
          abi: WRAPUP_ABI,
          functionName: "submitArticle",
          args: [ipfsHash],
        });
      };

      if (!CONTRACT_ADDRESSES[chainId]) {
        switchChain(
          { chainId: 421614 },
          {
            onSuccess: () =>
              writePublish({
                address: CONTRACT_ADDRESSES[421614],
                abi: WRAPUP_ABI,
                functionName: "submitArticle",
                args: [ipfsHash],
              }),
            onError: () => {
              toast.error("Network switch failed", { id: tid });
              setPublishStep(-1);
            },
          }
        );
      } else {
        doWrite();
      }
    } catch (err) {
      toast.error(err.message || "Publish failed", { id: tid });
      setPublishStep(-1);
    }
  };

  // Handle publish tx result
  useEffect(() => {
    if (isPublishing) {
      toast.loading("Waiting for wallet...", { id: "compPubToast" });
    }

    if (isPublishConfirming) {
      setPublishStep(2);
      toast.loading("Confirming on blockchain...", { id: "compPubToast" });
    }

    if (isPublishConfirmed && publishReceipt && comparison && publishIpfsHash) {
      setPublishStep(3);
      let blockchainId = null;
      try {
        for (const log of publishReceipt.logs) {
          const event = decodeEventLog({
            abi: WRAPUP_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "ArticleSubmitted") {
            blockchainId = event.args.articleId.toString();
            break;
          }
        }
      } catch {}

      if (blockchainId && address) {
        toast.loading("Finalizing...", { id: "compPubToast" });
        axios
          .post(`${API_BASE}/comparisons/mark-onchain`, {
            comparisonId: comparison.id,
            blockchainId,
            curator: address,
            ipfsHash: publishIpfsHash,
          })
          .then(() => {
            toast.success("Comparison published on-chain!", { id: "compPubToast" });
            setComparison((prev) => ({
              ...prev,
              onChain: true,
              blockchainId: parseInt(blockchainId),
              ipfsHash: publishIpfsHash,
            }));
            setPublishStep(-1);
          })
          .catch((err) => {
            toast.error("DB sync failed: " + err.message, { id: "compPubToast" });
            setPublishStep(-1);
          });
      } else {
        toast.success("Published on-chain!", { id: "compPubToast" });
        setPublishStep(-1);
      }
    }

    if (isPublishTxError) {
      toast.error(publishTxError?.shortMessage || "Transaction failed", { id: "compPubToast" });
      setPublishStep(-1);
    }

    if (isPublishWriteError) {
      toast.error(publishWriteError?.shortMessage || "Wallet rejected", { id: "compPubToast" });
      setPublishStep(-1);
    }
  }, [
    isPublishing, isPublishConfirming, isPublishConfirmed,
    isPublishTxError, isPublishWriteError, publishReceipt,
  ]);

  const report = comparison?.report;
  const dims = report?.dimensions ? Object.entries(report.dimensions) : [];

  const wins = { article1: 0, article2: 0 };
  dims.forEach(([, d]) => {
    if (d.winner === "article1") wins.article1++;
    else if (d.winner === "article2") wins.article2++;
  });

  const isPublishInProgress = publishStep >= 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' fill='none'/%3E%3C/svg%3E")`,
        }}
      />

      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#10b981]/10 border border-[#10b981]/30 px-4 py-1.5 rounded-full mb-6">
            <Scale className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">
              AI Article Comparator
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Compare Any Two <span className="text-[#10b981]">Articles.</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Paste two URLs. AI scores each article across 8 dimensions — results saved to DB
            automatically, then optionally minted on-chain.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleCompare} className="mb-12">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[
              { val: urlOne, set: setUrlOne, label: "Article 1", accent: "#10b981", placeholder: "https://techcrunch.com/..." },
              { val: urlTwo, set: setUrlTwo, label: "Article 2", accent: "#3b82f6", placeholder: "https://theverge.com/..." },
            ].map(({ val, set, label, accent, placeholder }) => (
              <div key={label} className="relative">
                <div className="absolute top-0 left-0 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-tl-xl rounded-br-xl"
                  style={{ backgroundColor: accent + "20", color: accent }}>
                  {label}
                </div>
                <div className="bg-[#121214] border rounded-xl pt-8 pb-3 px-4 focus-within:border-opacity-80 transition-all"
                  style={{ borderColor: accent + "40" }}>
                  <input
                    type="url"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading || !urlOne.trim() || !urlTwo.trim()}
              className="bg-[#10b981] hover:bg-[#059669] text-black px-10 py-4 rounded-xl font-bold uppercase tracking-wide flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Scale className="w-5 h-5" /> Compare Articles <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {comparison && report && (
          <div className="space-y-8">
            {/* Article cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <ArticleCard meta={comparison.articleOneMeta} label="Article 1" accent="#10b981" />
              <ArticleCard meta={comparison.articleTwoMeta} label="Article 2" accent="#3b82f6" />
            </div>

            {/* Overall scores */}
            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#10b981]" /> Overall Scores
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { label: "Article 1", pct: report.overallScores?.article1Percentage || 0, total: report.overallScores?.article1Total || 0, accent: "#10b981", wins: wins.article1, isWinner: report.verdict?.winner === "article1" },
                  { label: "Article 2", pct: report.overallScores?.article2Percentage || 0, total: report.overallScores?.article2Total || 0, accent: "#3b82f6", wins: wins.article2, isWinner: report.verdict?.winner === "article2" },
                ].map((item) => (
                  <div key={item.label} className={`relative p-5 rounded-lg border ${item.isWinner ? "border-opacity-60" : "border-[#27272a]"} bg-[#18181b]`}
                    style={{ borderColor: item.isWinner ? item.accent : undefined }}>
                    {item.isWinner && (
                      <div className="absolute -top-3 left-4 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest"
                        style={{ backgroundColor: item.accent, color: "#000" }}>
                        🏆 Winner
                      </div>
                    )}
                    <div className="flex items-end justify-between mb-3">
                      <span className="font-bold text-white">{item.label}</span>
                      <span className="text-3xl font-bold" style={{ color: item.accent }}>{item.pct}%</span>
                    </div>
                    <ScoreBar score={item.pct / 10} color={item.accent} />
                    <div className="flex justify-between mt-2 text-xs text-zinc-500">
                      <span>Score: {item.total}/80</span>
                      <span>{item.wins} dimension{item.wins !== 1 ? "s" : ""} won</span>
                    </div>
                  </div>
                ))}
              </div>

              {report.verdict && (
                <div className="mt-6 bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Verdict</div>
                  <p className="text-white font-medium mb-2">{report.verdict.shortVerdict}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{report.verdict.fullVerdict}</p>
                  {report.verdict.recommendation && (
                    <div className="mt-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded px-4 py-2 text-sm text-[#10b981]">
                      💡 {report.verdict.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dimension breakdown */}
            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#10b981]" /> Dimension Breakdown
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {dims.map(([key, dim]) => {
                  const meta = DIMENSION_META[key] || { label: key, color: "#6b7280" };
                  const Icon = meta.icon || Star;
                  return (
                    <div key={key} className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                          <span className="font-bold text-white text-sm">{meta.label}</span>
                        </div>
                        {dim.winner && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                            style={{ backgroundColor: (dim.winner === "article1" ? "#10b981" : "#3b82f6") + "20", color: dim.winner === "article1" ? "#10b981" : "#3b82f6" }}>
                            {dim.winner === "article1" ? "A1 Wins" : "A2 Wins"}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Article 1", score: dim.article1Score, analysis: dim.article1Analysis, accent: "#10b981" },
                          { label: "Article 2", score: dim.article2Score, analysis: dim.article2Analysis, accent: "#3b82f6" },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-zinc-500">{item.label}</span>
                              <span className="text-xs font-mono font-bold" style={{ color: item.accent }}>{item.score}/10</span>
                            </div>
                            <ScoreBar score={item.score} color={item.accent} size="sm" />
                            {item.analysis && <p className="text-zinc-500 text-xs mt-1 leading-relaxed line-clamp-2">{item.analysis}</p>}
                          </div>
                        ))}
                      </div>
                      {dim.explanation && (
                        <div className="mt-3 pt-3 border-t border-[#27272a] text-xs text-zinc-400">{dim.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agreements & Disagreements */}
            <div className="grid md:grid-cols-2 gap-6">
              {report.agreements?.length > 0 && (
                <div className="bg-[#121214] border border-[#10b981]/30 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981]" /> Agreements
                  </h3>
                  <ul className="space-y-2">
                    {report.agreements.map((a, i) => (
                      <li key={i} className="text-zinc-300 text-sm flex gap-2">
                        <span className="text-[#10b981] flex-shrink-0">✓</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.disagreements?.length > 0 && (
                <div className="bg-[#121214] border border-orange-500/30 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-orange-500" /> Disagreements
                  </h3>
                  <div className="space-y-4">
                    {report.disagreements.map((d, i) => (
                      <div key={i} className="border-l-2 border-orange-500/40 pl-3">
                        <div className="font-medium text-white text-sm mb-1">{d.topic}</div>
                        <div className="text-xs text-zinc-400 space-y-0.5">
                          <div><span className="text-[#10b981]">A1:</span> {d.article1Position}</div>
                          <div><span className="text-[#3b82f6]">A2:</span> {d.article2Position}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key differences */}
            {report.keyDifferences?.length > 0 && (
              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4">Key Differences</h3>
                <ul className="grid md:grid-cols-2 gap-3">
                  {report.keyDifferences.map((d, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300 bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                      <span className="text-[#10b981] font-mono font-bold flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fact check notes */}
            {report.factCheckNotes?.length > 0 && (
              <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="w-5 h-5" /> Fact-Check Notes
                </h3>
                <ul className="space-y-2">
                  {report.factCheckNotes.map((n, i) => (
                    <li key={i} className="text-zinc-300 text-sm flex gap-2">
                      <span className="text-yellow-400 flex-shrink-0">⚠</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source links */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { url: comparison.articleOneUrl, label: "Article 1", accent: "#10b981" },
                { url: comparison.articleTwoUrl, label: "Article 2", accent: "#3b82f6" },
              ].map(({ url, label, accent }) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between bg-[#18181b] border border-[#27272a] hover:border-opacity-70 rounded-lg p-4 transition-all group">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>{label} — Original</div>
                    <div className="text-zinc-400 text-xs truncate max-w-xs">{url}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>

            {/* On-chain publishing panel */}
            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                    <Hexagon className="w-4 h-4 text-[#10b981]" />
                    {comparison.onChain ? "Published On-Chain" : "Publish to Blockchain"}
                  </h3>
                  {comparison.onChain ? (
                    <p className="text-zinc-500 text-sm">
                      On-chain ID: #{comparison.blockchainId} &nbsp;|&nbsp; IPFS:{" "}
                      {comparison.ipfsHash?.substring(0, 20)}...
                    </p>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      Comparison is saved in the database. Pin it to IPFS and record it on-chain permanently.
                    </p>
                  )}
                  {isPublishInProgress && <PublishSteps step={publishStep} />}
                </div>

                {!comparison.onChain && (
                  <button
                    onClick={handlePublishOnChain}
                    disabled={!isConnected || isPublishInProgress || isPublishing || isPublishConfirming}
                    className="bg-[#10b981] text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-[#059669] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isPublishInProgress || isPublishing || isPublishConfirming ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Publishing...</>
                    ) : (
                      <><Link2 className="w-4 h-4" /> Publish On-Chain</>
                    )}
                  </button>
                )}

                {comparison.onChain && (
                  <div className="flex items-center gap-2 bg-[#10b981]/10 border border-[#10b981]/30 px-4 py-2 rounded-lg">
                    <Hexagon className="w-4 h-4 text-[#10b981]" />
                    <span className="text-[#10b981] text-sm font-bold">On-Chain ✓</span>
                  </div>
                )}
              </div>

              {!isConnected && !comparison.onChain && (
                <p className="text-xs text-zinc-600 mt-2">Connect wallet to publish on-chain.</p>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!comparison && !loading && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              { icon: Link2, title: "Paste URLs", desc: "Drop any two article links — news, blogs, research papers." },
              { icon: Scale, title: "AI Analysis", desc: "AI scrapes and scores across 8 critical dimensions. Saved to DB automatically." },
              { icon: Hexagon, title: "Mint Report", desc: "Store comparison permanently on-chain via IPFS. Verifiable forever." },
            ].map((step, i) => (
              <div key={i} className="bg-[#121214] border border-[#27272a] hover:border-[#10b981] rounded-xl p-6 transition-all group">
                <div className="w-12 h-12 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="w-6 h-6 text-white group-hover:text-[#10b981] transition-colors" />
                </div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}