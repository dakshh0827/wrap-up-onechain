import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card } from "../components/ui";
import Button from "../components/ui/Button";
import Model3D from "../components/Model3D";
import BlockchainBackground from "../components/ui/BlockchainBackground";
import {
  Brain, Search, Scale, Link2, Zap, Shield, Globe, 
  ArrowRight, CheckCircle, Hexagon, BarChart3, 
  FileText, Users, Lock, Sparkles, TrendingUp, Database
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Research Engine",
    description: "Generate comprehensive research reports from 10+ authoritative sources with AI-powered synthesis and analysis.",
    color: "emerald",
    link: "/research",
  },
  {
    icon: FileText,
    title: "Article Curation",
    description: "Curate and preserve any web article with AI summarization, stored immutably on IPFS and blockchain.",
    color: "blue",
    link: "/legacy",
  },
  {
    icon: Scale,
    title: "Article Comparator",
    description: "Compare two articles side-by-side with AI scoring across 8 dimensions including credibility and bias.",
    color: "purple",
    link: "/compare",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Input Your Query",
    description: "Enter a research topic, paste an article URL, or provide two URLs to compare.",
    icon: Search,
  },
  {
    step: "02",
    title: "AI Analysis",
    description: "Our AI engine scrapes, analyzes, and synthesizes information from multiple sources.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Review & Curate",
    description: "Review the AI-generated insights and prepare your content for on-chain storage.",
    icon: FileText,
  },
  {
    step: "04",
    title: "Mint On-Chain",
    description: "Store your curated content permanently on IPFS and register it on the blockchain.",
    icon: Hexagon,
  },
];

const PLATFORM_PILLARS = [
  {
    title: "AI Research Engine",
    description: "Multi-source aggregation and AI-powered synthesis for deep research insights.",
    icon: Brain,
  },
  {
    title: "On-Chain Curation",
    description: "Register curated knowledge immutably on blockchain for transparent verification.",
    icon: Hexagon,
  },
  {
    title: "Credibility Scoring",
    description: "Bias detection and credibility analysis across multiple evaluation dimensions.",
    icon: Scale,
  },
  {
    title: "IPFS Storage Layer",
    description: "Decentralized storage ensuring permanent and censorship-resistant access.",
    icon: Database,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col relative">
      
      {/* Universal Interactive Network Background */}
      <BlockchainBackground />

      {/* Additional localized hero gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-emerald-500/10 via-transparent to-transparent rounded-full blur-[100px]" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            
            {/* Left Column - Content */}
            <div className="relative z-20">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full mb-8 shadow-inner">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold tracking-wide text-emerald-400 uppercase">
                  Web3 AI-Powered Curation Platform
                </span>
              </div>

              <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-8">
                <span className="type-line line-1">
                  Decentralized
                </span>
                <br />
                <span className="text-emerald-400 type-line line-2 drop-shadow-lg">
                  Intelligence
                </span>
                <br />
                <span className="type-line line-3">
                  Layer.
                </span>
              </h1>

              <p className="text-xl text-zinc-400 leading-relaxed mb-10 max-w-lg font-medium">
                Research, curate, and verify web content with AI-powered analysis. 
                Store findings immutably on IPFS and blockchain for permanent, 
                transparent access.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 mb-14">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/research")}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="shadow-lg shadow-emerald-500/20 py-4 px-8 text-lg"
                >
                  Start Researching
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate("/research-list")}
                  className="bg-zinc-900/50 backdrop-blur-md border-zinc-800 hover:bg-zinc-800 py-4 px-8 text-lg"
                >
                  Explore Reports
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 md:gap-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800/80">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Verified On-Chain</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800/80">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>IPFS Storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800/80">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>

            {/* Right Column - 3D Model Floating directly on background */}
            <div className="relative hidden lg:flex items-center justify-center h-full min-h-[500px] z-10 pointer-events-auto">
                {/* Added -translate-y-16 to shift the model upwards */}
                <div className="absolute inset-0 w-[130%] h-[130%] -left-[15%] -top-[15%] -translate-y-32">
                    {/* The model is fully transparent and interactive */}
                    <Model3D path="/models/network.glb" />
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="relative z-10 py-20 border-y border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
        <div className="w-full px-6 sm:px-10 lg:px-16 max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PLATFORM_PILLARS.map((item, idx) => (
                <div
                  key={idx}
                  className="group text-center p-8 rounded-3xl border border-zinc-800/80 bg-zinc-950/50 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-inner">
                    <item.icon className="w-8 h-8 text-emerald-400" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                </h3>

                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                    {item.description}
                </p>
                </div>
            ))}
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32" id="features">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
              Three Powerful Tools
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Choose your workflow. Generate research, curate articles, or compare content — all synthesized by AI and secured on-chain.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature, idx) => (
              <Card
                key={idx}
                variant="interactive"
                className="group relative overflow-hidden p-10 bg-zinc-900/40 backdrop-blur-md border-zinc-800/80 hover:border-zinc-600 transition-all shadow-xl"
                onClick={() => navigate(feature.link)}
              >
                {/* Hover gradient bleed */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${
                  feature.color === 'emerald' ? 'from-emerald-500/5' :
                  feature.color === 'blue' ? 'from-blue-500/5' :
                  'from-purple-500/5'
                } to-transparent`} />
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 border shadow-inner ${
                    feature.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 group-hover:bg-emerald-500/20' :
                    feature.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30 group-hover:bg-blue-500/20' :
                    'bg-purple-500/10 border-purple-500/30 group-hover:bg-purple-500/20'
                  }`}>
                    <feature.icon className={`w-8 h-8 ${
                      feature.color === 'emerald' ? 'text-emerald-400' :
                      feature.color === 'blue' ? 'text-blue-400' :
                      'text-purple-400'
                    }`} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed mb-8 font-medium">
                    {feature.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-400 group-hover:gap-4 transition-all">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-32 bg-zinc-900/20 border-t border-zinc-800/50 backdrop-blur-sm" id="workflow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
              How It Works
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Four simple steps from query to a permanent, verifiable on-chain record.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-10 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-emerald-500/10 via-emerald-500/40 to-emerald-500/10" />

            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={idx} className="relative mt-8 md:mt-0">
                <Card
                  className="text-center relative group p-8 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 hover:border-emerald-500/40 transition-all duration-300 shadow-xl hover:-translate-y-2"
                >
                  {/* Step Badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-black font-black text-lg border-4 border-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    {step.step}
                  </div>

                  <div className="pt-8">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-500/10 group-hover:scale-110 transition-all duration-300 border border-zinc-800 group-hover:border-emerald-500/30 shadow-inner">
                      <step.icon className="w-8 h-8 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                      {step.description}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 mb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <Card 
            className="text-center bg-zinc-900/40 backdrop-blur-xl border-emerald-500/30 overflow-hidden relative shadow-2xl p-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="p-12 md:p-20 relative z-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2 rounded-full mb-8 shadow-inner">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Join the Network
                </span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                Ready to curate the web?
              </h2>
              <p className="text-zinc-300 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                Join the decentralized intelligence layer. Research, verify, and preserve 
                knowledge immutably on-chain today.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/research")}
                  icon={Brain}
                  className="px-8 py-4 shadow-lg shadow-emerald-500/20"
                >
                  AI Research
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={() => navigate("/compare")}
                  icon={Scale}
                  className="px-8 py-4 border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800"
                >
                  Compare Articles
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={() => navigate("/legacy")}
                  icon={Link2}
                  className="px-8 py-4 border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800"
                >
                  Curate URL
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
