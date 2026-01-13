import React, { useState, useEffect } from 'react';
import { Lesson, Module, User } from './types';
import VideoPlayer from './components/VideoPlayer';
import LessonSidebar from './components/LessonSidebar';
import AuthScreen from './components/AuthScreen';
import AdminAddLesson from './components/AdminAddLesson';
import AdminCommentsModal from './components/AdminCommentsModal';
import CommentsSection from './components/CommentsSection';
import CircularProgress from './components/CircularProgress';
import VideoLibraryModal from './components/VideoLibraryModal';
import AdminQuestionBank from './components/AdminQuestionBank';
import FinalExam from './components/FinalExam';
import { db } from './services/database';
import { Menu, Loader2, LogOut, PlusCircle, MessageSquare, ChevronsRight, RefreshCw, Trophy, XCircle, Award, ShieldAlert, Pencil, Save, LayoutList, GraduationCap } from 'lucide-react';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  const [viewState, setViewState] = useState<'VIDEO' | 'FINAL_EXAM' | 'COURSE_RESULT'>('VIDEO');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); 
  
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0 });
  const [courseApproved, setCourseApproved] = useState(false);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminComments, setShowAdminComments] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [hasUnreadComments, setHasUnreadComments] = useState(false);
  
  const [adminLessonInitialData, setAdminLessonInitialData] = useState<any>(null);
  
  useEffect(() => {
    const initApp = async () => {
      // Safety Timeout: Se a sincronização travar, libera o app em 3 segundos
      const safetyTimeout = setTimeout(() => {
          console.warn("Sincronização demorou muito, forçando carregamento...");
          setIsSyncing(false);
          setIsLoadingAuth(false);
      }, 3000);

      try {
        setIsSyncing(true);
        db.init();
        
        // Tenta sincronizar, mas não trava se falhar
        try {
            await db.syncWithGoogleSheets();
        } catch (syncError) {
            console.error("Erro na sincronização inicial:", syncError);
        }
        
        const currentUser = db.getCurrentUser();
        setUser(currentUser);
        
        const storedModules = db.getModules();
        setModules(storedModules);

        // Se tiver usuário e módulos, tenta selecionar a primeira aula válida
        if (currentUser) {
            // Recupera progresso
            const savedProgress = localStorage.getItem(`focusClass_progress_${currentUser.id}`);
            if (savedProgress) {
                try {
                    setCompletedLessons(new Set<string>(JSON.parse(savedProgress)));
                } catch (e) { console.error(e); }
            }

            // Tenta recuperar a última aula ou vai para a primeira
            let foundLesson: Lesson | null = null;
            // Lógica para encontrar primeira aula visível
            for (const mod of storedModules) {
                if (currentUser.role === 'student' && mod.isVisible === false) continue;
                if (mod.lessons.length > 0) {
                    foundLesson = mod.lessons[0];
                    break;
                }
            }
            if (foundLesson) setCurrentLesson(foundLesson);
        }
      } catch (error) {
        console.error("Erro fatal na inicialização:", error);
      } finally {
        clearTimeout(safetyTimeout);
        setIsSyncing(false);
        setIsLoadingAuth(false);
      }
    };
    initApp();
  }, []);

  const handleManualSync = async () => {
      setIsSyncing(true);
      try {
        if (user?.role === 'admin') {
            await db.saveModulesToCloud(modules);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await db.syncWithGoogleSheets();
        const storedModules = db.getModules();
        setModules(storedModules);
      } catch (e) {
          console.error(e);
          alert("Erro ao sincronizar. Verifique sua conexão.");
      } finally {
        setIsSyncing(false);
      }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      const checkUnread = () => {
        const allComments = db.getAllComments();
        const lastCount = parseInt(localStorage.getItem('admin_last_viewed_comments_count') || '0');
        setHasUnreadComments(allComments.length > lastCount);
      };
      checkUnread();
      const interval = setInterval(checkUnread, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user && currentLesson) {
      setIsEditingDescription(false);
    }
  }, [user, currentLesson]);

  const saveProgress = (newSet: Set<string>) => {
    if (!user) return;
    setCompletedLessons(newSet);
    localStorage.setItem(`focusClass_progress_${user.id}`, JSON.stringify(Array.from(newSet)));
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setCompletedLessons(new Set());
    setCurrentLesson(null);
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setViewState('VIDEO');
    setIsSidebarOpen(false);
  };

  const handleEditLesson = (moduleId: string, lesson: Lesson) => {
      setAdminLessonInitialData({
          videoUrl: lesson.videoUrl,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          moduleId: moduleId,
          lessonId: lesson.id
      });
      setShowAdminModal(true);
  };

  const handleVideoComplete = async () => {
    markLessonComplete();
  };

  const markLessonComplete = () => {
    if (!currentLesson) return;
    const newSet = new Set<string>(completedLessons);
    newSet.add(currentLesson.id);
    saveProgress(newSet);

    // Auto-advance logic
    let nextLesson: Lesson | null = null;
    let isFound = false;
    for (const mod of modules) {
        if (user?.role === 'student' && mod.isVisible === false) continue;
        for (const lesson of mod.lessons) {
            if (isFound) { nextLesson = lesson; break; }
            if (lesson.id === currentLesson.id) isFound = true;
        }
        if (nextLesson) break;
    }

    if (nextLesson) {
        setCurrentLesson(nextLesson);
    }
  };

  const startFinalExam = () => {
      setViewState('FINAL_EXAM');
  };

  const handleExamComplete = (passed: boolean, score: number, total: number) => {
      if (user) {
          db.saveExamResult(user.name, user.email, score, total, passed);
      }
      setFinalScore({ correct: score, total });
      setCourseApproved(passed);
      setViewState('COURSE_RESULT');
  };

  const handleAdminAddSuccess = (updatedModules: Module[]) => {
    setModules(updatedModules);
    setShowAdminModal(false);
    if (!currentLesson && updatedModules.length > 0) {
        for(const m of updatedModules) if(m.lessons.length > 0) { setCurrentLesson(m.lessons[0]); break; }
    }
    setAdminLessonInitialData(null);
  };

  const handleCreateLessonFromLibrary = (url: string, title: string) => {
    setShowVideoLibrary(false);
    setAdminLessonInitialData({ videoUrl: url, title: title });
    setShowAdminModal(true);
  };

  const handleOpenAdminComments = () => {
    setShowAdminComments(true);
    setHasUnreadComments(false);
    const allComments = db.getAllComments();
    localStorage.setItem('admin_last_viewed_comments_count', allComments.length.toString());
  };
  
  const totalLessons = modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0;
  const isCourseComplete = progressPercentage === 100;

  if (isSyncing || isLoadingAuth) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) return <AuthScreen onLogin={setUser} />;

  if (viewState === 'FINAL_EXAM') {
      return <FinalExam onComplete={handleExamComplete} onCancel={() => setViewState('VIDEO')} />;
  }

  if (viewState === 'COURSE_RESULT') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8 text-center animate-in zoom-in-95">
            <div className={`p-6 rounded-full mb-6 ${courseApproved ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {courseApproved ? <Trophy size={80} className="text-green-500" /> : <XCircle size={80} className="text-red-500" />}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{courseApproved ? 'Aprovado!' : 'Reprovado'}</h2>
            <p className="text-zinc-400 mb-8 max-w-md">
                {courseApproved ? 'Você completou o curso e passou na prova final.' : 'Você não atingiu 70% de acertos. Estude mais e tente novamente.'}
            </p>
            <div className="text-xl mb-8">Nota: <span className="font-bold text-white">{finalScore.correct}</span> / {finalScore.total}</div>
            
            {courseApproved && (
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg mb-4">
                    <Award size={20} /> Emitir Certificado
                </button>
            )}
            
            <button onClick={() => setViewState('VIDEO')} className="text-zinc-500 hover:text-white underline">Voltar</button>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-100">
      <div className="lg:hidden fixed top-0 w-full z-20 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
         <Logo size={32} showText={true} />
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400"><Menu /></button>
      </div>

      <LessonSidebar 
        modules={modules}
        currentLessonId={currentLesson?.id || ''}
        completedLessons={completedLessons}
        onSelectLesson={handleLessonSelect}
        isSidebarOpen={isSidebarOpen}
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
        isAdmin={user.role === 'admin'}
        onEditLesson={handleEditLesson}
      />

      <main className="flex-1 overflow-y-auto relative w-full pt-16 lg:pt-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
          
          <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-start mb-8 gap-4">
            <div className="flex items-start gap-4">
               {!isDesktopSidebarOpen && (
                 <button onClick={() => setIsDesktopSidebarOpen(true)} className="hidden lg:flex p-2 bg-zinc-800 rounded-lg text-zinc-400"><ChevronsRight size={24} /></button>
               )}
              <div>
                <h2 className="text-sm font-medium text-indigo-400 mb-1">Módulo Atual</h2>
                <h1 className="text-3xl font-bold text-white leading-tight">{currentLesson?.title || 'Selecione uma aula'}</h1>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 self-end md:self-auto">
               {user.role === 'admin' && (
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-[10px] font-bold tracking-wider uppercase mb-1">
                       <ShieldAlert size={12} /> Modo Administrador
                   </div>
               )}

               <div className="flex items-center gap-4">
                {user.role === 'admin' && (
                    <div className="flex items-center gap-2 mr-2">
                    <button onClick={handleManualSync} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20" title="Forçar Sincronização"><RefreshCw size={20} /></button>
                    <button onClick={() => setShowQuestionBank(true)} className="p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 border border-zinc-700" title="Banco de Questões (Prova Final)"><LayoutList size={20} /></button>
                    <button onClick={handleOpenAdminComments} className="relative p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 border border-zinc-700 group" title="Comentários">
                        <MessageSquare size={20} />
                        {hasUnreadComments && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                    </button>
                    <button onClick={() => { setAdminLessonInitialData(null); setShowAdminModal(true); }} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20" title="Adicionar Aula"><PlusCircle size={20} /></button>
                    </div>
                )}
                
                <div className="flex items-center gap-4 pl-4 border-l border-zinc-800 bg-zinc-900/50 p-2 rounded-xl">
                    <div className="flex flex-col items-center"><CircularProgress percentage={progressPercentage} size={42} strokeWidth={4} /></div>
                    <div className="flex items-center gap-3 cursor-default">
                    <div className="text-right"><p className="text-sm font-bold text-zinc-200">{user.name}</p><p className="text-xs text-zinc-500 capitalize">{user.role === 'admin' ? 'Administrador' : 'Estudante'}</p></div>
                    </div>
                    <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 ml-2" title="Sair"><LogOut size={20} /></button>
                </div>
               </div>
            </div>
          </div>

          {currentLesson ? (
              <div className="space-y-6">
                <VideoPlayer 
                  key={`video-${currentLesson.id}`}
                  videoUrl={currentLesson.videoUrl}
                  initialTime={0}
                  onProgress={() => {}}
                  onComplete={handleVideoComplete}
                  autoPlay={true}
                />
                
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-white">Sobre esta aula</h3>
                      {user.role === 'admin' && !isEditingDescription && (
                          <button onClick={() => { setTempDescription(currentLesson.description); setIsEditingDescription(true); }} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-indigo-400 rounded-lg"><Pencil size={16} /></button>
                      )}
                  </div>
                  {isEditingDescription ? (
                      <div className="space-y-3">
                          <textarea value={tempDescription} onChange={(e) => setTempDescription(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl p-4 outline-none resize-y min-h-[120px]" />
                          <div className="flex justify-end gap-2">
                              <button onClick={() => setIsEditingDescription(false)} className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancelar</button>
                              <button onClick={() => { const updated = db.updateLessonDescription(currentLesson.id, tempDescription); setModules(updated); setCurrentLesson({...currentLesson, description: tempDescription}); setIsEditingDescription(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"><Save size={16} /> Salvar</button>
                          </div>
                      </div>
                  ) : <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{currentLesson.description}</p>}
                </div>

                <CommentsSection lessonId={currentLesson.id} currentUser={user} />
              </div>
          ) : (
             <div className="text-center text-zinc-500 mt-20">
                {modules.length === 0 ? "Nenhuma aula cadastrada ainda." : "Selecione uma aula no menu lateral."}
             </div>
          )}

          {isCourseComplete && (
              <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-1000">
                  <button 
                    onClick={startFinalExam}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 transform hover:scale-105 transition-all border-4 border-yellow-300"
                  >
                      <GraduationCap size={32} />
                      FAZER PROVA FINAL
                  </button>
              </div>
          )}
        </div>
      </main>
      
      {showAdminModal && <AdminAddLesson modules={modules} onClose={() => setShowAdminModal(false)} onSuccess={handleAdminAddSuccess} initialData={adminLessonInitialData} />}
      {showAdminComments && <AdminCommentsModal modules={modules} onClose={() => setShowAdminComments(false)} />}
      {showVideoLibrary && <VideoLibraryModal onClose={() => setShowVideoLibrary(false)} onCreateLesson={handleCreateLessonFromLibrary} />}
      {showQuestionBank && <AdminQuestionBank onClose={() => setShowQuestionBank(false)} />}
    </div>
  );
};

export default App;