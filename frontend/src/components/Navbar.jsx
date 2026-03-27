import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import toast from "react-hot-toast";
import axios from "axios";
import { 
  Menu, X, Star, Award, Check, 
  Brain, FileText, LogOut, Wallet, Link2, Scale, Hexagon, ChevronDown, Zap
} from "lucide-react";

// --- OneChain / Sui Imports ---
import { 
  ConnectButton, 
  useCurrentAccount, 
  useDisconnectWallet, 
  useSuiClientQuery, 
  useSignAndExecuteTransaction 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from "../constants";

const API_BASE = 'https://wrap-up-onechain.onrender.com/api';

export default function Navbar() {
  const { userPoints, displayName, setUserPoints, setDisplayName, setProfileObjectId } = useArticleStore();  const [newName, setNewName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);

  // Sui State
  const [userProfileId, setUserProfileId] = useState(null);
  const [claimablePoints, setClaimablePoints] = useState(0);
  const [wupBalance, setWupBalance] = useState(0);

  const toolsCloseTimer = useRef(null);
  const rewardsCloseTimer = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
   
  // OneChain Wallet Hooks
  const account = useCurrentAccount();
  const isConnected = !!account;
  const address = account?.address;
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: signAndExecuteTransaction, isPending: isClaiming } = useSignAndExecuteTransaction();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Read Blockchain State (The Move Way) ---
  // Fetch the UserProfile object owned by the connected wallet
  const { data: profileObjects, refetch: refetchProfile } = useSuiClientQuery('getOwnedObjects', {
    owner: address,
    filter: { StructType: `${PACKAGE_ID}::platform::UserProfile` },
    options: { showContent: true },
  }, {
    enabled: isConnected,
    refetchInterval: 5000, // Auto-refresh every 5s
  });

  useEffect(() => {
    if (isConnected && address) {
      fetchUserFromDb(address);
    } else {
      setUserPoints(0);
      setDisplayName('');
      setClaimablePoints(0);
      setWupBalance(0);
      setUserProfileId(null);
    }
  }, [isConnected, address]);

  // Parse the UserProfile object when it loads
  useEffect(() => {
    if (profileObjects && profileObjects.data.length > 0) {
      const profileData = profileObjects.data[0].data.content.fields;
      
      setUserProfileId(profileObjects.data[0].data.objectId);
      setProfileObjectId(profileObjects.data[0].data.objectId); // <--- ADD THIS
      
      const total = Number(profileData.total_points);
      const claimed = Number(profileData.claimed_points);
      
      setUserPoints(total);
      setClaimablePoints(total - claimed);
      
      // Simulate WUP Balance (1 point = 10 WUP based on EVM logic)
      setWupBalance(claimed * 10);
    } else {
      // User doesn't have a profile object yet
      setUserProfileId(null);
      setProfileObjectId(null); // <--- ADD THIS
      setUserPoints(0);
      setClaimablePoints(0);
      setWupBalance(0);
    }
  }, [profileObjects]);

  // --- Database Logic ---
  const fetchUserFromDb = async (walletAddress) => {
    try {
      const response = await axios.get(`${API_BASE}/users/${walletAddress}`);
      if (response.data && response.data.displayName) {
        setDisplayName(response.data.displayName);
      }
    } catch (error) {
      console.log('User not found in DB or error:', error.message);
    }
  };

  const handleSetDisplayName = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");
    if (newName.trim().length > 32) return toast.error("Name must be 1-32 characters");

    try {
      setSavingToDb(true);
      toast.loading("Saving to database...", { id: "setNameToast" });
      const response = await axios.post(`${API_BASE}/users/set-display-name`, {
        walletAddress: address,
        displayName: newName.trim()
      });
      
      if (response.data.success) {
        toast.success("Name saved!", { id: "setNameToast" });
        setDisplayName(newName.trim());
        setNewName("");
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save to database", { id: "setNameToast" });
    } finally {
      setSavingToDb(false);
    }
  };

  // --- Write Blockchain Logic (Transactions) ---
  const handleRegisterProfile = () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::platform::register_user`,
      arguments: [],
    });

    toast.loading("Creating on-chain profile...", { id: "register" });
    signAndExecuteTransaction({ transaction: tx }, {
      onSuccess: () => {
        toast.success("Profile created! You can now earn points.", { id: "register" });
        refetchProfile();
      },
      onError: (err) => {
        toast.error(`Failed: ${err.message}`, { id: "register" });
      }
    });
  };

  const handleClaim = () => {
    if (!userProfileId) return toast.error("Please register your profile first.");
    if (claimablePoints <= 0) return toast.error('You have no points to claim!');
    
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::platform::claim_rewards`,
      arguments: [tx.object(userProfileId)],
    });

    toast.loading('Confirming claim...', { id: 'claim_toast' });
    signAndExecuteTransaction({ transaction: tx }, {
      onSuccess: () => {
        toast.success('Tokens Claimed!', { id: 'claim_toast' });
        refetchProfile(); // Instantly update UI balances
      },
      onError: (err) => toast.error(`Claim failed: ${err.message}`, { id: 'claim_toast' })
    });
  };

  const isClaimButtonDisabled = isClaiming || claimablePoints <= 0 || !userProfileId;
  const claimButtonText = () => {
    if (isClaiming) return 'Claiming...';
    if (!userProfileId) return 'Register Profile First';
    if (claimablePoints <= 0) return 'No Points';
    return 'Claim $WUP';
  };

  const toolLinks = [
    { path: '/research', label: 'Research', icon: Brain },
    { path: '/compare', label: 'Compare', icon: Scale },
    { path: '/legacy', label: 'Curate', icon: Link2 },
  ];

  const navLinks = [
    { path: '/curated', label: 'Articles', icon: FileText },
    { path: '/research-list', label: 'Reports', icon: Hexagon },
  ];

  const handleToolsEnter = () => {
    if (toolsCloseTimer.current) clearTimeout(toolsCloseTimer.current);
    setIsToolsOpen(true);
  };
  const handleToolsLeave = () => {
    toolsCloseTimer.current = setTimeout(() => setIsToolsOpen(false), 150);
  };

  const handleRewardsEnter = () => {
    if (rewardsCloseTimer.current) clearTimeout(rewardsCloseTimer.current);
    setIsRewardsOpen(true);
  };
  const handleRewardsLeave = () => {
    rewardsCloseTimer.current = setTimeout(() => setIsRewardsOpen(false), 150);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 shadow-xl shadow-black/20' 
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="w-full px-18 sm:px-10 lg:px-24 xl:px-28">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-all duration-300 overflow-hidden">
              <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
              Wrap<span className="text-emerald-400">-Up</span>
            </span>
          </Link>
           
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 relative">
            {/* Tools Dropdown */}
            <div className="relative" onMouseEnter={handleToolsEnter} onMouseLeave={handleToolsLeave}>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isToolsOpen ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}>
                <Brain className="w-4 h-4" />
                Tools
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute top-full left-0 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50"
                  style={{ marginTop: '4px' }}
                  onMouseEnter={handleToolsEnter}
                  onMouseLeave={handleToolsLeave}
                >
                  <div className="absolute -top-1 left-0 right-0 h-2" />
                  {toolLinks.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsToolsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-all"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(path)
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden lg:flex items-center gap-3">
            {isConnected && (
              <>
                {/* Registration Reminder */}
                {!userProfileId && (
                  <button 
                    onClick={handleRegisterProfile}
                    className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all animate-pulse"
                  >
                    Init Profile
                  </button>
                )}

                {/* Earnings Dropdown */}
                {userProfileId && (
                  <div className="relative" onMouseEnter={handleRewardsEnter} onMouseLeave={handleRewardsLeave}>
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border ${
                      claimablePoints > 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}>
                      <Zap className={`w-4 h-4 ${claimablePoints > 0 ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      Earnings
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isRewardsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRewardsOpen && (
                      <div className="absolute top-full right-0 w-60 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden" style={{ marginTop: '4px' }}>
                        <div className="absolute -top-1 left-0 right-0 h-2" />
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
                              <Star className="w-3.5 h-3.5 text-emerald-500" />
                              Total Points
                            </div>
                            <span className="text-white font-bold text-sm">{userPoints}</span>
                          </div>

                          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
                              <Award className="w-3.5 h-3.5 text-emerald-500" />
                              $WUP Balance
                            </div>
                            <span className="text-white font-bold text-sm">{wupBalance.toFixed(2)}</span>
                          </div>

                          {claimablePoints > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <span className="text-emerald-400 text-xs uppercase tracking-wide font-medium">Claimable</span>
                              <span className="text-emerald-400 font-bold text-sm">{claimablePoints} pts</span>
                            </div>
                          )}

                          <button
                            onClick={handleClaim}
                            disabled={isClaimButtonDisabled}
                            className={`w-full mt-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
                              isClaimButtonDisabled
                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                            }`}
                          >
                            {claimButtonText()}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Display Name */}
                {displayName ? (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-white">{displayName}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()}
                      className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 text-sm w-28"
                      disabled={savingToDb}
                    />
                    <button
                      onClick={handleSetDisplayName}
                      disabled={savingToDb}
                      className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl text-white transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* Standard Mysten Dapp Kit Connect Button */}
            <ConnectButton className="!bg-white !text-black !font-bold hover:!bg-emerald-400 !px-5 !py-2.5 !rounded-xl !transition-all !duration-200" />
            
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-6 pt-4 space-y-2 border-t border-zinc-800 animate-fade-in">
            {toolLinks.map(({ path, label, icon: Icon }) => (
              <Link 
                key={path}
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive(path) ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link 
                key={path}
                to={path} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive(path) ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            
            {isConnected && (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                {!userProfileId ? (
                   <button 
                   onClick={handleRegisterProfile}
                   className="w-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all"
                 >
                   Init Profile First
                 </button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                        <span className="text-zinc-500 text-xs uppercase">Points</span>
                        <span className="text-emerald-400 font-bold">{userPoints}</span>
                      </div>
                      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                        <span className="text-zinc-500 text-xs uppercase">$WUP</span>
                        <span className="text-emerald-400 font-bold">{wupBalance.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleClaim}
                      disabled={isClaimButtonDisabled}
                      className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wide ${
                        isClaimButtonDisabled
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                          : 'bg-emerald-500 text-black hover:bg-emerald-400'
                      }`}
                    >
                      {claimButtonText()}
                    </button>
                  </>
                )}

                {displayName ? (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-white">{displayName}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Set Display Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500/50"
                      disabled={savingToDb}
                    />
                    <button 
                      onClick={handleSetDisplayName} 
                      disabled={savingToDb} 
                      className="bg-zinc-800 hover:bg-zinc-700 px-4 rounded-xl text-white"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4">
               <ConnectButton className="!w-full !justify-center !bg-zinc-900 !text-white !border !border-zinc-800 hover:!border-zinc-600 !py-3 !rounded-xl !font-bold" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
