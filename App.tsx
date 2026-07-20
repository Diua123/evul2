
import React, { useState, useEffect, useCallback, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './views/Home';
import About from './views/About';
import Chat from './views/Chat';
import Communities from './views/Communities';
import ArtGallery from './views/ArtGallery';
import UserPosts from './views/UserPosts';
import Settings from './views/Settings';
import Login from './views/Login';
import Library from './views/Library';
import AdminPanel from './views/AdminPanel';
import { storage } from './services/storage';
import { getUserFB, updateUserStatusFB } from './services/firebaseService';
import { notificationService } from './services/notifications';
import { Theme, Language, User } from './types';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { WifiOff, Smartphone, QrCode, Download, Info, Wifi, Battery, Signal } from 'lucide-react';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: Language.PT,
  setLanguage: () => {},
});

const AppContent: React.FC = () => {
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(storage.getTheme());
  const language = Language.PT;
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Heartbeat para status online
  useEffect(() => {
    if (!isAuth) return;
    
    const userId = storage.getCurrentUserId();
    if (!userId) return;

    // Atualiza imediatamente ao entrar
    updateUserStatusFB(userId, true);

    // Intervalo para manter online (a cada 2 minutos)
    const interval = setInterval(() => {
      updateUserStatusFB(userId, true);
    }, 120000);

    // Listener para quando a aba é fechada ou visibilidade muda
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateUserStatusFB(userId, false);
      } else {
        updateUserStatusFB(userId, true);
      }
    };

    window.addEventListener('beforeunload', () => updateUserStatusFB(userId, false));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', () => updateUserStatusFB(userId, false));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateUserStatusFB(userId, false);
    };
  }, [isAuth]);

  const setLanguage = (lang: Language) => {
    // Language is now fixed to PT
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await getUserFB(firebaseUser.uid);
          if (user) {
            storage.setCurrentUserId(firebaseUser.uid);
            storage.setCachedUser(user);
            setIsAuth(true);
          } else {
            // User exists in Auth but not in Firestore
            storage.logout();
            setIsAuth(false);
          }
        } catch (error) {
          console.error("Erro ao sincronizar usuário:", error);
          // Em caso de erro de rede, mantemos o usuário logado com o cache local
          const cached = storage.getCurrentUser();
          if (cached && cached.id === firebaseUser.uid) {
            setIsAuth(true);
          } else {
            setIsAuth(false);
          }
        }
      } else {
        storage.logout();
        setIsAuth(false);
      }
      setIsAppLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Solicitar permissão de notificação ao iniciar
    notificationService.requestPermission();

    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storage.setTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === Theme.LIGHT ? Theme.DARK : Theme.LIGHT));
  }, []);

  const handleLoginStatus = useCallback(() => {
    setIsAuth(!!storage.getCurrentUserId());
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    storage.logout();
    setIsAuth(false);
  }, []);

  const requiresAuth = (component: React.ReactNode) => {
    return isAuth ? component : <Navigate to="/login" replace />;
  };

  const requiresChatAccess = (component: React.ReactNode) => {
    const user = storage.getCurrentUser();
    if (!isAuth) return <Navigate to="/login" replace />;
    // Permitir todos os usuários autenticados no chat (Estudantes, Chefes e Docentes)
    return component;
  };

  if (isOffline) {
    return (
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex justify-center items-center transition-colors duration-200 p-4">
        <div className="bg-white dark:bg-ev-dark p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="text-red-500 dark:text-red-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Sem ligação à Internet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Parece que está offline. Verifique a sua ligação Wi-Fi ou dados móveis para continuar a usar a plataforma.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors w-full"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex justify-center items-center transition-colors duration-200">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-16 relative w-32">
            <div className="w-5 h-5 bg-blue-500 rounded-full absolute left-4 animate-swap1 shadow-md"></div>
            <div className="w-5 h-5 bg-[#6B3F1F] rounded-full absolute left-12 animate-swap2 shadow-md"></div>
            <div className="w-5 h-5 bg-white rounded-full absolute left-20 animate-swap3 shadow-md border border-gray-200 dark:border-gray-700"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium animate-pulse">A carregar a plataforma...</p>
        </div>
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin-dashboard') || location.pathname.startsWith('/admin-login');

  if (isAdminRoute) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <div className="w-full h-screen bg-slate-950 flex justify-center overflow-hidden">
          <div className="w-full max-w-7xl h-screen bg-slate-950 flex flex-col shadow-2xl border-x border-slate-800/80">
            <Routes>
              <Route path="/admin-dashboard" element={<AdminPanel />} />
              <Route path="/admin-login" element={<AdminPanel />} />
              <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950 flex flex-col lg:flex-row items-center justify-center sm:p-4 md:p-8 transition-colors duration-200 gap-8">
        
        {/* Painel de Informação Lateral (Desktop apenas) */}
        <div className="hidden lg:flex flex-col max-w-sm bg-white dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 self-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Simulador Android</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ambiente de Testes Web</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
            Esta plataforma foi desenvolvida como uma <strong>App Nativa do Android</strong> utilizando <strong>Capacitor</strong> e <strong>PWA</strong>. O design está totalmente otimizado para ecrãs táteis móveis.
          </p>

          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={18} className="text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Testar no Telemóvel</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Aponte a câmara do seu smartphone para o QR Code abaixo para abrir a aplicação diretamente no seu telemóvel:
            </p>
            <div className="flex justify-center bg-white p-3 rounded-xl border border-gray-100 shadow-inner w-fit mx-auto">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://ais-pre-kureth776jl6qwqlrqcfvg-520982050201.europe-west2.run.app" 
                alt="QR Code do App" 
                className="w-36 h-36"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 text-xs">
              <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold">1</div>
              <p className="text-gray-600 dark:text-gray-400"><strong>Como PWA:</strong> Abra o link acima no Chrome do telemóvel, toque em Opções e escolha <em>"Adicionar ao Ecrã Principal"</em> para instalar como App nativa.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold">2</div>
              <p className="text-gray-600 dark:text-gray-400"><strong>Como APK Nativa:</strong> Descarregue o código do projeto, abra o diretório <code>/android</code> no Android Studio e compile diretamente o ficheiro <code>.apk</code>.</p>
            </div>
          </div>
        </div>

        {/* Mockup do Dispositivo Android */}
        <div className="w-full h-screen sm:h-auto relative flex flex-col items-center">
          {/* Botões Físicos Laterais do Mockup (Esquerda: Volume, Direita: Power) - Visíveis apenas no Desktop */}
          <div className="hidden sm:block absolute -left-[14px] top-40 w-[4px] h-16 bg-slate-800 dark:bg-slate-700 rounded-l-md shadow-md"></div>
          <div className="hidden sm:block absolute -left-[14px] top-60 w-[4px] h-24 bg-slate-800 dark:bg-slate-700 rounded-l-md shadow-md"></div>
          <div className="hidden sm:block absolute -right-[14px] top-48 w-[4px] h-20 bg-slate-800 dark:bg-slate-700 rounded-r-md shadow-md"></div>

          {/* Moldura do Telemóvel */}
          <div className="w-full h-[100dvh] sm:w-[390px] sm:h-[820px] bg-gray-50 dark:bg-ev-dark sm:border-[10px] sm:border-slate-900 sm:rounded-[52px] sm:shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
            
            {/* Barra de Status do Android - Visível apenas no Desktop/Tablet simulado */}
            <div className="hidden sm:flex bg-ev-blue text-white h-11 px-6 items-center justify-between text-xs font-semibold select-none shrink-0 z-50">
              <div className="flex items-center gap-1.5">
                <span>09:41</span>
              </div>
              
              {/* Punch Hole para Câmera Frontal */}
              <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-gray-900 rounded-full border border-gray-800 absolute right-4"></div>
              </div>

              <div className="flex items-center gap-2">
                <Signal size={14} className="text-white" />
                <Wifi size={14} className="text-white" />
                <Battery size={16} className="text-white" />
              </div>
            </div>

            {/* Conteúdo do App */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
              <Routes>
                <Route path="/" element={<Home toggleTheme={toggleTheme} isDark={theme === Theme.DARK} onLogout={handleLogout} />} />
                <Route path="/about" element={<About />} />
                {/* Chat acessível para todos os usuários autenticados */}
                <Route path="/chat" element={requiresChatAccess(<Chat />)} />
                <Route path="/communities" element={requiresAuth(<Communities />)} />
                <Route path="/communities/:tab" element={requiresAuth(<Communities />)} />
                <Route path="/gallery" element={<ArtGallery />} />
                <Route path="/posts" element={requiresAuth(<UserPosts />)} />
                <Route path="/library/:category" element={requiresAuth(<Library />)} />
                <Route path="/settings" element={requiresAuth(<Settings onLogout={handleLogout} toggleTheme={toggleTheme} isDark={theme === Theme.DARK} />)} />
                <Route path="/login" element={<Login onLogin={handleLoginStatus} />} />
                <Route path="/admin-dashboard" element={<AdminPanel />} />
                <Route path="/admin-login" element={<AdminPanel />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* Barra de Gestos do Android (Home Bar) - Visível apenas no Desktop/Tablet */}
            <div className="hidden sm:flex bg-gray-50 dark:bg-ev-dark h-5 justify-center items-center select-none shrink-0 z-50 pb-2">
              <div className="w-32 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </LanguageContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
