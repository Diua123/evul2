import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Image as ImageIcon, 
  Megaphone, 
  Bell, 
  ArrowLeft, 
  Trash2, 
  UserCheck, 
  ShieldAlert, 
  Plus, 
  X, 
  Upload, 
  UserX,
  Check,
  Smartphone,
  Save,
  LogOut,
  BookOpen
} from 'lucide-react';
import { storage } from '../services/storage';
import { 
  getUsersFB, 
  deleteUserFB, 
  updateUserRoleFB, 
  subscribeToSystemConfig, 
  updateSystemConfigFB,
  subscribeToAnnouncements,
  addAnnouncementFB,
  deleteAnnouncementFB,
  addNotificationFB,
  subscribeToAllLibraryItems,
  addLibraryItemFB,
  deleteLibraryItemFB
} from '../services/firebaseService';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { User, HomeSlide, Announcement, SystemNotification, SystemConfig, LibraryItem } from '../types';

enum AdminTab {
  SLIDES = 'slides',
  USERS = 'users',
  NOTIFICATIONS = 'notifications',
  ANNOUNCEMENTS = 'announcements',
  LIBRARY = 'library'
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.SLIDES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Credentials form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // System Config states
  const [logoUrl, setLogoUrl] = useState('up.png');
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [newSlide, setNewSlide] = useState({ imageUrl: '', title: '', description: '' });

  // Users states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Announcements states
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', text: '', imageUrl: '' });

  // Notification states
  const [newNotification, setNewNotification] = useState({ title: '', body: '', targetUserId: 'all' });

  // Library states
  const [libraryList, setLibraryList] = useState<LibraryItem[]>([]);
  const [newLibraryItem, setNewLibraryItem] = useState({
    title: '',
    author: '',
    category: 'trabalhos',
    description: '',
    downloadUrl: ''
  });

  // Load current session
  const currentUser = storage.getCurrentUser();

  useEffect(() => {
    if (currentUser?.email === 'juniordiua@gmail.com' || currentUser?.email === 'diuacoragem164@gmail.com') {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  // Subscriptions & data loading once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    // Load System Config
    const unsubConfig = subscribeToSystemConfig((config) => {
      setLogoUrl(config.logoUrl || 'up.png');
      setSlides(config.slides || []);
    });

    // Load Announcements
    const unsubAnnouncements = subscribeToAnnouncements((ann) => {
      setAnnouncementsList(ann);
    });

    // Load Library items
    const unsubLibrary = subscribeToAllLibraryItems((items) => {
      setLibraryList(items);
    });

    // Load Users
    const fetchUsers = async () => {
      try {
        const list = await getUsersFB();
        setUsersList(list);
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };
    fetchUsers();

    return () => {
      unsubConfig();
      unsubAnnouncements();
      unsubLibrary();
    };
  }, [isAuthenticated]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isAllowedEmail = email.trim() === 'juniordiua@gmail.com' || email.trim() === 'diuacoragem164@gmail.com';
    if (!isAllowedEmail || password !== 'admin2026') {
      setError('E-mail ou palavra-passe incorretos para o Administrador.');
      setLoading(false);
      return;
    }

    try {
      if (isFirebaseConfigured) {
        // Attempt normal Auth flow
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          // If the user does not exist in Auth but we explicitly need it
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr) {
              console.error("Could not register admin in Firebase Auth:", createErr);
            }
          }
        }
      }

      // Establish admin session
      const adminUser: User = {
        id: 'admin_root',
        name: 'Administrador Geral',
        email: email.trim(),
        photo: 'https://cdn-icons-png.flaticon.com/512/2202/2202112.png',
        anoFrequencia: 0,
        role: 'docente'
      };

      storage.setCurrentUserId(adminUser.id);
      storage.setCachedUser(adminUser);
      setIsAuthenticated(true);
      setSuccess('Sessão de Administrador iniciada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro de autenticação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    storage.logout();
    setIsAuthenticated(false);
    navigate('/');
  };

  // --- ACTIONS ---

  // 1. Logo update
  const handleSaveLogo = async () => {
    try {
      await updateSystemConfigFB({ logoUrl, slides });
      showSuccessMessage('Ícone do sistema atualizado com sucesso!');
    } catch (err) {
      setError('Erro ao atualizar ícone.');
    }
  };

  // 2. Add slide image
  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlide.imageUrl.trim() || !newSlide.title.trim()) {
      setError('A imagem e o título do slide são obrigatórios.');
      return;
    }

    const createdSlide: HomeSlide = {
      id: 'slide_' + Date.now(),
      imageUrl: newSlide.imageUrl,
      title: newSlide.title,
      description: newSlide.description
    };

    const updatedSlides = [...slides, createdSlide];
    try {
      await updateSystemConfigFB({ logoUrl, slides: updatedSlides });
      setSlides(updatedSlides);
      setNewSlide({ imageUrl: '', title: '', description: '' });
      showSuccessMessage('Slide adicionado à tela inicial!');
    } catch (err) {
      setError('Erro ao adicionar slide.');
    }
  };

  // 3. Delete slide image
  const handleDeleteSlide = async (slideId: string) => {
    const updatedSlides = slides.filter(s => s.id !== slideId);
    try {
      await updateSystemConfigFB({ logoUrl, slides: updatedSlides });
      setSlides(updatedSlides);
      showSuccessMessage('Slide removido da tela inicial.');
    } catch (err) {
      setError('Erro ao apagar slide.');
    }
  };

  // 4. Delete user
  const handleDeleteUser = async (userId: string) => {
    if (userId === 'admin_root' || userId === auth.currentUser?.uid) {
      setError('Não pode excluir a si mesmo.');
      return;
    }
    if (!window.confirm('Tem a certeza que deseja excluir permanentemente este utilizador?')) {
      return;
    }

    try {
      await deleteUserFB(userId);
      setUsersList(usersList.filter(u => u.id !== userId));
      showSuccessMessage('Utilizador removido do sistema.');
    } catch (err) {
      setError('Erro ao apagar utilizador.');
    }
  };

  // 5. Promote user to Chefe
  const handlePromoteToChefe = async (userId: string, year: number) => {
    try {
      await updateUserRoleFB(userId, 'chefe', year);
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: 'chefe', anoFrequencia: year } : u));
      showSuccessMessage(`Utilizador promovido a Chefe do ${year}º ano.`);
    } catch (err) {
      setError('Erro ao promover utilizador.');
    }
  };

  // 6. Change role/accesses
  const handleChangeRole = async (userId: string, role: 'student' | 'chefe' | 'docente', year: number = 0) => {
    try {
      await updateUserRoleFB(userId, role, year);
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role, anoFrequencia: year } : u));
      showSuccessMessage(`Acesso do utilizador atualizado para ${role === 'docente' ? 'Docente' : role === 'chefe' ? 'Chefe' : 'Estudante'}.`);
    } catch (err) {
      setError('Erro ao alterar privilégios.');
    }
  };

  // 7. Add announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.text.trim()) {
      setError('Título e texto do anúncio são obrigatórios.');
      return;
    }

    try {
      await addAnnouncementFB(newAnnouncement);
      setNewAnnouncement({ title: '', text: '', imageUrl: '' });
      showSuccessMessage('Anúncio publicado com sucesso!');
    } catch (err) {
      setError('Erro ao publicar anúncio.');
    }
  };

  // 8. Delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncementFB(id);
      showSuccessMessage('Anúncio apagado.');
    } catch (err) {
      setError('Erro ao apagar anúncio.');
    }
  };

  // 9. Send system/individual notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotification.title.trim() || !newNotification.body.trim()) {
      setError('Título e mensagem da notificação são obrigatórios.');
      return;
    }

    try {
      await addNotificationFB({
        title: newNotification.title,
        body: newNotification.body,
        targetUserId: newNotification.targetUserId,
        createdAt: new Date().toISOString()
      });
      setNewNotification({ title: '', body: '', targetUserId: 'all' });
      showSuccessMessage('Notificação criada e enviada!');
    } catch (err) {
      setError('Erro ao enviar notificação.');
    }
  };

  // 10. Add Library Item
  const handleAddLibraryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibraryItem.title.trim() || !newLibraryItem.author.trim() || !newLibraryItem.downloadUrl) {
      setError('O título, o autor e o ficheiro da publicação são obrigatórios.');
      return;
    }

    try {
      await addLibraryItemFB({
        userId: currentUser?.id || 'admin_root',
        title: newLibraryItem.title,
        author: newLibraryItem.author,
        category: newLibraryItem.category as any,
        date: new Date().toISOString().split('T')[0],
        description: newLibraryItem.description,
        downloadUrl: newLibraryItem.downloadUrl
      });
      setNewLibraryItem({ title: '', author: '', category: 'trabalhos', description: '', downloadUrl: '' });
      showSuccessMessage('Material publicado com sucesso na Biblioteca!');
    } catch (err) {
      setError('Erro ao publicar o material na biblioteca.');
    }
  };

  // 11. Delete Library Item
  const handleDeleteLibraryItem = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja excluir este ficheiro da Biblioteca?')) return;
    try {
      await deleteLibraryItemFB(id);
      showSuccessMessage('Ficheiro removido da biblioteca com sucesso.');
    } catch (err) {
      setError('Erro ao remover o ficheiro.');
    }
  };

  // Helper for library file change (base64 conversion)
  const handleLibraryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewLibraryItem({ ...newLibraryItem, downloadUrl: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.Number?.includes(userSearch)
  );

  // Helper for profile picture base64 changes
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogoUrl(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Helper for slide image change
  const handleSlideImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewSlide({ ...newSlide, imageUrl: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  // Helper for announcement image change
  const handleAnnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewAnnouncement({ ...newAnnouncement, imageUrl: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-5xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
          {/* Visual detailing */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-inner">
              <ShieldAlert size={36} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Consola ADM Geral</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Acesso Restrito ao Administrador</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-3xl text-xs font-bold text-center mb-6 animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">E-mail Único</label>
              <input 
                type="email" 
                required 
                placeholder="juniordiua@gmail.com"
                className="w-full p-4 rounded-3xl border border-slate-800 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-amber-500 shadow-inner placeholder-slate-600"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Palavra-passe</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full p-4 rounded-3xl border border-slate-800 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-amber-500 shadow-inner placeholder-slate-600"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link 
                to="/" 
                className="flex-1 bg-slate-900 text-slate-300 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] text-center border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                Voltar
              </Link>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-amber-900/30"
              >
                {loading ? 'A autenticar...' : 'Iniciar Sessão'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Cockpit Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3.5 md:py-4 flex items-center justify-between shadow-xl shrink-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link to="/" className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight flex items-center gap-2 truncate text-white">
              <ShieldAlert className="text-amber-500 animate-pulse shrink-0" size={16} />
              <span className="truncate">Painel de Administração</span>
            </h1>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Controlo Geral do Sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2.5 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Administrador Ativo</span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 p-2.5 rounded-2xl transition-all"
            title="Sair do Modo Admin"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Panel grid */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Navigation panel */}
        <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-800/80 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-visible shrink-0 scrollbar-none snap-x scroll-smooth">
          <p className="hidden md:block text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">Módulos de Sistema</p>
          
          <button 
            onClick={() => setActiveTab(AdminTab.SLIDES)}
            className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-2xl font-bold text-[11px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === AdminTab.SLIDES 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <ImageIcon size={14} />
            Design & Slides
          </button>

          <button 
            onClick={() => setActiveTab(AdminTab.USERS)}
            className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-2xl font-bold text-[11px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === AdminTab.USERS 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Users size={14} />
            Utilizadores ({usersList.length})
          </button>

          <button 
            onClick={() => setActiveTab(AdminTab.NOTIFICATIONS)}
            className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-2xl font-bold text-[11px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === AdminTab.NOTIFICATIONS 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Bell size={14} />
            Notificações
          </button>

          <button 
            onClick={() => setActiveTab(AdminTab.ANNOUNCEMENTS)}
            className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-2xl font-bold text-[11px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === AdminTab.ANNOUNCEMENTS 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Megaphone size={14} />
            Anúncios
          </button>

          <button 
            onClick={() => setActiveTab(AdminTab.LIBRARY)}
            className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-2xl font-bold text-[11px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === AdminTab.LIBRARY 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            Biblioteca ({libraryList.length})
          </button>
        </aside>

        {/* Content cockpit */}
        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-73px)]">
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-3xl text-xs font-black text-center animate-bounce">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-3xl text-xs font-black text-center mb-6">
              {error}
            </div>
          )}

          {/* TAB 1: SLIDES & LOGO */}
          {activeTab === AdminTab.SLIDES && (
            <div className="space-y-8 animate-fadeIn">
              {/* App Icon Management */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-4xl p-5 md:p-6 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload size={16} className="text-amber-500" />
                  Logótipo da Plataforma
                </h3>
                <p className="text-xs text-slate-400">Insira uma imagem personalizada ou carregue um ficheiro para alterar o ícone visual principal da app (visto no cabeçalho e ecrã de carregamento).</p>
                
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-20 h-20 bg-slate-950 border-2 border-slate-800 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative group">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Visual Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold">Sem logo</span>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Plus size={16} className="text-white" />
                      <span className="text-[8px] text-white font-black uppercase tracking-widest mt-1">Substituir</span>
                      <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                    </label>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">URL da Imagem de Logótipo</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        className="w-full sm:flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-1 focus:ring-amber-500 animate-none"
                        placeholder="Ex: up.png ou link para Imgur/etc"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                      <button 
                        onClick={handleSaveLogo}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shrink-0"
                      >
                        <Save size={14} />
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Homepage slide images management */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-4xl p-5 md:p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} className="text-amber-500" />
                    Slides em Carrossel da Tela Inicial
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Estes slides de imagens vão substituir o painel anterior de "Acessos Rápidos", oferecendo um aspeto mais imersivo e artístico na entrada da app.</p>
                </div>

                {/* List slides */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slides.length === 0 ? (
                    <div className="col-span-full border border-dashed border-slate-800 rounded-3xl p-8 text-center text-slate-500">
                      <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
                      <span className="text-xs font-bold uppercase tracking-widest">Nenhum slide adicionado</span>
                    </div>
                  ) : (
                    slides.map((slide) => (
                      <div key={slide.id} className="bg-slate-950 rounded-3xl p-4 border border-slate-800/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {slide.imageUrl ? (
                            <img src={slide.imageUrl} alt={slide.title} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl bg-slate-900 border border-slate-800 shrink-0" />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                              <ImageIcon size={20} className="text-slate-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 block sm:hidden">
                            <h4 className="text-xs font-black uppercase text-white truncate">{slide.title}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{slide.description}</p>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 hidden sm:block">
                          <h4 className="text-xs font-black uppercase text-white truncate">{slide.title}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{slide.description}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="w-full sm:w-auto p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-center"
                        >
                          <Trash2 size={14} />
                          <span className="sm:hidden text-[9px] font-black uppercase tracking-wider">Remover Slide</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new slide */}
                <form onSubmit={handleAddSlide} className="border-t border-slate-800/80 pt-6 space-y-4">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-500">Adicionar Novo Slide</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block ml-1">Título do Slide</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                        placeholder="Ex: Exposição de Belas Artes"
                        value={newSlide.title}
                        onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block ml-1">Ficheiro ou URL de Imagem</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                          placeholder="Ficheiro local ou URL"
                          value={newSlide.imageUrl}
                          onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                        />
                        <label className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-2xl cursor-pointer text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <Upload size={14} />
                          <input type="file" accept="image/*" onChange={handleSlideImageChange} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div className="col-span-full space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block ml-1">Descrição</label>
                      <textarea 
                        rows={2}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white resize-none"
                        placeholder="Insira uma descrição explicativa breve sobre o slide."
                        value={newSlide.description}
                        onChange={(e) => setNewSlide({ ...newSlide, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={14} />
                    Registar Slide da Tela Inicial
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === AdminTab.USERS && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Gestão Geral de Contas</h3>
                  <p className="text-xs text-slate-400">Visualize e controle o acesso à plataforma, exclua contas, promova chefes de turma ou dê acesso de docente.</p>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, email ou número..."
                  className="w-full sm:w-72 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-4xl overflow-hidden shadow-xl">
                {/* Desktop View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-4">Utilizador</th>
                        <th className="p-4">Identificação / Email</th>
                        <th className="p-4">Cargo / Função</th>
                        <th className="p-4">Ano Letivo</th>
                        <th className="p-4 text-center">Ações de Controlo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">
                            Nenhum utilizador encontrado
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={user.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
                                  alt={user.name} 
                                  className="w-9 h-9 rounded-full object-cover border border-slate-800"
                                />
                                <span className="font-bold text-white uppercase">{user.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400">
                              <div className="font-mono">{user.email || 'Convidado'}</div>
                              {user.Number && <div className="text-[10px] font-bold text-amber-500/80 mt-0.5">{user.Number}</div>}
                            </td>
                            <td className="p-4 uppercase font-black text-[10px] tracking-wider">
                              <span className={`px-2.5 py-1 rounded-full ${
                                user.role === 'docente' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                  : user.role === 'chefe' 
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {user.role === 'docente' ? 'Docente' : user.role === 'chefe' ? 'Chefe' : 'Estudante'}
                              </span>
                            </td>
                            <td className="p-4 font-black text-slate-300">
                              {user.anoFrequencia ? `${user.anoFrequencia}º Ano` : 'N/A'}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center items-center gap-2">
                                {/* Promote/Change role dropdown */}
                                <select 
                                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-300 uppercase focus:ring-1 focus:ring-amber-500"
                                  value={`${user.role}-${user.anoFrequencia || 0}`}
                                  onChange={(e) => {
                                    const [role, yearStr] = e.target.value.split('-');
                                    const year = parseInt(yearStr);
                                    handleChangeRole(user.id, role as any, year);
                                  }}
                                >
                                  <option value="student-1">Estudante (1º Ano)</option>
                                  <option value="student-2">Estudante (2º Ano)</option>
                                  <option value="student-3">Estudante (3º Ano)</option>
                                  <option value="student-4">Estudante (4º Ano)</option>
                                  <option value="chefe-1">Chefe (1º Ano)</option>
                                  <option value="chefe-2">Chefe (2º Ano)</option>
                                  <option value="chefe-3">Chefe (3º Ano)</option>
                                  <option value="chefe-4">Chefe (4º Ano)</option>
                                  <option value="docente-0">Docente</option>
                                </select>

                                {/* Delete button */}
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all"
                                  title="Excluir Utilizador Permanentemente"
                                >
                                  <UserX size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Grid/Cards View */}
                <div className="block lg:hidden divide-y divide-slate-850">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">
                      Nenhum utilizador encontrado
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
                            alt={user.name} 
                            className="w-11 h-11 rounded-full object-cover border border-slate-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-black text-white uppercase text-xs truncate">{user.name}</h4>
                            <p className="font-mono text-[9px] text-slate-400 truncate">{user.email || 'Convidado'}</p>
                            {user.Number && <div className="text-[9px] font-bold text-amber-500/85 mt-0.5">{user.Number}</div>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-850/40">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                              user.role === 'docente' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : user.role === 'chefe' 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {user.role === 'docente' ? 'Docente' : user.role === 'chefe' ? 'Chefe' : 'Estudante'}
                            </span>
                            <span className="font-black text-slate-300 text-[9px] uppercase">
                              {user.anoFrequencia ? `${user.anoFrequencia}º Ano` : 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select 
                              className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black text-slate-300 uppercase focus:ring-1 focus:ring-amber-500"
                              value={`${user.role}-${user.anoFrequencia || 0}`}
                              onChange={(e) => {
                                const [role, yearStr] = e.target.value.split('-');
                                const year = parseInt(yearStr);
                                handleChangeRole(user.id, role as any, year);
                              }}
                            >
                              <option value="student-1">Estudante (1º)</option>
                              <option value="student-2">Estudante (2º)</option>
                              <option value="student-3">Estudante (3º)</option>
                              <option value="student-4">Estudante (4º)</option>
                              <option value="chefe-1">Chefe (1º)</option>
                              <option value="chefe-2">Chefe (2º)</option>
                              <option value="chefe-3">Chefe (3º)</option>
                              <option value="chefe-4">Chefe (4º)</option>
                              <option value="docente-0">Docente</option>
                            </select>

                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all"
                              title="Excluir"
                            >
                              <UserX size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === AdminTab.NOTIFICATIONS && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/60 border border-slate-800 rounded-4xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell size={16} className="text-amber-500" />
                    Enviar Notificações ao Sistema
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Crie notificações globais (vistas por todos) ou direcione mensagens privadas individuais para alertar utilizadores específicos.</p>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Destinatário</label>
                      <select 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                        value={newNotification.targetUserId}
                        onChange={(e) => setNewNotification({ ...newNotification, targetUserId: e.target.value })}
                      >
                        <option value="all">TODOS OS UTILIZADORES (Notificação de Sistema)</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>
                            Individual: {u.name?.toUpperCase()} ({u.email || u.Number || 'Sem Email'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Título do Alerta</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                        placeholder="Ex: Alerta de Calendário de Provas"
                        value={newNotification.title}
                        onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Conteúdo do Alerta</label>
                    <textarea 
                      rows={3}
                      required
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white resize-none"
                      placeholder="Escreva a mensagem curta que será exibida ao utilizador..."
                      value={newNotification.body}
                      onChange={(e) => setNewNotification({ ...newNotification, body: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell size={14} />
                    Desparar Notificação Instantânea
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: ANNOUNCEMENTS */}
          {activeTab === AdminTab.ANNOUNCEMENTS && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/60 border border-slate-800 rounded-4xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Megaphone size={16} className="text-amber-500" />
                    Criar Anúncios / Publicidade
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Publique avisos importantes, comunicados ou anúncios gerais que serão destacados para todos os utilizadores.</p>
                </div>

                <form onSubmit={handleAddAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Título do Anúncio</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                        placeholder="Ex: Início das Inscrições para Oficinas Artísticas"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">URL / Ficheiro de Imagem Deslumbrante (Opcional)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                          placeholder="Ficheiro local ou URL externo"
                          value={newAnnouncement.imageUrl}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, imageUrl: e.target.value })}
                        />
                        <label className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3.5 rounded-2xl cursor-pointer text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <Upload size={14} />
                          <input type="file" accept="image/*" onChange={handleAnnImageChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Texto Oficial do Anúncio</label>
                    <textarea 
                      rows={3}
                      required
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white resize-none"
                      placeholder="Detalhes completos sobre o anúncio que serão lidos pelo público..."
                      value={newAnnouncement.text}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, text: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <Megaphone size={14} />
                    Publicar Anúncio no Mural
                  </button>
                </form>
              </div>

              {/* Announcements list */}
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Anúncios Ativos ({announcementsList.length})</p>
                <div className="grid grid-cols-1 gap-4">
                  {announcementsList.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-4xl p-10 text-center text-slate-500">
                      <Megaphone size={36} className="mx-auto mb-2 opacity-25 animate-bounce" />
                      <span className="text-xs font-bold uppercase tracking-widest">Nenhum anúncio ativo</span>
                    </div>
                  ) : (
                    announcementsList.map((ann) => (
                      <div key={ann.id} className="bg-slate-900/40 border border-slate-800 rounded-4xl p-5 md:p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                        {ann.imageUrl && (
                          <img src={ann.imageUrl} alt={ann.title} className="w-full md:w-32 h-24 object-cover rounded-2xl border border-slate-800 shrink-0" />
                        )}
                        <div className="flex-1 space-y-2 min-w-0 w-full">
                          <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">Publicado em: {new Date(ann.createdAt).toLocaleDateString()}</span>
                          <h4 className="text-sm font-black uppercase tracking-tight text-white">{ann.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed break-words">{ann.text}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="w-full md:w-auto bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl hover:bg-red-500/20 transition-all shrink-0 flex items-center justify-center gap-2 self-stretch md:self-start"
                        >
                          <Trash2 size={16} />
                          <span className="md:hidden text-xs font-black uppercase tracking-wider">Eliminar Anúncio</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIBRARY */}
          {activeTab === AdminTab.LIBRARY && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/60 border border-slate-800 rounded-4xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-500" />
                    Publicar Recursos na Biblioteca Académica
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Como administrador único, carregue planos curriculares, monografias, horários de exames ou trabalhos científicos. Os utilizadores normais terão acesso de leitura apenas.</p>
                </div>

                <form onSubmit={handleAddLibraryItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Título do Recurso / Ficheiro</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-1 focus:ring-amber-500"
                        placeholder="Ex: Monografia de Educação Visual - 2026"
                        value={newLibraryItem.title}
                        onChange={(e) => setNewLibraryItem({ ...newLibraryItem, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Autor ou Organização</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-1 focus:ring-amber-500"
                        placeholder="Ex: Prof. Dr. Júnior Diua"
                        value={newLibraryItem.author}
                        onChange={(e) => setNewLibraryItem({ ...newLibraryItem, author: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Categoria na Biblioteca</label>
                      <select 
                        required
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-1 focus:ring-amber-500"
                        value={newLibraryItem.category}
                        onChange={(e) => setNewLibraryItem({ ...newLibraryItem, category: e.target.value })}
                      >
                        <option value="trabalhos">Trabalhos Científicos</option>
                        <option value="mono">Monografias</option>
                        <option value="planos">Planos Analíticos</option>
                        <option value="horarios">Schedules / Horários</option>
                        <option value="materiais">Materiais Académicos</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Ficheiro ou URL de Download</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          className="flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-1 focus:ring-amber-500"
                          placeholder="Ficheiro local ou URL externo"
                          value={newLibraryItem.downloadUrl}
                          onChange={(e) => setNewLibraryItem({ ...newLibraryItem, downloadUrl: e.target.value })}
                        />
                        <label className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3.5 rounded-2xl cursor-pointer text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0" title="Carregar Ficheiro Local">
                          <Upload size={14} />
                          <input type="file" onChange={handleLibraryFileChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Descrição / Notas Adicionais</label>
                    <textarea 
                      rows={2}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white resize-none focus:ring-1 focus:ring-amber-500"
                      placeholder="Breve descrição ou instruções sobre como utilizar este ficheiro..."
                      value={newLibraryItem.description}
                      onChange={(e) => setNewLibraryItem({ ...newLibraryItem, description: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={14} />
                    Adicionar Recurso à Biblioteca Académica
                  </button>
                </form>
              </div>

              {/* Library items list */}
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Recursos Publicados ({libraryList.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {libraryList.length === 0 ? (
                    <div className="col-span-full border border-dashed border-slate-800 rounded-4xl p-10 text-center text-slate-500">
                      <BookOpen size={36} className="mx-auto mb-2 opacity-25" />
                      <span className="text-xs font-bold uppercase tracking-widest">Nenhum recurso publicado na biblioteca</span>
                    </div>
                  ) : (
                    libraryList.map((item) => (
                      <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-4xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                            <i className={`fa-solid ${
                              item.category === 'trabalhos' ? 'fa-square-poll-vertical' :
                              item.category === 'mono' ? 'fa-book-open-reader' :
                              item.category === 'planos' ? 'fa-chart-simple' :
                              item.category === 'horarios' ? 'fa-calendar-days' : 'fa-folder-open'
                            } text-xl`}></i>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                                {item.category === 'trabalhos' ? 'Trabalho Científico' :
                                 item.category === 'mono' ? 'Monografia' :
                                 item.category === 'planos' ? 'Plano Analítico' :
                                 item.category === 'horarios' ? 'Horário/Calendário' : 'Material Académico'}
                              </span>
                              <span className="text-[8px] font-semibold text-slate-500 uppercase">{item.date}</span>
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-tight text-white truncate">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Autor: {item.author}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed italic">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-850/40 sm:border-t-0 justify-end">
                          {item.downloadUrl && (
                            <a 
                              href={item.downloadUrl}
                              download={item.title}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 text-slate-400 rounded-xl hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                              title="Descarregar Ficheiro"
                            >
                              <i className="fa-solid fa-download"></i>
                              <span className="sm:hidden">Baixar</span>
                            </a>
                          )}
                          <button 
                            onClick={() => handleDeleteLibraryItem(item.id)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-wider"
                            title="Apagar Recurso"
                          >
                            <Trash2 size={14} />
                            <span className="sm:hidden">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
