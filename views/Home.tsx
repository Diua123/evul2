
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { isFirebaseConfigured } from '../services/firebase';
import { 
  subscribeToMessages, 
  subscribeToPublications, 
  subscribeToAllMyMessages, 
  subscribeToAllLibraryItems,
  subscribeToSystemConfig,
  subscribeToAnnouncements,
  subscribeToMyNotifications,
  updateUserFB
} from '../services/firebaseService';
import { LanguageContext } from '../App';
import { t } from '../services/i18n';
import Footer from '../components/Footer';
import { Language, Announcement, SystemNotification, HomeSlide } from '../types';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { 
  resetPushSessionTime, 
  requestNotificationPermission, 
  processIncomingNotifications 
} from '../services/pushNotificationService';

interface HomeProps {
  toggleTheme: () => void;
  isDark: boolean;
  onLogout: () => void;
}

const Home: React.FC<HomeProps> = ({ toggleTheme, isDark, onLogout }) => {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [hasNewPubs, setHasNewPubs] = useState(false);
  const [hasNewLib, setHasNewLib] = useState(false);
  const { language, setLanguage } = useContext(LanguageContext);
  
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotification = (id: string) => {
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
  };

  // PWA Install States & Effects
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isPwaDismissed, setIsPwaDismissed] = useState(() => {
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // Listen to beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  const handleDismissPwaBanner = () => {
    setIsPwaDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };
  
  // Default fallback slides
  const defaultSlides: HomeSlide[] = [
    {
      id: '1',
      title: 'Exposição de Artes & Design',
      description: 'Mostra anual de trabalhos de investigação e criação artística dos estudantes de Educação Visual.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: '2',
      title: 'Laboratórios & Oficinas Práticas',
      description: 'Espaços equipados para desenvolvimento de projetos em escultura, desenho técnico, cerâmica e pintura.',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: '3',
      title: 'Acervo Académico e Didático',
      description: 'Aceda à biblioteca digital, artigos científicos, trabalhos de graduação e planos analíticos das disciplinas.',
      imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200&auto=format&fit=crop'
    }
  ];

  // Custom Dynamic Console States
  const [logoUrl, setLogoUrl] = useState("up.png");
  const [bannerBadge, setBannerBadge] = useState("Plataforma Académica Oficial");
  const [bannerTitle, setBannerTitle] = useState("Educação Visual & Artes");
  const [bannerSubtitle, setBannerSubtitle] = useState("Bem-vindo ao espaço digital do departamento. Aceda a trabalhos de investigação, planos analíticos, avisos e comunique com estudantes e docentes.");
  const [bannerBgUrl, setBannerBgUrl] = useState("");
  const [slides, setSlides] = useState<HomeSlide[]>(defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // States for student profile completion (for Google Login users)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentYear, setStudentYear] = useState(1);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const activeNotifications = notifications.filter(n => n.id && !dismissedNotifIds.includes(n.id) && n.title !== "Utilizador Conectado");

  const handleLogoClick = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setTimeout(() => navigate('/admin-login'), 0);
        return 0;
      }
      return next;
    });
  };


  const featuresInfo = [
    {
      id: 'posts',
      title: t('posts', language),
      description: "Partilhe momentos, fotos, eventos e atualizações importantes com toda a comunidade do departamento de Educação Visual.",
      icon: "fa-camera",
      link: "/posts",
      color: "from-blue-500 to-blue-700"
    },
    {
      id: 'library',
      title: t('library', language),
      description: "Aceda e partilhe trabalhos científicos, monografias, planos analíticos, horários e materiais de estudo num ambiente organizado.",
      icon: "fa-book",
      link: "/library/trabalhos",
      color: "from-emerald-500 to-emerald-700"
    },
    {
      id: 'communities',
      title: t('communities', language),
      description: "Participe em discussões focadas nos diferentes anos curriculares e num canal geral para debater assuntos académicos.",
      icon: "fa-bullhorn",
      link: "/communities/geral",
      color: "from-purple-500 to-purple-700"
    },
    {
      id: 'chat',
      title: t('chat', language),
      description: "Comunique-se de forma direta e segura com estudantes, chefes de turma e professores registados na plataforma.",
      icon: "fa-comment",
      link: "/chat",
      color: "from-orange-500 to-orange-700"
    }
  ];

  const stats = [
    { label: `${t('students', language)} 1º Ano`, value: 15 },
    { label: `${t('students', language)} 2º Ano`, value: 21 },
    { label: `${t('students', language)} 3º Ano`, value: 11 },
    { label: `${t('students', language)} 4º Ano`, value: 13 },
    { label: t('professors', language), value: 10 }
  ];

  const staff = [
    { name: "Dr. Samuel Bernardo Phuelle", role: "Director do Curso", email: "sphuelle@unilicungo.ac.mz" },
    { name: "Elaine Cabicho Tome", role: "Chefe de Turma - 1º Ano", email: "tomeelaine649@gmail.com" },
    { name: "Inoque Fernando dos Santos", role: "Chefe de Turma - 2º Ano", email: "inoxfernandosantos@gmail.com" },
    { name: "Lapson Jose Carlos Esmael", role: "Chefe de Turma - 3º Ano", email: "lapsonjosecarlosecarlose@gmail.com" },
    { name: "Gavini de Gregorio Fernando", role: "Chefe de Turma - 4º Ano", email: "guevanfernando6@gmail.com" }
  ];

  const docentes = [
    { name: "Samuel Bernardo Phuelle", email: "sbernardo@unilicungo.ac.mz" },
    { name: "Vali Mahomed Ruas Jala", email: "mjala@unilicungo.ac.mz" },
    { name: "Joao Luis Andissene", email: "jandissene@unilicungo.ac.mz" },
    { name: "Amuza Sualei Ibraimo", email: "iamuzasualei@gmail.com" },
    { name: "Madjer Manuel", email: "madjeradei@gmail.com" },
    { name: "Paulo Nela", email: "paulonela15@gmail.com" },
    { name: "Saul Lazaro", email: "saullazaro137@gmail.com" },
    { name: "Madura Maulano Madura", email: "" },
    { name: "Kennuanny Kennedy Carimo", email: "" },
    { name: "Ester Emilio Amade Paposseco Mussa", email: "" }
  ];

  const currentUser = storage.getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      return () => {};
    }

    const lastChatView = storage.getLastViewedChat();
    const lastPubsView = storage.getLastViewedPubs();
    const lastLibView = storage.getLastViewedLib();
    
    // Subscribe to publications for red dot
    const unsubPubs = subscribeToPublications((pubs) => {
      setHasNewPubs(pubs.some(p => new Date(p.date).getTime() > lastPubsView));
    });

    // Subscribe to library for red dot
    const unsubLib = subscribeToAllLibraryItems((items) => {
      setHasNewLib(items.some(i => new Date(i.date).getTime() > lastLibView));
    });

    return () => {
      unsubPubs();
      unsubLib();
    };
  }, [currentUser]);

  // Subscriptions for Icon, Banner, Slides, Announcements and Notifications
  useEffect(() => {
    const unsubConfig = subscribeToSystemConfig((config) => {
      if (config.logoUrl) setLogoUrl(config.logoUrl);
      if (config.bannerBadge !== undefined) setBannerBadge(config.bannerBadge);
      if (config.bannerTitle !== undefined) setBannerTitle(config.bannerTitle);
      if (config.bannerSubtitle !== undefined) setBannerSubtitle(config.bannerSubtitle);
      if (config.bannerBgUrl !== undefined) setBannerBgUrl(config.bannerBgUrl);
      if (config.slides && config.slides.length > 0) {
        setSlides(config.slides);
      }
    });

    const unsubAnn = subscribeToAnnouncements((list) => {
      setAnnouncements(list);
    });

    return () => {
      unsubConfig();
      unsubAnn();
    };
  }, []);

  // Auto-advance slides timer
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    // Reset session timer to only catch alerts starting from this session
    resetPushSessionTime();

    // Check if user has push enabled and request browser permission if default/unset
    const isPushEnabled = currentUser.notificationSettings?.pushEnabled !== false;
    if (isPushEnabled && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().catch(console.error);
    }

    const unsubNotif = subscribeToMyNotifications(currentUser.id, (list) => {
      setNotifications(list);
      // Process incoming notifications for native device/push alert
      const pushEnabled = currentUser?.notificationSettings?.pushEnabled !== false;
      processIncomingNotifications(list, pushEnabled);
    });
    return () => unsubNotif();
  }, [currentUser?.id, currentUser?.notificationSettings?.pushEnabled]);

  const calculateYearFromNumber = (num: string): number => {
    const parts = num.split('.');
    if (parts.length < 3) return 1;
    const yearSuffix = parseInt(parts[2]);
    return isNaN(yearSuffix) ? 1 : Math.max(1, 2027 - yearSuffix);
  };

  const handleNumberChange = (val: string) => {
    setStudentNumber(val);
    const calculated = calculateYearFromNumber(val);
    setStudentYear(calculated);
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && !currentUser.Number) {
      setShowProfileCompletion(true);
    } else {
      setShowProfileCompletion(false);
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setProfileError('O número de estudante é obrigatório.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      const updatedUser = {
        ...currentUser,
        Number: studentNumber.trim(),
        anoFrequencia: studentYear
      };
      
      // Update in Firebase
      await updateUserFB(currentUser.id, {
        Number: studentNumber.trim(),
        anoFrequencia: studentYear
      });

      // Update in Local Storage
      storage.setCachedUser(updatedUser);
      
      setShowProfileCompletion(false);
      // Reload page to apply new cached info
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setProfileError('Erro ao salvar os dados: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };




  useEffect(() => {
    if (!currentUser) return;
    const unsubChat = subscribeToAllMyMessages(currentUser.id, (msgs) => {
      // Check if any message is unread based on its conversation's last viewed time
      const hasUnread = msgs.some(m => {
        if (m.authorId === currentUser.id) return false;
        const convId = m.to === 'general' ? 'general' : (m.to === currentUser.id ? m.authorId : m.to);
        const lastViewed = storage.getLastViewedConversation(convId);
        return m.time > lastViewed;
      });
      setHasNewMessages(hasUnread);
    });
    return () => unsubChat();
  }, [currentUser?.id]);

  const toggleDropdown = (id: string) => {
    if (id === 'library') {
      storage.setLastViewedLib();
      setHasNewLib(false);
    } else if (id === 'communities') {
      storage.setLastViewedPubs();
      setHasNewPubs(false);
    }
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const RedDot = () => (
    <span className="absolute top-3 right-1/2 translate-x-4 flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
    </span>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-ev-dark transition-colors duration-300">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500 text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-center animate-pulse z-[100]">
          <i className="fa-solid fa-triangle-exclamation inline-block mr-2"></i>
          Firebase não configurado. Sincronização offline.
        </div>
      )}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm"
          onClick={() => setFullScreenImage(null)}
        >
          <button className="absolute top-6 right-6 text-white text-3xl hover:scale-125 transition-transform">
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img 
            src={fullScreenImage} 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-zoomIn border-4 border-ev-brown" 
            alt="Full screen view"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Alerta de Configuração Firebase */}
      {!isFirebaseConfigured && (
        <div className="bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center animate-pulse z-[60]">
          <i className="fa-solid fa-triangle-exclamation inline-block mr-2"></i>
          Firebase não configurado. Algumas funcionalidades podem não funcionar.
        </div>
      )}

      <header className="bg-ev-blue text-white px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-4">
          <div 
            onClick={handleLogoClick}
            className="w-12 h-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-md rounded-2xl" />
            ) : (
              <i className="fa-solid fa-graduation-cap text-white text-4xl drop-shadow-md"></i>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase tracking-tighter">Educação Visual - UL</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão de Notificações */}
          <button 
            onClick={() => setShowNotifModal(true)} 
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all shadow-inner border border-white/10 relative mr-1"
            title="Notificações do Sistema"
          >
            <i className="fa-solid fa-bell text-lg drop-shadow-md"></i>
            {activeNotifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-black text-[8px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-ev-blue shadow-lg animate-pulse">
                {activeNotifications.length}
              </span>
            )}
          </button>

          {!currentUser ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme} 
                className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all shadow-inner border border-white/10"
                title="Alternar Tema"
              >
                {isDark ? <i className="fa-solid fa-sun text-lg drop-shadow-md"></i> : <i className="fa-solid fa-moon text-lg drop-shadow-md"></i>}
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ev-brown to-[#5a331a] text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg border border-white/10 active:scale-95 ml-1"
                title={t('login', language)}
              >
                <i className="fa-solid fa-right-to-bracket text-lg drop-shadow-md"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {currentUser.photo && (
                <img src={currentUser.photo} className="w-9 h-9 rounded-full object-cover border-2 border-ev-brown shadow-md" alt="Profile" />
              )}
              <button 
                onClick={handleLogoutClick}
                className="bg-ev-brown text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#5a331a] transition-all shadow-md active:scale-95"
              >
                {t('logout', language)}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* PWA Install Promo Banner - on mobile browsers when not running in standalone mode */}
      {!isStandalone && !isPwaDismissed && (isInstallable || isIOS) && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border-b border-white/10 relative animate-fadeIn z-50">
          <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
              <i className="fa-solid fa-mobile-screen-button text-lg text-amber-300"></i>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-200">Instalar Aplicação</p>
              <h4 className="text-sm font-black tracking-tight leading-tight mt-0.5">
                {isIOS 
                  ? "Adicione ao seu Ecrã Principal para ter a App completa!" 
                  : "Deseja instalar a App no seu telemóvel (estilo APK nativo)?"}
              </h4>
              <p className="text-[10px] text-blue-100 mt-1 font-medium leading-normal max-w-md">
                {isIOS 
                  ? 'Toque no ícone "Partilhar" (seta para cima) no fundo do Safari e escolha "Adicionar ao Ecrã Principal".'
                  : "Terá acesso instantâneo no ecrã inicial, sem barra de navegação do browser, exatamente como uma App nativa."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!isIOS && isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all text-slate-950 px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md w-full sm:w-auto text-center"
              >
                Instalar Agora
              </button>
            )}
            <button 
              onClick={handleDismissPwaBanner}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 transition-all rounded-2xl text-xs font-black uppercase tracking-wider text-white/80 hover:text-white border border-white/5 w-full sm:w-auto text-center"
            >
              Mais Tarde
            </button>
          </div>
        </div>
      )}

      <nav className="bg-ev-blue border-t border-white/10 shadow-lg relative z-40">
        <div className="flex flex-wrap">
          <button onClick={() => toggleDropdown('menu')} className="flex-1 flex flex-col items-center justify-center py-4 text-white hover:bg-white/5 transition-colors group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/20 group-hover:-translate-y-1 transition-all shadow-inner border border-white/5 group-hover:border-white/20">
              <i className="fa-solid fa-bars text-lg opacity-80 group-hover:opacity-100 drop-shadow-sm"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 group-hover:opacity-100">Menu</span>
          </button>
          <button onClick={() => navigate('/posts')} className="flex-1 flex flex-col items-center justify-center py-4 text-white hover:bg-white/5 transition-colors border-l border-white/5 group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 group-hover:bg-blue-500/30 group-hover:-translate-y-1 transition-all shadow-inner border border-white/5 group-hover:border-blue-400/40">
              <i className="fa-solid fa-camera text-lg opacity-80 group-hover:opacity-100 group-hover:text-blue-300 drop-shadow-sm"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 group-hover:opacity-100">{t('posts', language)}</span>
          </button>
          <button onClick={() => toggleDropdown('library')} className="flex-1 flex flex-col items-center justify-center py-4 text-white hover:bg-white/5 transition-colors border-l border-white/5 relative group">
            {hasNewLib && <RedDot />}
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 group-hover:bg-emerald-500/30 group-hover:-translate-y-1 transition-all shadow-inner border border-white/5 group-hover:border-emerald-400/40">
              <i className="fa-solid fa-book text-lg opacity-80 group-hover:opacity-100 group-hover:text-emerald-300 drop-shadow-sm"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 group-hover:opacity-100">{t('library', language)}</span>
          </button>
          <button onClick={() => toggleDropdown('communities')} className="flex-1 flex flex-col items-center justify-center py-4 text-white hover:bg-white/5 transition-colors border-l border-white/5 relative group">
            {hasNewPubs && <RedDot />}
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 group-hover:bg-purple-500/30 group-hover:-translate-y-1 transition-all shadow-inner border border-white/5 group-hover:border-purple-400/40">
              <i className="fa-solid fa-bullhorn text-lg opacity-80 group-hover:opacity-100 group-hover:text-purple-300 drop-shadow-sm"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 group-hover:opacity-100">{t('communities', language)}</span>
          </button>
          <button onClick={() => navigate('/chat')} className="flex-1 flex flex-col items-center justify-center py-4 text-white hover:bg-white/5 transition-colors border-l border-white/5 relative group">
            {hasNewMessages && <RedDot />}
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 group-hover:bg-orange-500/30 group-hover:-translate-y-1 transition-all shadow-inner border border-white/5 group-hover:border-orange-400/40">
              <i className="fa-solid fa-comment text-lg opacity-80 group-hover:opacity-100 group-hover:text-orange-300 drop-shadow-sm"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 group-hover:opacity-100">{t('chat', language)}</span>
          </button>
        </div>
        
        {/* Dropdowns */}
        {openDropdown === 'menu' && (
          <div className="absolute top-full left-0 w-48 bg-ev-blue shadow-2xl rounded-b-3xl border-t border-white/10 animate-fadeIn z-50">
            <Link to="/settings" className="block px-6 py-4 text-white text-xs font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">{t('settings', language)}</Link>
            <Link to="/about" className="block px-6 py-4 text-white text-xs font-black uppercase tracking-widest hover:bg-ev-brown">{t('about', language)}</Link>
          </div>
        )}
        
        {openDropdown === 'library' && (
          <div className="absolute top-full left-[20%] w-60 bg-ev-blue shadow-2xl rounded-b-3xl border-t border-white/10 animate-fadeIn z-50">
            <Link to="/library/trabalhos" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">{t('scientific_works', language)}</Link>
            <Link to="/library/mono" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">{t('monographs', language)}</Link>
            <Link to="/library/planos" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">{t('analytical_plans', language)}</Link>
            <Link to="/library/horarios" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">{t('schedules', language)}</Link>
            <Link to="/library/materiais" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown">{t('academic_materials', language)}</Link>
          </div>
        )}

        {openDropdown === 'communities' && (
          <div className="absolute top-full left-[40%] md:left-[60%] w-60 bg-ev-blue shadow-2xl rounded-b-3xl border-t border-white/10 animate-fadeIn z-50">
            <Link to="/communities/geral" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">Canal Geral</Link>
            <Link to="/communities/ano1" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">1º Ano</Link>
            <Link to="/communities/ano2" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">2º Ano</Link>
            <Link to="/communities/ano3" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown border-b border-white/5">3º Ano</Link>
            <Link to="/communities/ano4" className="block px-6 py-3.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-ev-brown">4º Ano</Link>
          </div>
        )}
      </nav>

      <main className="w-full p-4 sm:p-6 space-y-8 sm:space-y-12 py-8 sm:py-10 relative z-0">
        {/* Carrossel de Destaques / Slides */}
        {slides.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-5xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fadeIn relative group">
            <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-slate-950">
              {slides.map((slide, index) => (
                <div
                  key={slide.id || index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-10">
                    <div className="max-w-2xl space-y-2 text-white">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1">
                        <Sparkles size={12} /> Destaque Académico
                      </span>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-snug drop-shadow-md">
                        {slide.title}
                      </h3>
                      {slide.description && (
                        <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 leading-relaxed font-medium">
                          {slide.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation Controls */}
              {slides.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shadow-xl"
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shadow-xl"
                    aria-label="Próximo slide"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === currentSlide ? 'w-8 bg-amber-400 shadow-md' : 'w-2.5 bg-white/50 hover:bg-white/80'
                        }`}
                        aria-label={`Ir para slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
        {/* Mural de Anúncios e Avisos */}
        {announcements.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-5xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-fadeIn space-y-6">
            <h2 className="text-2xl font-black text-ev-blue dark:text-white mb-6 flex items-center gap-4 uppercase tracking-tighter">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-200/50 dark:border-amber-700/30">
                <i className="fa-solid fa-bullhorn text-2xl drop-shadow-sm animate-bounce"></i>
              </div>
              Anúncios & Avisos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-4xl border border-gray-100 dark:border-gray-600 flex gap-4 items-center">
                  {ann.imageUrl && (
                    <img 
                      src={ann.imageUrl} 
                      alt={ann.title} 
                      className="w-16 h-16 object-cover rounded-2xl border border-gray-100 dark:border-gray-600 shadow-sm flex-shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[8px] font-black tracking-widest text-amber-600 uppercase">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {ann.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 rounded-5xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-fadeIn">
          <h2 className="text-2xl font-black text-ev-blue dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 text-ev-blue dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-200/50 dark:border-blue-700/30">
              <i className="fa-solid fa-arrow-trend-up text-2xl drop-shadow-sm"></i>
            </div>
            {t('statistics', language)}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-4xl text-center border border-gray-100 dark:border-gray-600">
                <div className="text-3xl font-black text-ev-blue dark:text-blue-400 mb-1">{stat.value}</div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-5xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-fadeIn">
          <h2 className="text-2xl font-black text-ev-blue dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-800/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-200/50 dark:border-indigo-700/30">
              <i className="fa-solid fa-users text-2xl drop-shadow-sm"></i>
            </div>
            {t('professors', language)}
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {docentes.map((person, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-4xl border border-transparent hover:border-ev-blue/20 transition-all shadow-sm">
                <div className="text-ev-blue dark:text-blue-400 font-black uppercase tracking-tight">{person.name}</div>
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shadow-inner">
                    <i className="fa-solid fa-envelope text-xs drop-shadow-sm"></i>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
                    {person.email || "Sem e-mail registrado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-5xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-fadeIn">
          <h2 className="text-2xl font-black text-ev-blue dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-200/50 dark:border-emerald-700/30">
              <i className="fa-solid fa-shield-halved text-2xl drop-shadow-sm"></i>
            </div>
            {t('leadership', language)}
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {staff.map((person, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-4xl border border-transparent hover:border-ev-blue/20 transition-all shadow-sm">
                <div className="text-ev-blue dark:text-blue-400 font-black uppercase tracking-tight">{person.name}</div>
                <div className="text-[10px] italic text-gray-400 font-bold uppercase tracking-tighter mb-4">{person.role}</div>
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shadow-inner">
                    <i className="fa-solid fa-envelope text-xs drop-shadow-sm"></i>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
                    {person.email || "Sem e-mail registrado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Pop-up de Notificações */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-5xl p-6 shadow-2xl relative overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-tight text-ev-blue dark:text-white flex items-center gap-2.5">
                <i className="fa-solid fa-bell text-amber-500 animate-pulse"></i>
                Notificações Recentes
              </h3>
              <button 
                onClick={() => setShowNotifModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors relative z-10"
                title="Fechar"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {activeNotifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                  <i className="fa-solid fa-bell-slash text-2xl opacity-20 mb-2"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma notificação nova</p>
                </div>
              ) : (
                activeNotifications.map((notif) => (
                  <div key={notif.id} className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-3xl border border-gray-100 dark:border-gray-750/50 space-y-1 text-left relative group pr-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notif.id) handleDismissNotification(notif.id);
                      }}
                      className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-gray-200/50 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Descartar"
                    >
                      <i className="fa-solid fa-xmark text-[10px]"></i>
                    </button>
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block uppercase">
                      {new Date(notif.createdAt).toLocaleDateString()} às {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wide">{notif.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">{notif.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conclusão de Perfil para login Google */}
      {showProfileCompletion && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-750 rounded-5xl p-8 shadow-2xl relative overflow-hidden text-slate-900 dark:text-slate-100 animate-zoomIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ev-blue/5 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-950 dark:to-slate-900 text-ev-blue dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-200/50 dark:border-blue-800/30 mx-auto mb-4">
                <i className="fa-solid fa-user-pen text-3xl drop-shadow-sm"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Completar Perfil de Estudante
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-sm mx-auto">
                Olá, <span className="font-bold text-ev-blue dark:text-blue-400">{currentUser?.name}</span>! Como entrou com a conta Google, precisamos do seu Número de Estudante para determinar o seu ano académico e dar-lhe acesso aos canais correspondentes.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-250 dark:border-red-900/50 rounded-2xl text-[11px] font-bold text-red-600 dark:text-red-400 text-center uppercase tracking-wide">
                  <i className="fa-solid fa-circle-exclamation inline-block mr-1"></i> {profileError}
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Número de Estudante
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <i className="fa-solid fa-id-card text-xs"></i>
                  </span>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: 1.2.24"
                    value={studentNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-650 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ev-blue dark:focus:ring-blue-500"
                  />
                </div>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                  Use o formato oficial com pontos (Ex: 1.2.24). O ano é detetado a partir deste número.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Ano de Frequência Calculado
                </label>
                <select 
                  value={studentYear}
                  onChange={(e) => setStudentYear(Number(e.target.value))}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-650 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-ev-blue dark:focus:ring-blue-500 text-slate-800 dark:text-white"
                >
                  <option value={1}>1º Ano Curricular</option>
                  <option value={2}>2º Ano Curricular</option>
                  <option value={3}>3º Ano Curricular</option>
                  <option value={4}>4º Ano Curricular</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full bg-gradient-to-r from-ev-blue to-blue-900 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl hover:opacity-95 transition-all shadow-lg active:scale-98 disabled:opacity-50"
              >
                {profileSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    A Gravar Perfil...
                  </span>
                ) : 'Gravar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Home;
