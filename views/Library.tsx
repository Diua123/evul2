
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { LibraryItem, Language } from '../types';
import { storage } from '../services/storage';
import { subscribeToLibrary, addLibraryItemFB, deleteLibraryItemFB } from '../services/firebaseService';
import { LanguageContext } from '../App';
import { t } from '../services/i18n';

// Itens estáticos da biblioteca (arquivos na pasta public)
const STATIC_LIBRARY_ITEMS: LibraryItem[] = [
  // Adicione os seus ficheiros estáticos aqui
  // Exemplo:
  // {
  //   id: 'static-plano-1',
  //   title: 'Plano Analítico - Matemática I',
  //   author: 'Departamento de Matemática',
  //   category: 'planos',
  //   date: '2026-03-13',
  //   description: 'Plano detalhado da disciplina de Matemática I para o primeiro semestre.',
  //   downloadUrl: '/planos/plano_matematica.pdf'
  // }
];

const Library: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = storage.getCurrentUser();

  useEffect(() => {
    if (!category) return;
    
    storage.setLastViewedLib();
    
    // Filtra os itens estáticos para a categoria atual
    const staticItems = STATIC_LIBRARY_ITEMS.filter(item => item.category === category);
    
    if (!currentUser) {
      setItems(staticItems);
      return;
    }
    
    const unsubscribe = subscribeToLibrary(category, (firebaseItems) => {
      // Junta os itens estáticos com os itens vindos do Firebase
      setItems([...staticItems, ...firebaseItems]);
    });
    return () => unsubscribe();
  }, [category, currentUser]);

  const handleDelete = async (itemId: string) => {
    try {
      await deleteLibraryItemFB(itemId);
    } catch (err) {
      console.error(err);
    }
  };

  const getTitle = () => {
    switch (category) {
      case 'trabalhos': return t('scientific_works', language);
      case 'mono': return t('monographs', language);
      case 'planos': return t('analytical_plans', language);
      case 'horarios': return t('schedules', language);
      case 'materiais': return t('academic_materials', language);
      default: return t('library', language);
    }
  };

  const filteredItems = items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.author.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-ev-dark transition-colors duration-200">
      <header className="bg-ev-blue text-white px-4 py-3 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:scale-110 transition-transform">
            <i className="fa-solid fa-arrow-left text-2xl"></i>
          </Link>
          <h1 className="text-xl font-bold tracking-tight uppercase tracking-tighter">{getTitle()}</h1>
        </div>
      </header>

      <main className="w-full p-6 flex-1 py-10">
        <>
          <div className="mb-10 flex flex-col justify-between gap-6">
            <div><h2 className="text-3xl font-black text-ev-blue dark:text-white uppercase tracking-tighter">{t('library', language)}</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{getTitle()}</p></div>
            <div className="relative">
              <input type="text" placeholder={t('search', language)} className="w-full bg-white dark:bg-gray-800 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-ev-blue shadow-sm dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <i className="fa-solid fa-magnifying-glass absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 text-lg"></i>
            </div>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-24 rounded-5xl shadow-sm text-center border border-dashed border-gray-200 dark:border-gray-700 animate-fadeIn">
              <i className="fa-solid fa-folder-open text-6xl text-gray-200 mb-6 mx-auto"></i>
              <p className="text-xl font-black uppercase tracking-widest text-gray-400">{t('no_files', language)}</p>
              <p className="text-xs mt-2 italic text-gray-400">Os materiais são geridos e publicados exclusivamente pelo Administrador.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {filteredItems.map((item, idx) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-4xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all animate-fadeIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-ev-blue/10 rounded-2xl flex items-center justify-center text-ev-blue">
                        <i className="fa-solid fa-file-lines text-2xl"></i>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.date}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 leading-tight uppercase tracking-tight">{item.title}</h3>
                    <p className="text-[10px] text-ev-brown font-black mb-4 uppercase italic">Autor: {item.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 line-clamp-3 leading-relaxed">{item.description}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex gap-4 items-center">
                        <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-ev-blue font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                          <i className="fa-solid fa-eye text-xs"></i> {t('view', language)}
                        </a>
                        {currentUser?.email === 'juniordiua@gmail.com' && (
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                            <i className="fa-solid fa-trash text-xs"></i> Apagar
                          </button>
                        )}
                      </div>
                      <a href={item.downloadUrl} download={`${item.title}.pdf`} className="bg-ev-blue text-white px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-1">
                        <i className="fa-solid fa-download text-xs"></i> {t('download', language)}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      </main>
      <Footer />
    </div>
  );
};

export default Library;
