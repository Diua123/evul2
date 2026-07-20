
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { getUsersFB, createUserFB, getUserFB, addNotificationFB } from '../services/firebaseService';
import { User, UserRole } from '../types';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [userType, setUserType] = useState<UserRole>('student');
  const [isRegister, setIsRegister] = useState(false);
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '',
    number: '', 
    password: '', 
    confirmPassword: '', 
    photo: '',
    accessCode: '',
    selectedYear: '1'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatStudentNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.substring(0, 2)}.${digits.substring(2)}`;
    if (digits.length > 6) formatted = `${digits.substring(0, 2)}.${digits.substring(2, 6)}.${digits.substring(6, 10)}`;
    return formatted.substring(0, 12);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFormData({ ...formData, photo: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const calculateYearFromNumber = (number: string): number => {
    const parts = number.split('.');
    if (parts.length < 3) return 1;
    const yearSuffix = parseInt(parts[2]);
    return isNaN(yearSuffix) ? 1 : Math.max(1, 2027 - yearSuffix);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Procurar usuário existente no Firestore
      let dbUser = await getUserFB(user.uid);
      if (!dbUser) {
        // Registrar novo utilizador automaticamente como estudante por padrão
        dbUser = {
          id: user.uid,
          name: user.displayName || 'Estudante Google',
          email: user.email || '',
          photo: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          anoFrequencia: 1,
          role: 'student'
        };
        await createUserFB(dbUser);
      }
      
      storage.setCurrentUserId(user.uid);
      storage.setCachedUser(dbUser);

      onLogin();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao autenticar com o Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.name.trim()) { setError('Nome é obrigatório'); setLoading(false); return; }
        if (formData.password !== formData.confirmPassword) { setError('Senhas não coincidem'); setLoading(false); return; }
        
        if (userType === 'student') {
          try {
            const users = await getUsersFB();
            const existing = users.find(u => u.Number === formData.number);
            if (existing) { setError('Número de estudante já registado'); setLoading(false); return; }
          } catch (err) {
            console.warn("Could not verify duplicate student number due to permission restrictions:", err);
          }
        } else if (userType === 'docente') {
          const firstName = formData.name.trim().split(' ')[0];
          const expectedCode = `@${firstName}`;
          if (formData.accessCode !== expectedCode) {
              setError(`Código inválido.`);
              setLoading(false);
              return;
          }
        }

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;

        const newUser: any = {
          id: uid,
          name: formData.name,
          email: formData.email,
          photo: formData.photo || (userType === 'docente' ? 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png' : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
          anoFrequencia: userType === 'student' ? calculateYearFromNumber(formData.number) : 0,
          role: userType
        };
        
        if (userType === 'student') {
          newUser.Number = formData.number;
        }
        
        await createUserFB(newUser as User);
        storage.setCurrentUserId(uid);
        storage.setCachedUser(newUser as User);

      } else {
        // Login with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;
        
        const user = await getUserFB(uid);
        if (!user) {
          setError('Dados de usuário não encontrados no banco de dados.');
          setLoading(false);
          return;
        }

        // Check if the user is logging in with the correct role tab (optional, but good for UX)
        if (user.role !== userType && !(user.role === 'chefe' && userType === 'student')) {
           setError(`Esta conta pertence a um ${getRoleLabel(user.role)}. Por favor, selecione a aba correta.`);
           setLoading(false);
           return;
        }

        storage.setCurrentUserId(uid);
        storage.setCachedUser(user);
      }

      setTimeout(() => { onLogin(); navigate('/'); }, 800);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao autenticar. Verifique seus dados e tente novamente.');
      }
      setLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case 'docente': return "fa-solid fa-person-chalkboard";
      case 'chefe': return "fa-solid fa-user-check";
      default: return "fa-solid fa-graduation-cap";
    }
  };

  const roleIconClass = getRoleIcon(userType);

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case 'docente': return 'Docente';
      case 'chefe': return 'Chefe de Turma';
      default: return 'Estudante';
    }
  };

  return (
    <div className="min-h-screen bg-ev-blue flex items-center justify-center p-4">
      <div className="w-full bg-white dark:bg-gray-800 rounded-5xl shadow-2xl overflow-hidden animate-fadeIn max-w-md">
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-ev-brown overflow-hidden">
            <i className={`${roleIconClass} text-ev-blue text-3xl`}></i>
          </div>
          <h1 className="text-xl font-black text-ev-blue uppercase tracking-widest">
            {isRegister ? `Novo ${getRoleLabel(userType)}` : `Acesso ${getRoleLabel(userType)}`}
          </h1>
          <p className="text-gray-400 text-[10px] mt-1 font-black uppercase tracking-[0.3em]">Plataforma EV-UL</p>
        </div>

        {/* Abas de Tipo de Usuário */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(['student', 'docente'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => { setUserType(role); setError(''); setIsRegister(false); setFormData({...formData, name: '', accessCode: '', number: '', password: ''}); }}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                userType === role 
                ? 'bg-white dark:bg-gray-800 text-ev-blue border-b-2 border-ev-blue' 
                : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {getRoleLabel(role)}
            </button>
          ))}
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-500 p-4 rounded-3xl text-xs font-bold text-center border border-red-100 animate-bounce">{error}</div>}
            
            {/* Foto apenas no Cadastro */}
            {isRegister && (
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-ev-blue shadow-inner bg-gray-50 flex items-center justify-center group">
                  {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" alt="" /> : <i className="fa-solid fa-camera text-gray-300 group-hover:text-ev-blue transition-colors text-2xl"></i>}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Foto (Opcional)</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">E-mail</label>
              <input type="email" required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>

            {/* --- ESTUDANTE --- */}
            {userType === 'student' && isRegister && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Nome Completo</label>
                  <input type="text" required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Número de Estudante</label>
                  <input type="text" required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner" value={formData.number} onChange={(e) => setFormData({ ...formData, number: formatStudentNumber(e.target.value) })} />
                </div>
              </>
            )}

            {/* --- DOCENTE --- */}
            {userType === 'docente' && (
              <>
                {/* Campos visíveis APENAS no Cadastro */}
                {isRegister && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Nome Completo</label>
                      <input type="text" required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    {/* Campo de Código (Visível no Cadastro) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Código de Acesso</label>
                      <div className="relative">
                        <input 
                          type={showAccessCode ? "text" : "password"} 
                          required 
                          className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner pr-12" 
                          value={formData.accessCode} 
                          onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })} 
                        />
                        <button type="button" onClick={() => setShowAccessCode(!showAccessCode)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ev-blue">
                          {showAccessCode ? <i className="fa-solid fa-eye-slash text-lg"></i> : <i className="fa-solid fa-eye text-lg"></i>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Senha para todos */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner pr-12" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ev-blue">
                  {showPassword ? <i className="fa-solid fa-eye-slash text-lg"></i> : <i className="fa-solid fa-eye text-lg"></i>}
                </button>
              </div>
            </div>
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Confirmar Senha</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} required className="w-full p-4 rounded-3xl border-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-ev-blue shadow-inner pr-12" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ev-blue">
                    {showConfirmPassword ? <i className="fa-solid fa-eye-slash text-lg"></i> : <i className="fa-solid fa-eye text-lg"></i>}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-ev-brown hover:bg-[#5a331a] text-white py-4 rounded-3xl font-black shadow-xl transition-all uppercase tracking-widest flex items-center justify-center gap-3 mt-4 active:scale-95 text-xs">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <i className={isRegister ? "fa-solid fa-user-plus" : "fa-solid fa-right-to-bracket"}></i>
                  {isRegister ? 'Cadastrar' : 'Entrar'}
                </>
              )}
            </button>
          </form>

          {/* Divisor Google Sign-In */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-4 text-[9px] text-gray-450 uppercase tracking-widest font-black">Ou continuar com</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={loading} 
            className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white py-4 rounded-3xl font-black shadow-md uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 transition-all active:scale-95"
          >
            <i className="fa-brands fa-google text-base"></i>
            Entrar com conta Google
          </button>

          {/* Botão de Alternância Login/Cadastro */}
          <div className="mt-8 flex flex-col gap-4 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-ev-blue text-xs font-black uppercase tracking-widest hover:underline">
                {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-gray-400 hover:text-ev-blue transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-eye text-sm"></i> Visitar como Convidado
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
