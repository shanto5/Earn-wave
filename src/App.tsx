import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useNavigate
} from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  UserPlus, 
  ThumbsUp, 
  Clock, 
  LogOut, 
  ShieldCheck, 
  Share2, 
  Star, 
  Zap, 
  Bell, 
  Trophy, 
  ShieldAlert, 
  Users,
  Menu, 
  X, 
  Home as HomeIcon, 
  User, 
  LayoutDashboard, 
  Info, 
  FileText, 
  Mail, 
  MessageCircle,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  Timestamp, 
  increment, 
  writeBatch,
  arrayUnion,
  arrayRemove,
  getDocs,
  deleteDoc,
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Task, OperationType } from './types';
import { cn } from './lib/utils';
import { handleFirestoreError } from './lib/firebase-utils';
import { AdminPageWrapper } from './Admin';
import { BeautifulModal } from './components/BeautifulModal';
import confetti from 'canvas-confetti';

// --- Components ---

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-rose-100 rounded-[32px] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/20">
            <ShieldAlert className="w-10 h-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-ink mb-4 tracking-tighter">Application Error</h1>
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-xl max-w-md w-full mb-8">
            <p className="text-sm font-bold text-rose-600 mb-2">Error Details:</p>
            <p className="text-xs font-mono text-gray-600 break-all">{errorMessage}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 flex items-center gap-2 hover:scale-[1.02] transition-all"
          >
            <RefreshCw className="w-5 h-5" /> Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/admin-control-center" element={<AdminPageWrapper />} />
          <Route path="*" element={<MainApp />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

interface TaskCardProps {
  task: Task;
  profile: UserProfile | null;
  allUsers: UserProfile[];
  onLike: (taskId: string) => Promise<void>;
  onFollow: (uid: string) => Promise<void>;
}

const Header = ({ onMenuClick, user }: { onMenuClick: () => void, user: FirebaseUser | null }) => (
  <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
        <Menu className="w-6 h-6 text-gray-700" />
      </button>
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-primary tracking-tighter leading-none">Earn Wave Pro</h1>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Premium Platform</span>
      </div>
    </div>
    {user && (
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-100">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Active</span>
      </div>
    )}
  </header>
);

const UserInfoBar = ({ profile, allUsers }: { profile: UserProfile | null, allUsers: UserProfile[] }) => {
  const level = Math.floor((profile?.totalClicks || 0) / 50) + 1;
  const nextLevelClicks = level * 50;
  const currentLevelClicks = (level - 1) * 50;
  const progress = Math.min(100, ((profile?.totalClicks || 0) - currentLevelClicks) / (nextLevelClicks - currentLevelClicks) * 100);

  const totalNetworkClicks = allUsers.reduce((acc, u) => acc + (u.totalClicks || 0), 0);

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-3 sticky top-16 z-40 shadow-sm">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="w-10 h-10 rounded-xl border-2 border-primary/20 shadow-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-xl border-2 border-primary/20 bg-gray-200 flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 leading-none">{profile?.displayName}</span>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">Network Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-primary/5 px-2 py-1.5 rounded-xl border border-primary/10 flex flex-col items-center min-w-[70px]">
            <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">Network</span>
            <span className="text-xs font-black text-primary">{totalNetworkClicks.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-100 flex flex-col items-center min-w-[70px]">
            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">Recv</span>
            <span className="text-xs font-black text-emerald-600">{(profile?.linkClicks || 0)}</span>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Level {level} Progress</span>
          <span className="text-[9px] font-bold text-ink-muted">{profile?.totalClicks || 0} / {nextLevelClicks} Clicks</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary"
          />
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose, setView, currentView, profile }: { isOpen: boolean, onClose: () => void, setView: (v: any) => void, currentView: string, profile: UserProfile | null }) => {
  const menuItems = [
    { id: 'feed', label: 'Home Feed', icon: HomeIcon },
    { id: 'profile', label: 'Account Settings', icon: User },
    { id: 'clicks', label: `My Clicks (${profile?.linkClicks || 0})`, icon: TrendingUp },
    { id: 'network-guide', label: 'Network Guide', icon: Users },
    { id: 'blog', label: 'Latest Updates', icon: LayoutDashboard },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'contact', label: 'Contact Support', icon: Mail },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>
      <motion.aside 
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 h-full w-72 bg-white z-[60] shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-primary tracking-tighter">Menu</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); onClose(); }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all",
                currentView === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/30" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-primary"
              )}
            >
              <item.icon className={cn("w-5 h-5", currentView === item.id ? "text-white" : "text-gray-400")} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Support</p>
            <a href="https://t.me/EarnWaveModerator" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
              <Mail className="w-4 h-4" /> t.me/EarnWaveModerator
            </a>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

const Leaderboard = ({ users }: { users: UserProfile[] }) => {
  const topUsers = [...users].sort((a, b) => (b.totalClicks || 0) - (a.totalClicks || 0)).slice(0, 5);

  return (
    <div className="px-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black text-ink uppercase tracking-tight">সেরা লিডারবোর্ড</h3>
        </div>
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Top 5 Members</span>
      </div>
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {topUsers.map((u, i) => (
          <div key={u.uid} className={cn(
            "flex items-center justify-between p-4 border-b border-gray-50 last:border-0",
            i === 0 ? "bg-amber-50/30" : ""
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                i === 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : 
                i === 1 ? "bg-gray-400 text-white" :
                i === 2 ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-400"
              )}>
                {i + 1}
              </div>
              {u.photoURL ? (
                <img src={u.photoURL} alt="" className="w-8 h-8 rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-xl border border-gray-100 bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-ink">{u.displayName}</span>
                <span className="text-[8px] font-bold text-ink-muted uppercase tracking-widest">Level: {Math.floor((u.totalClicks || 0) / 50) + 1}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-primary">{u.totalClicks || 0}</span>
              <span className="text-[8px] font-bold text-ink-muted uppercase tracking-widest">Clicks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnnouncementBanner = ({ message }: { message: string }) => (
  <div className="px-4 mb-4">
    <div className="bg-primary/5 border border-primary/10 px-4 py-3 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
          <Bell className="w-4 h-4 text-white animate-bounce" />
        </div>
        <p className="text-[11px] font-bold text-primary leading-tight">
          {message || 'নতুন আপডেট: এখন থেকে প্রতিটি লাইক এ পাবেন বোনাস! নিয়মিত কাজ করুন।'}
        </p>
      </div>
    </div>
  </div>
);

const DailyBonus = ({ profile, onClaim }: { profile: UserProfile | null, onClaim: () => void }) => {
  const lastClaimed = profile?.dailyBonusClaimedAt?.toDate();
  const isClaimedToday = lastClaimed && new Date().toDateString() === lastClaimed.toDateString();

  return (
    <div className="px-4 mb-8">
      <div className="bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Zap className="w-20 h-20 text-white" />
        </div>
        <div className="relative z-10">
          <h3 className="text-lg font-black uppercase tracking-tight mb-1">দৈনিক বোনাস</h3>
          <p className="text-[10px] text-white/80 mb-4">প্রতিদিন অ্যাপে লগইন করে বোনাস সংগ্রহ করুন!</p>
          <button 
            onClick={onClaim}
            disabled={isClaimedToday}
            className={cn(
              "w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              isClaimedToday 
                ? "bg-white/10 text-white/50 cursor-not-allowed" 
                : "bg-white text-primary shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isClaimedToday ? 'আজকের বোনাস নেওয়া হয়েছে' : 'বোনাস সংগ্রহ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FollowSuggestions = ({ profile, users, onFollow }: { profile: UserProfile | null, users: UserProfile[], onFollow: (uid: string) => void }) => {
  const suggestions = [
    { uid: 'admin', name: 'Earn Wave Pro', photo: null, isOfficial: true },
    ...users
      .filter(u => u.uid !== profile?.uid && !profile?.followingUids?.includes(u.uid))
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(u => ({ uid: u.uid, name: u.displayName, photo: u.photoURL, isOfficial: false }))
  ];

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Follow Suggestions</h3>
        <button className="text-[10px] font-bold text-primary hover:underline">See All</button>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {suggestions.map((user) => {
          const isFollowing = profile?.followingUids?.includes(user.uid);
          return (
            <div key={user.uid} className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col items-center min-w-[110px] shadow-sm relative overflow-hidden">
              {user.isOfficial && <div className="absolute top-0 right-0 bg-primary text-white text-[6px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase">Official</div>}
              <div className="w-12 h-12 bg-gray-100 rounded-full mb-2 border-2 border-white shadow-inner overflow-hidden flex items-center justify-center">
                {user.photo ? (
                  <img src={user.photo} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-900 mb-2 truncate w-full text-center">{user.name}</span>
              <button 
                onClick={() => onFollow(user.uid)}
                className={cn(
                  "text-[9px] font-bold px-3 py-1 rounded-lg transition-all",
                  isFollowing 
                    ? "bg-gray-100 text-gray-500" 
                    : "bg-primary text-white shadow-md shadow-primary/20 hover:scale-105"
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AboutUsSection = () => (
  <div className="p-6 bg-background min-h-screen">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-primary/10 rounded-[20px] flex items-center justify-center">
        <Info className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-ink tracking-tight">আমাদের সম্পর্কে</h2>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Earn Wave Pro Community</p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black text-ink mb-4">আমরা কে?</h3>
        <p className="text-sm text-ink-muted leading-relaxed">
          Earn Wave Pro হলো একটি মিউচুয়াল ক্লিক এক্সচেঞ্জ প্ল্যাটফর্ম। আমাদের মূল লক্ষ্য হলো একটি শক্তিশালী কমিউনিটি তৈরি করা যেখানে মেম্বাররা একে অপরের লিঙ্কে ক্লিক করার মাধ্যমে ট্রাফিক এবং এনগেজমেন্ট বৃদ্ধি করতে পারে।
        </p>
      </div>

      <div className="bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-primary/20">
        <h3 className="text-lg font-black mb-4 uppercase tracking-tight">আমাদের লক্ষ্য</h3>
        <ul className="space-y-3 text-xs opacity-90">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
            একটি বিশ্বস্ত ক্লিক এক্সচেঞ্জ নেটওয়ার্ক গড়ে তোলা।
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
            নতুনদের অনলাইনে ট্রাফিক পেতে সাহায্য করা।
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
            একে অপরের সাহায্যে ইনকাম বৃদ্ধির পথ সুগম করা।
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-black text-amber-800 uppercase">সতর্কতা</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed font-medium">
          মনে রাখবেন, Earn Wave Pro কোনো ইনভেস্টমেন্ট বা সরাসরি ইনকাম সাইট নয়। এটি একটি টুল যা আপনাকে আপনার লিঙ্কগুলোতে ক্লিক পেতে সাহায্য করে।
        </p>
      </div>
    </div>
  </div>
);

const ContactSupportSection = () => (
  <div className="p-6 bg-background min-h-screen">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-primary/10 rounded-[20px] flex items-center justify-center">
        <Mail className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-ink tracking-tight">যোগাযোগ</h2>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Support Center</p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-10 h-10 text-blue-500" />
        </div>
        <h3 className="text-xl font-black text-ink mb-2">টেলিগ্রাম সাপোর্ট</h3>
        <p className="text-sm text-ink-muted mb-6">যেকোনো সমস্যা বা প্রশ্নের জন্য আমাদের টেলিগ্রাম মডারেটরকে মেসেজ দিন।</p>
        <a 
          href="https://t.me/EarnWaveModerator" 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/30 hover:scale-105 transition-all"
        >
          মেসেজ দিন <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-surface p-6 rounded-[32px] border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <h4 className="font-black text-sm text-ink uppercase">সাপোর্ট সময়</h4>
          </div>
          <p className="text-xs text-ink-muted font-bold">সকাল ১০:০০ - রাত ১০:০০ (প্রতিদিন)</p>
        </div>
        
        <div className="bg-surface p-6 rounded-[32px] border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h4 className="font-black text-sm text-ink uppercase">জরুরি আপডেট</h4>
          </div>
          <p className="text-xs text-ink-muted font-bold">আমাদের টেলিগ্রাম চ্যানেলে জয়েন থাকুন সব লেটেস্ট নিউজের জন্য।</p>
        </div>
      </div>
    </div>
  </div>
);

const PrivacyPolicySection = () => (
  <div className="p-6 bg-background min-h-screen">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-primary/10 rounded-[20px] flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-ink tracking-tight">প্রাইভেসি পলিসি</h2>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Data & Security</p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-ink uppercase mb-3">তথ্য সংগ্রহ</h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          আমরা আপনার গুগল প্রোফাইল থেকে শুধুমাত্র নাম, ইমেইল এবং প্রোফাইল ছবি সংগ্রহ করি যা আপনার অ্যাকাউন্ট তৈরি এবং লিডারবোর্ডে প্রদর্শনের জন্য ব্যবহৃত হয়।
        </p>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-ink uppercase mb-3">তথ্যের ব্যবহার</h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          আপনার সংগৃহীত তথ্য শুধুমাত্র অ্যাপের ফিচারগুলো (যেমন: ফলো করা, অ্যাক্টিভিটি ট্র্যাকিং) সচল রাখতে ব্যবহার করা হয়। আমরা আপনার ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি করি না।
        </p>
      </div>

      <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
        <h3 className="text-sm font-black text-rose-800 uppercase mb-3">নিরাপত্তা</h3>
        <p className="text-xs text-rose-700 leading-relaxed">
          আমরা আপনার ডেটা সুরক্ষিত রাখতে ফায়ারবেস (Firebase) এর সিকিউরিটি প্রোটোকল ব্যবহার করি। আপনার পাসওয়ার্ড বা সেনসিটিভ ডেটা আমাদের কাছে সংরক্ষিত থাকে না।
        </p>
      </div>

      <div className="text-center pt-4">
        <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">Last Updated: March 2026</p>
      </div>
    </div>
  </div>
);

const AdModal = ({ isOpen, onClose, adUrl, countdown, onConfirm }: { isOpen: boolean, onClose: () => void, adUrl: string, countdown: number, onConfirm: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl border border-white/20"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-ink tracking-tight uppercase">Watch Ad to Like</h3>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Verification Required</p>
                </div>
              </div>
              {countdown <= 0 && (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              )}
            </div>
            
            <div className="relative aspect-video bg-gray-100">
              {adUrl ? (
                <iframe 
                  src={adUrl} 
                  className="w-full h-full border-none"
                  title="Ad Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                  Loading Advertisement...
                </div>
              )}
              <div className="absolute inset-0 bg-transparent" />
            </div>

            <div className="p-8 text-center">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mb-6">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Community Support Active
                </p>
                <p className="text-[9px] font-bold text-emerald-600 mt-1">
                  এই এডটি দেখার মাধ্যমে আপনি একজন মেম্বারকে ইনকাম করতে সাহায্য করছেন।
                </p>
              </div>
              
              <p className="text-sm text-ink-muted font-bold mb-6 leading-relaxed">
                {countdown > 0 
                  ? `দয়া করে ${countdown} সেকেন্ড অপেক্ষা করুন। এডটি লোড হচ্ছে...` 
                  : "এড দেখা সম্পন্ন হয়েছে! এখন আপনি লাইক কনফার্ম করতে পারেন।"}
              </p>
              
              <button 
                onClick={onConfirm}
                disabled={countdown > 0}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl",
                  countdown > 0 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {countdown > 0 ? `Please Wait (${countdown}s)` : "Confirm Like"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ImportantNotice = () => (
  <div className="mx-4 mb-6 bg-gradient-to-br from-indigo-600 to-primary p-5 rounded-[24px] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
      <ShieldCheck className="w-20 h-20 text-white" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-white/20 p-1.5 rounded-lg">
          <Info className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-black text-sm uppercase tracking-tight">জরুরি নির্দেশনা</h3>
      </div>
      <p className="text-[10px] text-white/80 mb-4">নিচের নির্দেশনা মেনে চললে কাজ করুন, ইনকাম আসবে—ধৈর্য ধরুন।</p>
      <ul className="space-y-2 text-[10px] text-white/90">
        <li className="flex items-start gap-2">
          <div className="w-1 h-1 bg-white rounded-full mt-1.5 shrink-0" />
          ২০টি ডাইরেক্ট লিঙ্ক যোগ করুন — এগুলো আপনার ইনকামের মূল উৎস।
        </li>
        <li className="flex items-start gap-2">
          <div className="w-1 h-1 bg-white rounded-full mt-1.5 shrink-0" />
          ধৈর্য ধরে নিয়মিত কাজ করুন — ইনকাম স্থির হতে সময় লাগে।
        </li>
        <li className="flex items-start gap-2">
          <div className="w-1 h-1 bg-white rounded-full mt-1.5 shrink-0" />
          টিম বাড়ান — টিম বড় হলে আপনার ইনকাম বাড়বে।
        </li>
        <li className="flex items-start gap-2">
          <div className="w-1 h-1 bg-white rounded-full mt-1.5 shrink-0" />
          অ্যাপে একটিভ থাকুন — সময়োপযোগী রেসপন্স ও কাজ জরুরি।
        </li>
        <li className="flex items-start gap-2">
          <div className="w-1 h-1 bg-white rounded-full mt-1.5 shrink-0" />
          প্রতি ঘণ্টার আপডেট চেক কাজ সম্পন্ন করুন — রুটিন মেনে চলুন।
        </li>
      </ul>
    </div>
  </div>
);

const TaskCard: React.FC<TaskCardProps> = ({ task, profile, allUsers, onLike, onFollow }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(allUsers.find(u => u.uid === task.ownerUid) || null);
  
  const lastLikedAt = profile?.lastLikes?.[task.id];
  const cooldownMs = 4 * 60 * 60 * 1000;
  const isFollowing = profile?.followingUids?.includes(task.ownerUid || '');

  useEffect(() => {
    const foundOwner = allUsers.find(u => u.uid === task.ownerUid);
    if (foundOwner) {
      setOwner(foundOwner);
    } else if (task.ownerUid && task.ownerUid !== 'admin') {
      // Fetch owner if not in allUsers
      getDoc(doc(db, 'users', task.ownerUid)).then(snap => {
        if (snap.exists()) {
          setOwner(snap.data() as UserProfile);
        }
      });
    }
  }, [task.ownerUid, allUsers]);

  const handleFollow = async () => {
    if (!task.ownerUid || isFollowingLoading) return;
    setIsFollowingLoading(true);
    await onFollow(task.ownerUid);
    setIsFollowingLoading(false);
  };

  useEffect(() => {
    if (!lastLikedAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Date.now() - lastLikedAt.toMillis();
      if (diff < cooldownMs) {
        const remaining = cooldownMs - diff;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const secs = Math.floor((remaining % (60 * 1000)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastLikedAt]);

  const isCooldown = !!timeLeft;
  const ownerName = owner?.displayName || 'Earn Wave Pro';

  const handleLike = async () => {
    if (isLiking || isCooldown) return;
    setIsLiking(true);
    
    await onLike(task.id);
    setIsLiking(false);
  };

  const publishedDate = task.publishedAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const publishedTime = task.publishedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white border rounded-lg overflow-hidden mb-4 shadow-sm transition-all",
        task.ownerUid === 'admin' ? "border-primary/30 ring-1 ring-primary/5" : "border-gray-200"
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          {owner?.photoURL ? (
            <img src={owner.photoURL} alt="" className="w-10 h-10 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              task.ownerUid === 'admin' ? "bg-primary text-white" : "bg-primary/10 text-primary"
            )}>
              {task.ownerUid === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Owner:</span>
              <h3 className="font-bold text-primary leading-none">{ownerName}</h3>
              {task.ownerUid === 'admin' && (
                <span className="bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Official</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" /> Published: {publishedDate}, {publishedTime}
            </span>
          </div>
        </div>

        <div className="bg-[#f0f9f4] border border-[#e1f2e8] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[10px] font-black text-primary bg-white px-2 py-0.5 rounded-md border border-primary/10 shadow-sm">TASK INFO</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed text-center">
            Task <span className="font-bold underline">#{task.taskId}</span> by <span className="font-bold text-primary">{ownerName}</span> requires your <span className="font-bold underline">immediate reaction</span>! 🚀
            <br />
            <span className="text-[11px] text-gray-500 font-medium">Published on: {publishedDate}, {publishedTime}</span>
            <br />
            Stay connected for more tasks!
            <br />
            Status: 👤 <span className={cn("font-bold underline", isFollowing ? "text-emerald-600" : "text-blue-600")}>
              {isFollowing ? 'Following' : 'Unfollowed'}
            </span>
            <br />
            Complete this swiftly to unlock even more exciting <span className="font-bold underline">Opportunities</span>. Stay proactive!🚀 follow <span className="font-bold">{ownerName}</span> to keep the tasks coming your way! ✅
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900">{ownerName}<span className="text-gray-500 font-normal"> *Best Community</span></span>
            <button 
              onClick={handleFollow}
              disabled={isFollowingLoading}
              className={cn(
                "text-[10px] font-bold mt-1 flex items-center gap-1 hover:underline transition-colors",
                isFollowing ? "text-emerald-600" : "text-primary"
              )}
            >
              {isFollowingLoading ? (
                <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <UserPlus className="w-3 h-3" />
              )}
              {isFollowing ? 'Following' : 'Follow User'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600">({task.likes + (isLiking ? 1 : 0)}) Likes</span>
            <button 
              onClick={handleLike}
              disabled={isLiking || isCooldown}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-1.5 rounded-lg font-bold text-sm transition-all border min-w-[120px]",
                isCooldown
                  ? "bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed"
                  : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
              )}
            >
              {isLiking ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isCooldown ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeLeft}
                </span>
              ) : (
                <>
                  <ThumbsUp className="w-4 h-4" /> Like
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProfileSection = ({ profile, onUpdateLinks, onLogout, onShowAlert }: { profile: UserProfile | null, onUpdateLinks: (links: string[]) => void, onLogout: () => void, onShowAlert: (title: string, msg: string) => void }) => {
  const [links, setLinks] = useState<string[]>(profile?.directLinks || []);
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    if (profile) setLinks(profile.directLinks);
  }, [profile]);

  const addLink = () => {
    if (newLink && links.length < 20) {
      const updated = [...links, newLink];
      setLinks(updated);
      setNewLink('');
      onUpdateLinks(updated);
    }
  };

  const removeLink = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    onUpdateLinks(updated);
  };

  return (
    <div className="p-5 bg-background min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-ink">Account Settings</h2>
        <button onClick={onLogout} className="text-rose-500 flex items-center gap-2 text-sm font-bold hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="premium-card rounded-[32px] p-8 shadow-premium border border-white/5 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
          <ShieldCheck className="w-40 h-40 text-white" />
        </div>
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="relative mb-6">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-28 h-28 rounded-[32px] border-4 border-surface shadow-2xl shadow-black/40" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-28 h-28 rounded-[32px] border-4 border-surface bg-gray-800 flex items-center justify-center shadow-2xl shadow-black/40">
                <User className="w-12 h-12 text-gray-600" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl border-4 border-surface flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="font-bold text-2xl text-ink mb-1">{profile?.displayName}</h3>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">{profile?.email}</span>
            <div className="w-1 h-1 bg-white/10 rounded-full"></div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Verified Account</span>
          </div>

          {/* Referral Link Section */}
          <div className="w-full bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
            <span className="text-[10px] text-ink-muted uppercase font-bold tracking-widest mb-2 block">Your Referral Link</span>
            <div className="flex gap-2">
              <input 
                readOnly 
                value={`${window.location.origin}?ref=${profile?.uid}`}
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-ink-muted focus:outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}?ref=${profile?.uid}`);
                  onShowAlert('সফল', 'রেফারেল লিংক কপি করা হয়েছে!');
                }}
                className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-primary/20"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-4">
            <div className="bg-surface/50 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">Following</span>
              <span className="text-xl font-black text-ink">{(profile?.followingUids?.length || 0)}</span>
            </div>
            <div className="bg-surface/50 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">Followers</span>
              <span className="text-xl font-black text-ink">{(profile?.followerUids?.length || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-surface/50 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">Clicks Given</span>
              <span className="text-xl font-black text-ink">{(profile?.totalClicks || 0)}</span>
            </div>
            <div className="bg-surface/50 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">Clicks Received</span>
              <span className="text-xl font-black text-emerald-500">{(profile?.linkClicks || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-[32px] border border-white/5 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-ink">Manage Direct Links</h3>
            <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Add up to 20 links</p>
          </div>
        </div>
        
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Paste your direct link here..." 
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button 
            onClick={addLink}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xs font-bold text-primary w-5">{i + 1}.</span>
                <span className="text-xs text-ink-muted truncate max-w-[200px]">{link}</span>
              </div>
              <button onClick={() => removeLink(i)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {links.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-ink-muted italic">No links added yet. Add your first link to start growing your network!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NetworkGuideSection = () => {
  return (
    <div className="p-5 bg-background min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-[20px] flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-ink tracking-tight">Earning Strategy</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Maximize Your Adsterra Income</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-primary p-8 rounded-[40px] text-center text-white shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <Zap className="w-64 h-64 absolute -top-20 -left-20 rotate-12" />
          </div>
          <h4 className="text-xl font-black uppercase mb-2 relative z-10">ইনকাম বাড়ানোর গোপন টিপস</h4>
          <p className="text-xs font-bold text-white/80 mb-4 relative z-10">Adsterra Direct Link থেকে সর্বোচ্চ আয় করুন</p>
          <div className="w-12 h-1 bg-white/30 mx-auto mb-6 rounded-full relative z-10"></div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <span className="text-2xl mb-2 block">🚀</span>
              <p className="text-[10px] font-black uppercase">বেশি টাস্ক</p>
              <p className="text-[8px] font-bold text-white/70">বেশি টাস্ক করলে আপনার লিঙ্ক সবার আগে দেখাবে</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <span className="text-2xl mb-2 block">👥</span>
              <p className="text-[10px] font-black uppercase">রেফারেল</p>
              <p className="text-[8px] font-bold text-white/70">রেফার করলে আপনার লিঙ্কে ক্লিকের সংখ্যা বাড়বে</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-ink mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> কিভাবে কাজ করে?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 font-black text-primary text-xs">১</div>
                <p className="text-xs text-ink-muted font-bold leading-relaxed">
                  আপনি যখন কারো টাস্ক সম্পন্ন করেন, সিস্টেম স্বয়ংক্রিয়ভাবে আপনার লিঙ্কটি গ্লোবাল পুলে যোগ করে দেয়।
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 font-black text-primary text-xs">২</div>
                <p className="text-xs text-ink-muted font-bold leading-relaxed">
                  আমাদের নতুন <span className="text-primary">Fair Rotation</span> সিস্টেম অনুযায়ী, যাদের ইনকাম কম তাদের লিঙ্ক আগে দেখানো হয়।
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 font-black text-primary text-xs">৩</div>
                <p className="text-xs text-ink-muted font-bold leading-relaxed">
                  নিচের অ্যাড বক্সটি প্রতি ১৫ সেকেন্ডে পরিবর্তন হয়, যা প্রতিটি ইউজারকে সমান সুযোগ দেয়।
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px]">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-black text-amber-900 uppercase">জরুরী সতর্কতা</h4>
            </div>
            <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
              Adsterra একাউন্ট নিরাপদ রাখতে কোনো বট বা অটো-ক্লিকার ব্যবহার করবেন না। আমাদের সিস্টেম রিয়েল ইউজার ডিটেক্ট করতে পারে। নিয়ম মেনে কাজ করলে আপনার ইনকাম নিশ্চিত।
            </p>
          </div>
        </section>

        <section className="text-center space-y-4">
          <h3 className="text-xl font-black text-ink">সহযোগিতার জন্য যোগাযোগ করুন</h3>
          <a href="https://t.me/EarnWaveModerator" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-blue-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
            <MessageCircle className="w-5 h-5" /> Telegram Support
          </a>
        </section>
      </div>
    </div>
  );
};

// --- Main App ---

function MainApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [displayTasks, setDisplayTasks] = useState<Task[]>([]);
  const [taskLimit] = useState(5);
  const [adminLinks, setAdminLinks] = useState<string[]>([
    'https://www.highrevenuenetwork.com/admin1',
    'https://www.highrevenuenetwork.com/admin2'
  ]);
  const [view, setView] = useState<'feed' | 'profile' | 'notifications' | 'network-guide' | 'blog' | 'about' | 'privacy' | 'contact' | 'clicks'>('feed');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isVpnDetected, setIsVpnDetected] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentAdUrl, setCurrentAdUrl] = useState<string>('');
  const [usedAdUrls, setUsedAdUrls] = useState<string[]>([]);
  const [pendingLikeTaskId, setPendingLikeTaskId] = useState<string | null>(null);
  const [adCountdown, setAdCountdown] = useState(0);
  const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'admin'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          handleFirestoreError(error, OperationType.GET, 'config/admin');
        }
      }
    };
    testConnection();

    const checkVpn = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const vpnKeywords = ['VPN', 'Proxy', 'Hosting', 'Cloud', 'Data Center', 'DigitalOcean', 'Amazon', 'Google', 'Microsoft', 'OVH', 'Linode', 'Vultr'];
        const org = data.org || '';
        if (vpnKeywords.some(keyword => org.toLowerCase().includes(keyword.toLowerCase()))) {
          setIsVpnDetected(true);
        }
      } catch (error) {
        // Fallback or ignore
      }
    };
    checkVpn();
  }, []);

  const showAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message });
  };
  
  const allTasksCompleted = displayTasks.length > 0 && displayTasks.every(task => profile?.likedTaskIds?.includes(task.id));

  const adCycleRef = useRef<NodeJS.Timeout | null>(null);

  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pendingLikeTaskId && adCountdown > 0) {
      timer = setInterval(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pendingLikeTaskId, adCountdown]);

  const claimDailyBonus = async () => {
    if (!user || !profile) return;
    const lastClaimed = profile.dailyBonusClaimedAt?.toDate();
    if (lastClaimed && new Date().toDateString() === lastClaimed.toDateString()) {
      showAlert('দুঃখিত', 'আপনি আজকের বোনাস আগেই নিয়েছেন!');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyBonusClaimedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now()
      });
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6321', '#000000', '#FFFFFF']
      });

      showAlert('অভিনন্দন!', 'আপনি আজকের বোনাস সফলভাবে নিয়েছেন!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleFollow = async (targetUid: string) => {
    if (!user || !profile || targetUid === user.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const targetRef = doc(db, 'users', targetUid);
    const following = profile.followingUids || [];
    
    try {
      const batch = writeBatch(db);
      if (following.includes(targetUid)) {
        batch.update(userRef, { followingUids: arrayRemove(targetUid) });
        batch.update(targetRef, { followerUids: arrayRemove(user.uid) });
      } else {
        batch.update(userRef, { followingUids: arrayUnion(targetUid) });
        batch.update(targetRef, { followerUids: arrayUnion(user.uid) });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const [currentAdOwner, setCurrentAdOwner] = useState<string>('Official');

  useEffect(() => {
    // Auto-cycle the bottom ad box every 15 seconds to give everyone exposure
    const interval = setInterval(() => {
      handleNextAd();
    }, 15000);
    return () => clearInterval(interval);
  }, [allUsers, adminLinks]);

  const handleNextAd = () => {
    // Only use admin links for the bottom ad box as requested
    if (adminLinks.length === 0) return;
    
    // Pick a random ad from the admin links
    const randomIndex = Math.floor(Math.random() * adminLinks.length);
    const selectedUrl = adminLinks[randomIndex];
    
    setCurrentAdUrl(selectedUrl);
    setCurrentAdOwner('Official');
  };

  useEffect(() => {
    if (adminLinks.length > 0 && !currentAdUrl) {
      setCurrentAdUrl(adminLinks[0]);
    }
  }, [adminLinks, currentAdUrl]);

  useEffect(() => {
    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // Clean up previous listeners
      if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
      }
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        // Fetch all users for leaderboard
        const usersQuery = query(collection(db, 'users'), orderBy('totalClicks', 'desc'), limit(10));
        onSnapshot(usersQuery, (snap) => {
          setAllUsers(snap.docs.map(d => d.data() as UserProfile));
        });

        // Fetch admin links and broadcast message
        const configRef = doc(db, 'config', 'admin');
        onSnapshot(configRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setAdminLinks(data.links || []);
            setBroadcastMessage(data.broadcastMessage || '');
          } else {
            // Initialize admin config if it doesn't exist and user is admin
            if (u.email === "princeshanto520@gmail.com") {
              try {
                await setDoc(configRef, { 
                  links: [], 
                  broadcastMessage: 'স্বাগতম Earn Wave Pro-তে!' 
                });
              } catch (e) {
                console.error("Failed to initialize admin config", e);
              }
            }
          }
        });

        const docRef = doc(db, 'users', u.uid);
        
        // Use onSnapshot for profile to keep it in sync
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'User',
              photoURL: u.photoURL || '',
              directLinks: [],
              totalClicks: 0,
              linkClicks: 0,
              likedTaskIds: [],
              receivedLikes: 0,
              createdAt: Timestamp.now(),
              lastActiveAt: Timestamp.now()
            };
            await setDoc(docRef, newProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        });

        // Update lastActiveAt on login/app start
        await updateDoc(docRef, { lastActiveAt: Timestamp.now() }).catch(() => {});

        // Start tasks listener ONLY after auth
        const tasksQuery = query(collection(db, 'tasks'), orderBy('publishedAt', 'desc'), limit(100));
        unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
          setAllTasks(t);
          
          // Pick 5 random tasks initially ONLY if none are displayed
          setDisplayTasks(prev => {
            if (prev.length === 0 && t.length > 0) {
              const shuffled = [...t].sort(() => 0.5 - Math.random());
              return shuffled.slice(0, 5);
            }
            // If we already have tasks, update their data but keep the same tasks
            if (prev.length > 0) {
              return prev.map(pt => {
                const updated = t.find(nt => nt.id === pt.id);
                return updated || pt;
              });
            }
            return prev;
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'tasks');
        });
      } else {
        setProfile(null);
        setAllTasks([]);
        setDisplayTasks([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [taskLimit]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLike = async (taskId: string) => {
    if (!user || !profile) return;
    
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Rule 2: 4-hour cooldown
    const lastLikedAt = profile.lastLikes?.[taskId];
    if (lastLikedAt) {
      const fourHoursInMs = 4 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = now - lastLikedAt.toMillis();
      if (diff < fourHoursInMs) {
        const remainingMinutes = Math.ceil((fourHoursInMs - diff) / (60 * 1000));
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        showAlert('অপেক্ষা করুন', `আপনি এই কাজটি আবার করতে পারবেন ${hours > 0 ? `${hours} ঘণ্টা ` : ''}${mins} মিনিট পর।`);
        return;
      }
    }

    // Trigger Ad Modal
    setPendingLikeTaskId(taskId);
    setAdCountdown(10); // 10 seconds ad view required
    
    // Smart Ad Selection to maximize income for EVERYONE
    // 1. Get task owner's ads (if active)
    const taskOwner = allUsers.find(u => u.uid === task.ownerUid);
    const isOwnerActive = taskOwner?.lastActiveAt 
      ? (Date.now() - taskOwner.lastActiveAt.toMillis()) < 24 * 60 * 60 * 1000 
      : false;
    const ownerAds = isOwnerActive ? (taskOwner?.directLinks || []) : [];
    
    // 2. Get ads from other active users, prioritizing those with fewer received clicks
    // We prioritize users with linkClicks === 0 first, then sort by linkClicks
    const otherActiveUsers = allUsers
      .filter(u => 
        u.uid !== user.uid && 
        u.uid !== task.ownerUid && 
        u.lastActiveAt && 
        (Date.now() - u.lastActiveAt.toMillis() < 12 * 60 * 60 * 1000)
      )
      .sort((a, b) => {
        // Absolute priority to zero earners
        if ((a.linkClicks || 0) === 0 && (b.linkClicks || 0) > 0) return -1;
        if ((b.linkClicks || 0) === 0 && (a.linkClicks || 0) > 0) return 1;
        return (a.linkClicks || 0) - (b.linkClicks || 0);
      })
      .slice(0, 20); // Larger pool for variety
    
    const otherAds = otherActiveUsers.flatMap(u => u.directLinks || []);
    const allAds = [...adminLinks, ...ownerAds, ...otherAds];
    
    // 3. Filter out recently used ads if possible
    let availableAds = allAds.filter(url => !usedAdUrls.includes(url));
    
    if (availableAds.length < 5) {
      availableAds = allAds;
      setUsedAdUrls([]);
    }

    // 4. Final selection: Randomly pick from the top priority pool (lowest earners)
    // We pick from the first 50% of available ads which are the lowest earners due to sorting
    const selectionPool = availableAds.slice(0, Math.max(5, Math.floor(availableAds.length * 0.5)));
    const randomAd = selectionPool[Math.floor(Math.random() * selectionPool.length)] || adminLinks[0];
    
    setUsedAdUrls(prev => [...prev, randomAd]);
    setCurrentAdUrl(randomAd);
  };

  const confirmLike = async () => {
    if (!user || !profile || !pendingLikeTaskId) return;
    const taskId = pendingLikeTaskId;
    
    // 1. Update Firestore stats
    const userRef = doc(db, 'users', user.uid);
    const taskRef = doc(db, 'tasks', taskId);

    try {
      const batch = writeBatch(db);

      // Update Liker
      batch.update(userRef, {
        totalClicks: increment(1),
        linkClicks: increment(profile.directLinks?.length || 0),
        lastActiveAt: Timestamp.now(),
        [`lastLikes.${taskId}`]: Timestamp.now()
      });

      // Update Task
      batch.update(taskRef, {
        likes: increment(1)
      });

      // Update Owner's received likes if ownerUid exists
      const taskObj = allTasks.find(t => t.id === taskId);
      if (taskObj?.ownerUid) {
        const ownerRef = doc(db, 'users', taskObj.ownerUid);
        batch.update(ownerRef, {
          receivedLikes: increment(1)
        });
      }

      await batch.commit();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setPendingLikeTaskId(null);
      showAlert('সফল!', 'আপনার লাইক সফল হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleNext = () => {
    setIsFeedLoading(true);
    setTimeout(() => {
      if (allTasks.length > 0) {
        const shuffled = [...allTasks].sort(() => 0.5 - Math.random());
        setDisplayTasks(shuffled.slice(0, 5));
      }
      
      // Always pick a random admin ad for the bottom box when moving to next tasks
      if (adminLinks.length > 0) {
        const randomIndex = Math.floor(Math.random() * adminLinks.length);
        setCurrentAdUrl(adminLinks[randomIndex]);
        setCurrentAdOwner('Official');
      }
      
      setIsFeedLoading(false);
      window.scrollTo(0, 0);
    }, 800);
  };

  const updateLinks = async (newLinks: string[]) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await setDoc(docRef, { directLinks: newLinks }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (isVpnDetected) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-[32px] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/20">
          <ShieldCheck className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-3xl font-black text-ink mb-4 tracking-tighter">VPN Detected!</h1>
        <p className="text-ink-muted font-bold max-w-xs leading-relaxed">
          দুঃখিত, ভিপিএন (VPN) ব্যবহার করে এই অ্যাপটি ব্যবহার করা সম্ভব নয়। দয়া করে ভিপিএন বন্ধ করে আবার চেষ্টা করুন।
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-black text-ink animate-pulse tracking-tighter">Loading Earn Wave Pro...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <ShieldCheck className="w-96 h-96 absolute -top-20 -left-20 rotate-12" />
          <TrendingUp className="w-96 h-96 absolute -bottom-20 -right-20 -rotate-12" />
        </div>
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="w-20 h-20 bg-primary rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/40 rotate-3">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-ink mb-3 tracking-tighter leading-none">Earn Wave Pro</h1>
          <p className="text-sm text-ink-muted font-bold uppercase tracking-[0.2em] mb-12">Premium Earning Network</p>
          
          <div className="bg-surface/50 backdrop-blur-xl p-8 rounded-[40px] border border-white/5 shadow-2xl">
            <h2 className="text-xl font-bold text-ink mb-6">Welcome Back</h2>
            <button 
              onClick={handleLogin}
              className="w-full bg-white text-gray-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-4 shadow-xl hover:scale-[1.02] transition-all border border-gray-100"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
            <p className="text-[10px] text-ink-muted mt-8 font-bold uppercase tracking-widest leading-relaxed">
              By signing in, you agree to our <br/>
              <span className="text-primary underline cursor-pointer">Terms of Service</span> & <span className="text-primary underline cursor-pointer">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 relative">
      <Header onMenuClick={() => setIsSidebarOpen(true)} user={user} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} setView={setView} currentView={view} profile={profile} />
      <UserInfoBar profile={profile} allUsers={allUsers} />

      <main className="max-w-2xl mx-auto pt-4 relative">
        {view === 'feed' && (
          <div className="px-4">
            <AnnouncementBanner message={broadcastMessage} />
            <DailyBonus profile={profile} onClaim={claimDailyBonus} />
            <Leaderboard users={allUsers} />
            <FollowSuggestions profile={profile} users={allUsers} onFollow={handleFollow} />
            <ImportantNotice />
            
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-primary" /> Available Tasks
              </h2>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {displayTasks.length} Tasks Left
              </span>
            </div>

            <div className="space-y-4">
              {isFeedLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-bold text-ink-muted animate-pulse">Loading new tasks...</p>
                </div>
              ) : (
                <>
                  {displayTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      profile={profile} 
                      allUsers={allUsers}
                      onLike={handleLike} 
                      onFollow={handleFollow}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="mt-8 mb-12 flex flex-col items-center gap-4">
              {allTasksCompleted && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center w-full">
                  <p className="text-xs font-bold text-emerald-600">🎉 All tasks completed! Click next for more.</p>
                </div>
              )}
              <button 
                onClick={handleNext}
                disabled={loading}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Next Tasks <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {view === 'profile' && <ProfileSection profile={profile} onUpdateLinks={updateLinks} onLogout={() => signOut(auth)} onShowAlert={showAlert} />}
        {view === 'network-guide' && <NetworkGuideSection />}
        {view === 'about' && <AboutUsSection />}
        {view === 'contact' && <ContactSupportSection />}
        {view === 'privacy' && <PrivacyPolicySection />}
        {view === 'clicks' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-ink mb-2 uppercase tracking-tighter">Link Clicks</h2>
            <p className="text-ink-muted font-bold text-sm mb-8">You have received a total of {profile?.linkClicks || 0} clicks on your links.</p>
            <div className="bg-surface p-6 rounded-[32px] border border-white/5 max-w-sm mx-auto">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">Network Status</span>
              <span className="text-3xl font-black text-emerald-500">Active</span>
            </div>
            <button onClick={() => setView('feed')} className="mt-8 text-primary font-black flex items-center gap-2 mx-auto hover:underline">
              <HomeIcon className="w-4 h-4" /> Back to Home
            </button>
          </div>
        )}
        
        {/* Other views placeholder */}
        {['notifications', 'blog'].includes(view) && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <LayoutDashboard className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-ink mb-2 uppercase tracking-tighter">{view}</h2>
            <p className="text-ink-muted font-bold text-sm">This section is coming soon. Stay tuned for updates!</p>
            <button onClick={() => setView('feed')} className="mt-8 text-primary font-black flex items-center gap-2 mx-auto hover:underline">
              <HomeIcon className="w-4 h-4" /> Back to Home
            </button>
          </div>
        )}
      </main>

      {/* Persistent Ad Box - Horizontal and 85% hidden at the bottom center */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-4 group">
        <div className="relative transition-all duration-500 ease-in-out transform translate-y-[85%] group-hover:translate-y-0 w-full max-w-md">
          {/* Visual indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-t-xl shadow-lg opacity-90 group-hover:opacity-0 transition-opacity whitespace-nowrap flex items-center gap-1.5">
            <TrendingUp className="w-2.5 h-2.5" /> SUPPORTING: {currentAdOwner}
          </div>
          
          <div className="bg-white border-2 border-primary rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="h-[75px] w-full relative bg-gray-50 flex flex-col">
              <div className="flex-1 relative">
                {currentAdUrl ? (
                  <iframe 
                    src={currentAdUrl} 
                    className="w-full h-full border-none pointer-events-none"
                    title="Advertisement"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold italic p-1 text-center">
                    Loading Community Ad...
                  </div>
                )}
                <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={() => window.open(currentAdUrl, '_blank')} />
              </div>
              
              <div className="bg-primary px-3 py-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[6px] font-black text-white/70 uppercase tracking-widest leading-none">Supporting</span>
                    <span className="text-[9px] font-black text-white leading-none mt-0.5 truncate max-w-[100px]">{currentAdOwner}</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextAd();
                    }}
                    className="bg-white text-primary px-2 py-0.5 rounded-md text-[7px] font-black shadow-md flex items-center gap-0.5 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    Next Ad <ArrowRight className="w-2 h-2" />
                  </button>
                  <button 
                    onClick={() => window.open(currentAdUrl, '_blank')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[7px] font-black px-3 py-1 rounded-md transition-colors shadow-sm"
                  >
                    Visit & Earn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BeautifulModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-bold text-ink-muted mb-8 leading-relaxed">
            {alertState.message}
          </p>
          <button 
            onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            ঠিক আছে
          </button>
        </div>
      </BeautifulModal>

      <AdModal 
        isOpen={!!pendingLikeTaskId}
        onClose={() => setPendingLikeTaskId(null)}
        adUrl={currentAdUrl}
        countdown={adCountdown}
        onConfirm={confirmLike}
      />
    </div>
  );
}
