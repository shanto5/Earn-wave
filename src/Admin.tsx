import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  LayoutDashboard, 
  TrendingUp, 
  ExternalLink, 
  User, 
  Trash2, 
  Home as HomeIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
  Search,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronRight,
  ArrowRight,
  UserCheck,
  UserX,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  Timestamp,
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { UserProfile, Task, OperationType } from './types';
import { cn } from './lib/utils';
import { handleFirestoreError } from './lib/firebase-utils';
import { BeautifulModal } from './components/BeautifulModal';

export const AdminPanel = ({ adminLinks, setAdminLinks }: { adminLinks: string[], setAdminLinks: (links: string[]) => void }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdUrl, setNewAdUrl] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', url: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'tasks' | 'ads' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'deleteUser' | 'deleteTask' | 'confirmAction' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [appConfig, setAppConfig] = useState({
    appName: 'Earn Wave Pro',
    maintenanceMode: false,
    welcomeMessage: 'Welcome to the premium earning network!',
    broadcastMessage: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const configSnap = await getDoc(doc(db, 'config', 'admin'));
        
        setUsers(usersSnap.docs.map(doc => doc.data() as UserProfile));
        setTasks(tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
        
        if (configSnap.exists()) {
          const data = configSnap.data();
          setAppConfig({
            appName: data.appName || 'Earn Wave Pro',
            maintenanceMode: data.maintenanceMode || false,
            welcomeMessage: data.welcomeMessage || 'Welcome to the premium earning network!',
            broadcastMessage: data.broadcastMessage || ''
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'admin_data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateConfig = async (updates: Partial<typeof appConfig>) => {
    const newConfig = { ...appConfig, ...updates };
    try {
      await updateDoc(doc(db, 'config', 'admin'), updates);
      setAppConfig(newConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/admin');
    }
  };

  const chartData = users.reduce((acc: any[], user) => {
    const date = user.createdAt?.toDate().toLocaleDateString() || 'Unknown';
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.users += 1;
      existing.clicks += (user.totalClicks || 0);
    } else {
      acc.push({ date, users: 1, clicks: (user.totalClicks || 0) });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const handleAddAd = async () => {
    if (!newAdUrl) return;
    const updatedLinks = [...adminLinks, newAdUrl];
    try {
      await updateDoc(doc(db, 'config', 'admin'), { links: updatedLinks });
      setAdminLinks(updatedLinks);
      setNewAdUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/admin');
    }
  };

  const handleDeleteAd = async (index: number) => {
    const updatedLinks = adminLinks.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, 'config', 'admin'), { links: updatedLinks });
      setAdminLinks(updatedLinks);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/admin');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.url) return;
    const taskId = `task_${Date.now()}`;
    const taskData = {
      taskId: taskId.slice(-6),
      title: newTask.title,
      description: newTask.description,
      url: newTask.url,
      likes: 0,
      ownerUid: 'admin',
      publishedAt: Timestamp.now()
    };
    try {
      await setDoc(doc(db, 'tasks', taskId), taskData);
      setTasks(prev => [{ id: taskId, ...taskData }, ...prev]);
      setNewTask({ title: '', description: '', url: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tasks/${taskId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-ink-muted animate-pulse uppercase tracking-widest">Loading Admin Data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ink tracking-tighter leading-none">Admin Panel</h2>
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mt-1">Platform Management</p>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors flex items-center gap-2 font-bold text-xs"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'tasks', icon: Activity, label: 'Tasks' },
          { id: 'ads', icon: TrendingUp, label: 'Ads' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shrink-0",
              activeTab === tab.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                : "bg-white text-ink-muted hover:bg-gray-50 border border-gray-100"
            )}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-ink tracking-tight">User Growth & Activity</h3>
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Analytics Overview</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase">Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase">Clicks</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6321" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#FF6321" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#FF6321" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-primary p-8 rounded-[40px] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <Zap className="w-20 h-20" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">System Health</p>
                  <h3 className="text-3xl font-black tracking-tighter mb-4">Operational</h3>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl w-fit">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">All Systems Normal</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl">
                <h4 className="text-sm font-black text-ink uppercase tracking-tight mb-6">Quick Stats</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-600">Avg Clicks/User</span>
                    </div>
                    <span className="text-sm font-black text-ink">{(users.reduce((acc, u) => acc + (u.totalClicks || 0), 0) / (users.length || 1)).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Activity className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-600">Active Tasks</span>
                    </div>
                    <span className="text-sm font-black text-ink">{tasks.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Total Users</p>
              <p className="text-3xl font-black text-ink tracking-tighter">{users.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Active Tasks</p>
              <p className="text-3xl font-black text-ink tracking-tighter">{tasks.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Ad Slots</p>
              <p className="text-3xl font-black text-ink tracking-tighter">{adminLinks.length}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2 tracking-tighter">
              <RefreshCw className="w-5 h-5 text-primary" /> Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('tasks')}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-transparent hover:border-gray-200 transition-all flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-ink">Add New Task</p>
                  <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">Create earning opportunities</p>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-transparent hover:border-gray-200 transition-all flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-ink">App Settings</p>
                  <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">Manage global configuration</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">Stats</th>
                    <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => 
                    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-sm font-black text-ink leading-none">{user.displayName}</p>
                            <p className="text-[10px] text-ink-muted font-bold mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <div className="bg-blue-50 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-black text-blue-600">{user.totalClicks || 0} C</span>
                          </div>
                          <div className="bg-emerald-50 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-black text-emerald-600">{user.linkClicks || 0} L</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            setSelectedItem(user);
                            setModalType('deleteUser');
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2 tracking-tighter">
              <Plus className="w-5 h-5 text-primary" /> Create New Task
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Task Title (e.g. Follow on Instagram)"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none"
              />
              <input 
                type="text" 
                placeholder="Task Description (e.g. Follow @username and get rewards)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none"
              />
              <input 
                type="url" 
                placeholder="Task URL (Direct Link)"
                value={newTask.url}
                onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none"
              />
              <button 
                onClick={handleAddTask}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Publish Task
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-ink uppercase tracking-widest px-1">Active Tasks ({tasks.length})</h3>
            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-ink leading-none">{task.title}</p>
                    <p className="text-[10px] text-ink-muted font-bold mt-1 max-w-[200px] truncate">{task.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/5 px-3 py-1 rounded-lg">
                    <span className="text-[10px] font-black text-primary">{task.likes} Likes</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedItem(task);
                      setModalType('deleteTask');
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2 tracking-tighter">
              <Plus className="w-5 h-5 text-primary" /> Add Adsterra Link
            </h3>
            <div className="flex gap-2">
              <input 
                type="url" 
                placeholder="Paste Adsterra Direct Link here..."
                value={newAdUrl}
                onChange={(e) => setNewAdUrl(e.target.value)}
                className="flex-1 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none"
              />
              <button 
                onClick={handleAddAd}
                className="bg-primary text-white font-black px-8 rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <h3 className="text-sm font-black text-ink uppercase tracking-widest px-1">Active Ad Slots ({adminLinks.length})</h3>
            {adminLinks.map((link, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-amber-600">#{i + 1}</span>
                  </div>
                  <p className="text-xs font-bold text-ink-muted truncate flex-1">{link}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={() => window.open(link, '_blank')}
                    className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAd(i)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-ink uppercase tracking-widest px-1">Community Links (Pick to Add)</h3>
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">Link</th>
                      <th className="px-6 py-4 text-[10px] font-black text-ink-muted uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.flatMap(u => (u.directLinks || []).map(link => ({ uid: u.uid, name: u.displayName, link }))).map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-ink">{item.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-ink-muted truncate max-w-[200px]">{item.link}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={async () => {
                              if (adminLinks.includes(item.link)) return;
                              const updatedLinks = [...adminLinks, item.link];
                              try {
                                await updateDoc(doc(db, 'config', 'admin'), { links: updatedLinks });
                                setAdminLinks(updatedLinks);
                              } catch (error) {
                                handleFirestoreError(error, OperationType.WRITE, 'config/admin');
                              }
                            }}
                            className={cn(
                              "p-2 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-tighter",
                              adminLinks.includes(item.link) 
                                ? "text-emerald-500 bg-emerald-50" 
                                : "text-primary hover:bg-primary/10"
                            )}
                          >
                            {adminLinks.includes(item.link) ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {adminLinks.includes(item.link) ? 'Added' : 'Add to Official'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2 tracking-tighter">
              <Settings className="w-5 h-5 text-primary" /> App Configuration
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-3 ml-1">App Name</label>
                <input 
                  type="text" 
                  value={appConfig.appName}
                  onChange={(e) => handleUpdateConfig({ appName: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-3 ml-1">Welcome Message</label>
                <textarea 
                  value={appConfig.welcomeMessage}
                  onChange={(e) => handleUpdateConfig({ welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-3 ml-1">Broadcast Message (Banner)</label>
                <textarea 
                  value={appConfig.broadcastMessage}
                  onChange={(e) => handleUpdateConfig({ broadcastMessage: e.target.value })}
                  rows={3}
                  placeholder="Enter a message to show in the app banner..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 px-6 font-bold text-sm transition-all outline-none resize-none"
                />
                <p className="text-[9px] text-ink-muted mt-2 ml-1 font-medium italic">This message will appear at the top of the user feed in Bengali.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                <div>
                  <p className="text-sm font-black text-red-600">Maintenance Mode</p>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Disable app for all users</p>
                </div>
                <button 
                  onClick={() => handleUpdateConfig({ maintenanceMode: !appConfig.maintenanceMode })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    appConfig.maintenanceMode ? "bg-red-500" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    appConfig.maintenanceMode ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => navigate('/')} 
        className="mt-8 mx-auto flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:underline"
      >
        <HomeIcon className="w-3 h-3" /> Back to App
      </button>

      {/* Beautiful Modals */}
      <BeautifulModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'deleteUser' ? 'ইউজার ডিলিট করবেন?' :
          modalType === 'deleteTask' ? 'টাস্ক ডিলিট করবেন?' :
          'নিশ্চিত করুন'
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm font-bold text-ink-muted mb-8">
            {modalType === 'deleteUser' && `আপনি কি নিশ্চিত যে আপনি ${selectedItem?.displayName} কে ডিলিট করতে চান? এই কাজটি আর ফিরিয়ে আনা যাবে না।`}
            {modalType === 'deleteTask' && `আপনি কি নিশ্চিত যে আপনি এই টাস্কটি ডিলিট করতে চান? ইউজারদের সব প্রগ্রেস হারিয়ে যাবে।`}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-4 bg-gray-100 text-ink-muted font-black rounded-2xl hover:bg-gray-200 transition-all"
            >
              বাতিল
            </button>
            <button 
              onClick={() => {
                if (modalType === 'deleteUser') handleDeleteUser(selectedItem.uid);
                if (modalType === 'deleteTask') handleDeleteTask(selectedItem.id);
              }}
              className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              ডিলিট
            </button>
          </div>
        </div>
      </BeautifulModal>
    </div>
  );
};

export const AdminPageWrapper = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [adminLinks, setAdminLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profileRef = doc(db, 'users', u.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const p = profileSnap.data() as UserProfile;
            setProfile(p);
          }

          const configRef = doc(db, 'config', 'admin');
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            setAdminLinks(configSnap.data().links || []);
          }
        } catch (error) {
          console.error("Error fetching admin profile/config:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setLoginError('User not found. Please add this user in Firebase Console.');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password. Please check and try again.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password login is not enabled in Firebase Console.');
      } else {
        setLoginError('Login failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isAdmin = user && (profile?.email === 'princeshanto520@gmail.com' || user.email === 'princeshanto520@gmail.com');

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <ShieldCheck className="w-96 h-96 absolute -top-20 -left-20 rotate-12" />
          <Lock className="w-96 h-96 absolute -bottom-20 -right-20 -rotate-12" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-primary rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/40 rotate-3">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-ink mb-2 tracking-tighter">Admin Control Center</h1>
            <p className="text-xs text-ink-muted font-bold uppercase tracking-[0.2em]">Authorized Personnel Only</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-2xl">
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2 ml-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 pl-12 pr-4 font-bold text-sm transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-4 pl-12 pr-12 font-bold text-sm transition-all outline-none"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold">{loginError}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Access Dashboard <ShieldCheck className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <button 
              onClick={() => navigate('/')}
              className="w-full mt-6 text-[10px] font-black text-ink-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <HomeIcon className="w-3 h-3" /> Back to Main App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminPanel adminLinks={adminLinks} setAdminLinks={setAdminLinks} />
    </div>
  );
}
