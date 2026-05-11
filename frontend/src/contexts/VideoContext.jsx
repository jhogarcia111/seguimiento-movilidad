import { createContext, useContext, useState, useCallback } from 'react';

const VideoContext = createContext();

export function VideoProvider({ children }) {
  const [pageVideos, setPageVideos] = useState([]);

  // Registrar un video de página
  const registerPageVideo = useCallback((videoRef) => {
    if (videoRef) {
      setPageVideos(prev => {
        if (!prev.includes(videoRef)) {
          return [...prev, videoRef];
        }
        return prev;
      });
    }
  }, []);

  // Desregistrar un video de página
  const unregisterPageVideo = useCallback((videoRef) => {
    setPageVideos(prev => prev.filter(ref => ref !== videoRef));
  }, []);

  // Pausar todos los videos de página
  const pauseAllPageVideos = useCallback(() => {
    setPageVideos(prev => {
      // Pausar todos los videos actuales
      prev.forEach(videoRef => {
        if (videoRef && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      });
      return prev; // No cambiar el estado, solo pausar los videos
    });
  }, []);

  // Reanudar todos los videos de página
  const resumeAllPageVideos = useCallback(() => {
    setPageVideos(prev => {
      // Reanudar todos los videos actuales
      prev.forEach(videoRef => {
        if (videoRef && videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(console.error);
        }
      });
      return prev; // No cambiar el estado, solo reanudar los videos
    });
  }, []);

  // Notificar que un modal se abrió
  const onModalOpen = useCallback(() => {
    pauseAllPageVideos();
  }, [pauseAllPageVideos]);

  // Notificar que un modal se cerró
  const onModalClose = useCallback(() => {
    resumeAllPageVideos();
  }, [resumeAllPageVideos]);

  return (
    <VideoContext.Provider value={{
      registerPageVideo,
      unregisterPageVideo,
      onModalOpen,
      onModalClose
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoContext() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideoContext must be used within VideoProvider');
  }
  return context;
}

