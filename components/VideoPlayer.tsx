import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Lock, ShieldAlert, FastForward, Play } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  onComplete: () => void;
  autoPlay?: boolean;
  initialTime?: number;
  onProgress?: (time: number) => void;
  allowSkip?: boolean;
  thumbnailUrl?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  onComplete, 
  autoPlay = false, 
  initialTime = 0,
  onProgress,
  allowSkip = false,
  thumbnailUrl
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<{code: number, msg: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Controle de progresso assistido
  const [maxWatched, setMaxWatched] = useState(initialTime);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const lockTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setIsEnded(false);
    setError(null);
    setMaxWatched(initialTime);
    
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
    }
  }, [videoUrl, initialTime]);

  const handleSeekCheck = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (allowSkip || isEnded) return;
    
    const vid = e.currentTarget;
    // Se o usuário tentar pular mais de 2 segundos além do que já assistiu
    if (vid.currentTime > maxWatched + 2.0) {
      vid.currentTime = maxWatched;
      triggerLockWarning();
    }
  };

  const triggerLockWarning = () => {
    setShowLockedMessage(true);
    if (lockTimeoutRef.current) window.clearTimeout(lockTimeoutRef.current);
    lockTimeoutRef.current = window.setTimeout(() => setShowLockedMessage(false), 3000);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    const current = vid.currentTime;

    if (onProgress) onProgress(current);

    // Se estiver assistindo conteúdo novo, atualiza o limite máximo
    if (current > maxWatched) {
      // Impede burlar via script se o salto for muito grande entre frames de atualização
      if (current > maxWatched + 3.0 && !allowSkip && !isEnded) {
        vid.currentTime = maxWatched;
        triggerLockWarning();
      } else {
        setMaxWatched(current);
      }
    }
  };

  const startVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group border border-zinc-800">
      
      {/* Aviso de Bloqueio (Anti-Skip) */}
      {showLockedMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <div className="bg-zinc-900 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center gap-3 shadow-2xl animate-shake">
            <div className="bg-red-500/20 p-3 rounded-full">
              <Lock className="text-red-500" size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Avanço Bloqueado</p>
              <p className="text-zinc-400 text-sm">Você precisa assistir ao conteúdo para progredir.</p>
            </div>
          </div>
        </div>
      )}

      {/* Capa / Play Inicial */}
      {!isPlaying && !isEnded && (
        <div 
          className="absolute inset-0 z-40 bg-zinc-900 flex items-center justify-center cursor-pointer group"
          onClick={startVideo}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" alt="Capa" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-black"></div>
          )}
          <div className="relative z-10 bg-indigo-600 p-6 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform">
            <Play className="text-white fill-white" size={32} />
          </div>
          <p className="absolute bottom-10 text-zinc-400 font-medium group-hover:text-white transition-colors">Clique para iniciar sua aula</p>
        </div>
      )}

      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeekCheck}
        onEnded={() => {
          setIsEnded(true);
          onComplete();
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={() => setError({ code: 1, msg: "Erro ao carregar vídeo. Verifique o link." })}
      />

      {/* Badge de Proteção */}
      <div className="absolute top-4 right-4 z-20">
        {allowSkip ? (
          <div className="bg-amber-500/90 text-black text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <FastForward size={12} /> MODO ADMIN
          </div>
        ) : (
          <div className="bg-black/60 backdrop-blur-md text-zinc-300 text-[10px] font-bold px-3 py-1 rounded-full border border-zinc-700/50 flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-indigo-400" /> PROTEÇÃO ANTI-SKIP ATIVA
          </div>
        )}
      </div>

      {isLoading && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <Loader2 className="text-indigo-500 animate-spin" size={48} />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 z-50">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h3 className="text-white font-bold text-xl mb-2">Ops! Algo deu errado</h3>
          <p className="text-zinc-400 max-w-xs">{error.msg}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;