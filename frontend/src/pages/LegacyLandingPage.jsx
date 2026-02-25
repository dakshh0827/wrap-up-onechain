import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useArticleStore } from "../stores/articleStore";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { WRAPUP_ABI, CONTRACT_ADDRESSES } from "../wagmiConfig";
import { decodeEventLog } from "viem";
import axios from "axios";
import {
  Search,
  X,
  Link2,
  Zap,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Circle,
  Loader,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

// Step indicator component
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  isDone
                    ? "bg-[#10b981] border-[#10b981] text-black"
                    : isActive
                    ? "border-[#10b981] text-[#10b981]"
                    : "border-[#27272a] text-zinc-600"
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isActive ? "text-white" : isDone ? "text-[#10b981]" : "text-zinc-600"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px transition-all ${
                  i < currentStep ? "bg-[#10b981]" : "bg-[#27272a]"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const STEPS = ["Analyze", "Save to DB", "Upload IPFS", "Sign & Mint"];

export default function LegacyLandingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scrapedPreview, setScrapedPreview] = useState(null);

  // Track each step explicitly
  const [stepIndex, setStepIndex] = useState(-1); // -1 = not started
  const [savedArticle, setSavedArticle] = useState(null); // DB record
  const [ipfsHash, setIpfsHash] = useState(null);
  const [txDone, setTxDone] = useState(false);

  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { markArticleOnChainDB } = useArticleStore();

  const currentContractAddress =
    CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[421614];

  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  // ── STEP 0: Scrape & Summarize ──────────────────────────────────────────
  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }
    setLoading(true);
    setError(null);
    setScrapedPreview(null);
    setSavedArticle(null);
    setIpfsHash(null);
    setTxDone(false);
    setStepIndex(-1);

    const tid = toast.loading("Scraping & summarizing article...");
    try {
      const res = await fetch(`${API_BASE}/articles/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping failed");
      setScrapedPreview(data.preview);
      toast.success("Article analyzed!", { id: tid });
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  // ── Full curation flow: DB → IPFS → Blockchain ──────────────────────────
  const handleCurate = async () => {
    if (!scrapedPreview) return;
    if (!isConnected) {
      toast.error("Connect wallet to curate");
      return;
    }

    setLoading(true);
    setError(null);
    setTxDone(false);

    try {
      // ── STEP 1: Save to Database ───────────────────────────────────────
      setStepIndex(0);
      const tid1 = toast.loading("Step 1/3 — Saving to database...");
      let dbArticle;
      try {
        const res = await axios.post(`${API_BASE}/articles/prepare`, {
          title: scrapedPreview.title,
          summary: scrapedPreview.summary,
          detailedSummary: scrapedPreview.detailedSummary,
          condensedContent: scrapedPreview.condensedContent,
          keyPoints: scrapedPreview.keyPoints,
          statistics: scrapedPreview.statistics,
          imageUrl: scrapedPreview.imageUrl,
          articleUrl: scrapedPreview.articleUrl,
          cardJson: scrapedPreview.cardJson,
          author: scrapedPreview.author,
          publisher: scrapedPreview.publisher,
          date: scrapedPreview.date,
        });
        dbArticle = res.data.article;
        setSavedArticle(dbArticle);
        toast.success("Saved to database!", { id: tid1 });
      } catch (err) {
        // If article already exists in DB that's fine, retrieve it
        if (err.response?.data?.article) {
          dbArticle = err.response.data.article;
          setSavedArticle(dbArticle);
          toast.success("Article already in database!", { id: tid1 });
        } else {
          throw new Error(err.response?.data?.error || "DB save failed");
        }
      }

      // ── STEP 2: Upload to IPFS ─────────────────────────────────────────
      setStepIndex(1);
      const tid2 = toast.loading("Step 2/3 — Uploading to IPFS...");
      const ipfsRes = await axios.post(`${API_BASE}/articles/upload-ipfs`, {
        ...scrapedPreview,
        id: dbArticle.id,
      });
      const hash = ipfsRes.data.ipfsHash;
      if (!hash) throw new Error("IPFS upload failed — no hash returned");
      setIpfsHash(hash);
      toast.success("Uploaded to IPFS!", { id: tid2 });

      // ── STEP 3: Submit to Blockchain ───────────────────────────────────
      setStepIndex(2);
      toast.loading("Step 3/3 — Sign transaction in wallet...", {
        id: "mintToast",
      });

      const doWrite = () => {
        writeContract({
          address: currentContractAddress,
          abi: WRAPUP_ABI,
          functionName: "submitArticle",
          args: [hash],
        });
      };

      if (!CONTRACT_ADDRESSES[chainId]) {
        switchChain(
          { chainId: 421614 },
          {
            onSuccess: doWrite,
            onError: () => {
              toast.error("Network switch failed", { id: "mintToast" });
              setLoading(false);
            },
          }
        );
      } else {
        doWrite();
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Curation failed");
      setStepIndex(-1);
      setLoading(false);
    }
  };

  // ── Handle tx confirmation ───────────────────────────────────────────────
  useEffect(() => {
    if (isPending) {
      toast.loading("Waiting for wallet confirmation...", { id: "mintToast" });
    }

    if (isConfirming) {
      setStepIndex(2);
      toast.loading("Confirming on blockchain...", { id: "mintToast" });
    }

    if (isConfirmed && receipt && ipfsHash && savedArticle) {
      // Extract on-chain article ID from logs
      let onChainId = null;
      try {
        for (const log of receipt.logs) {
          const event = decodeEventLog({
            abi: WRAPUP_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "ArticleSubmitted") {
            onChainId = event.args.articleId.toString();
            break;
          }
        }
      } catch {}

      if (onChainId && address) {
        toast.loading("Finalizing on-chain record...", { id: "mintToast" });
        markArticleOnChainDB(
          savedArticle.articleUrl,
          onChainId,
          address,
          ipfsHash
        )
          .then(() => {
            setStepIndex(3);
            setTxDone(true);
            toast.success("🎉 Article curated on-chain!", { id: "mintToast" });
            setLoading(false);
            setTimeout(() => navigate("/curated"), 2000);
          })
          .catch((err) => {
            toast.error("DB sync failed: " + err.message, {
              id: "mintToast",
            });
            setLoading(false);
          });
      } else {
        setStepIndex(3);
        setTxDone(true);
        toast.success("Article minted!", { id: "mintToast" });
        setLoading(false);
        setTimeout(() => navigate("/curated"), 2000);
      }
    }

    if (isTxError) {
      toast.error(txError?.shortMessage || "Transaction failed", {
        id: "mintToast",
      });
      setStepIndex(1); // back to after IPFS
      setLoading(false);
    }
  }, [isPending, isConfirming, isConfirmed, isTxError, receipt]);

  const handleReset = () => {
    setUrl("");
    setScrapedPreview(null);
    setError(null);
    setSavedArticle(null);
    setIpfsHash(null);
    setTxDone(false);
    setStepIndex(-1);
  };

  const isProcessing = loading || isPending || isConfirming;

  const getButtonLabel = () => {
    if (stepIndex === -1 && !loading) return "Curate & Mint";
    if (stepIndex === 0) return "Saving to DB...";
    if (stepIndex === 1) return "Uploading to IPFS...";
    if (stepIndex === 2 && (isPending || isConfirming))
      return "Confirming on Chain...";
    if (txDone) return "Done! ✓";
    return "Curate & Mint";
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' fill='none'/%3E%3C/svg%3E")`,
        }}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-20 relative z-10 flex-grow flex flex-col justify-center">
        {/* Back button */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-[#18181b] border border-[#27272a] px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to AI Research Engine
          </button>
        </div>

        <div className="max-w-5xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-full mb-6">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">
              Legacy Mode
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
            Curate any{" "}
            <span className="text-[#10b981]">Article.</span>
          </h1>
          <p className="text-zinc-500 text-xl max-w-2xl mx-auto leading-relaxed">
            Paste a URL → AI summarizes → Saved to DB → Pinned to IPFS → Minted
            on-chain.
          </p>
        </div>

        {/* URL Input */}
        <div className="w-full max-w-3xl mx-auto mb-12">
          <div className="bg-[#121214] border border-[#27272a] p-2 rounded-2xl flex flex-col sm:flex-row gap-3 shadow-2xl shadow-black/50 focus-within:border-[#10b981] transition-all">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape(e)}
              placeholder="Paste article URL here..."
              className="flex-1 bg-transparent px-6 py-4 text-white placeholder-zinc-600 focus:outline-none text-lg w-full"
              disabled={isProcessing}
            />
            <button
              onClick={handleScrape}
              disabled={isProcessing || !url.trim()}
              className="bg-[#10b981] hover:bg-[#059669] text-black px-8 py-4 rounded-xl font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading && !scrapedPreview ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Analyze
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-8 bg-red-900/10 border border-red-900/50 text-red-400 p-3 rounded-lg text-center font-mono text-xs">
            Error: {error}
          </div>
        )}

        {/* Preview + Curation Panel */}
        {scrapedPreview && (
          <div className="max-w-4xl mx-auto bg-[#121214] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl mb-16">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#18181b]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  Ready to Curate
                </span>
              </div>
              <button onClick={handleReset} disabled={isProcessing}>
                <X className="w-5 h-5 text-zinc-500 hover:text-white" />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {/* Step indicator — visible during processing */}
              {stepIndex >= 0 && (
                <StepIndicator steps={STEPS} currentStep={stepIndex} />
              )}

              {/* Article preview */}
              <div className="flex flex-col md:flex-row gap-8 mb-6">
                {scrapedPreview.imageUrl && (
                  <div className="w-full md:w-1/3 aspect-video bg-black rounded-lg overflow-hidden border border-[#27272a]">
                    <img
                      src={scrapedPreview.imageUrl}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                    {scrapedPreview.title}
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3">
                    {scrapedPreview.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scrapedPreview.keyPoints?.slice(0, 3).map((pt, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#27272a] text-zinc-300 px-2 py-1 rounded border border-[#3f3f46]"
                      >
                        {pt.substring(0, 40)}
                        {pt.length > 40 ? "..." : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status rows */}
              <div className="space-y-2 mb-6">
                {[
                  {
                    label: "Database",
                    done: !!savedArticle,
                    active: stepIndex === 0,
                    value: savedArticle ? `ID: ${savedArticle.id?.slice(-8)}` : null,
                  },
                  {
                    label: "IPFS",
                    done: !!ipfsHash,
                    active: stepIndex === 1,
                    value: ipfsHash ? `${ipfsHash.slice(0, 16)}...` : null,
                  },
                  {
                    label: "Blockchain",
                    done: txDone,
                    active: stepIndex === 2,
                    value: null,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between px-4 py-2 rounded border text-sm transition-all ${
                      row.done
                        ? "border-[#10b981]/30 bg-[#10b981]/5"
                        : row.active
                        ? "border-[#10b981]/60 bg-[#10b981]/10"
                        : "border-[#27272a] bg-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {row.done ? (
                        <CheckCircle className="w-4 h-4 text-[#10b981]" />
                      ) : row.active ? (
                        <Loader className="w-4 h-4 text-[#10b981] animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600" />
                      )}
                      <span
                        className={
                          row.done
                            ? "text-[#10b981]"
                            : row.active
                            ? "text-white"
                            : "text-zinc-600"
                        }
                      >
                        {row.label}
                      </span>
                    </div>
                    {row.value && (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-[#27272a]">
                <button
                  onClick={handleCurate}
                  disabled={isProcessing || txDone || !isConnected}
                  className={`px-8 py-3 rounded font-bold uppercase text-sm tracking-wide flex items-center gap-2 transition-all ${
                    !isConnected
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : txDone
                      ? "bg-[#10b981] text-black cursor-default"
                      : isProcessing
                      ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      : "bg-white text-black hover:bg-[#10b981]"
                  }`}
                >
                  {isProcessing && (
                    <Loader className="w-4 h-4 animate-spin" />
                  )}
                  {!isConnected
                    ? "Connect Wallet"
                    : getButtonLabel()}
                  {!isProcessing && !txDone && isConnected && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature steps — shown when no preview */}
        {!scrapedPreview && !loading && (
          <div className="w-full pt-16 border-t border-[#27272a] mt-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
              {[
                { icon: Search, title: "Input", desc: "Paste any article URL." },
                { icon: Zap, title: "Process", desc: "AI extracts & summarizes insights." },
                { icon: Save, title: "Store", desc: "Saved to DB + IPFS." },
                { icon: Link2, title: "Mint", desc: "Verifiable record on-chain." },
              ].map((step, i) => (
                <div
                  key={i}
                  className="group p-8 rounded-2xl border border-[#27272a] bg-[#121214]/50 hover:bg-[#121214] hover:border-[#10b981] transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#18181b] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-[#27272a]">
                    <step.icon className="w-6 h-6 text-white group-hover:text-[#10b981] transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-base text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}