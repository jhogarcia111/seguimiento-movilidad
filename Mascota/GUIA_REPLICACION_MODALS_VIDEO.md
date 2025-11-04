# Guía para Replicar Sistema de Modals con Videos

## 📋 Descripción General

Este documento proporciona instrucciones detalladas para replicar el sistema de modals con videos que muestra:
- **Video a la Izquierda** (en desktop) o arriba (en móvil)
- **Textos aleatorios** diferentes cada vez que se abre el modal
- **Videos aleatorios** seleccionados de una lista
- **Botones de acción** personalizables (como "¡Genial!", "Anímate", "Suerte", etc.)

El sistema está construido con **React**, **Tailwind CSS** y utiliza **lucide-react** para iconos.

---

## 🏗️ Arquitectura del Sistema

El sistema consta de 3 componentes principales:

1. **NovaModal.js** - Componente visual del modal
2. **useNovaModal.js** - Hook personalizado para gestionar la lógica
3. **Layout.js** - Componente que integra y usa los modals

---

## 📦 Dependencias Requeridas

Asegúrate de tener estas dependencias en tu `package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.294.0",
    "react-router-dom": "^6.8.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

## 📁 Estructura de Archivos

Crea la siguiente estructura de archivos:

```
tu-proyecto/
├── src/
│   ├── components/
│   │   └── NovaModal.js
│   ├── hooks/
│   │   └── useNovaModal.js
│   └── (tu componente principal que usará los modals)
├── public/
│   └── videos/
│       ├── video1.mp4
│       ├── video2.mp4
│       └── (tus videos aquí)
└── package.json
```

---

## 🔧 Implementación Paso a Paso

### 1. Crear el Componente NovaModal

**Archivo: `src/components/NovaModal.js`**

```javascript
import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';

const NovaModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  module, 
  videoPath, 
  message, 
  title,
  confirmButtonText = "¡Genial!" // Texto personalizable del botón
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoRef, setVideoRef] = useState(null);

  // Auto-play cuando el modal se abre
  useEffect(() => {
    if (isOpen && videoRef) {
      // Asegurar que el video esté muted para auto-play
      videoRef.muted = true;
      setIsMuted(true);
      
      const playVideo = async () => {
        try {
          await videoRef.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Error al reproducir video:', error);
          // Reintentar después de un delay
          setTimeout(() => {
            if (videoRef) {
              videoRef.play().catch(console.error);
            }
          }, 500);
        }
      };
      
      playVideo();
    }
  }, [isOpen, videoRef]);

  // Pausar video cuando el modal se cierra
  useEffect(() => {
    if (!isOpen && videoRef) {
      videoRef.pause();
      setIsPlaying(false);
    }
  }, [isOpen, videoRef]);

  const togglePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleConfirm = () => {
    if (videoRef) {
      videoRef.pause();
    }
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
        <div className="flex flex-col lg:flex-row">
          {/* Content Section - IZQUIERDA (primero en móvil) */}
          <div className="w-full lg:w-1/2 p-4 sm:p-5 lg:p-6 flex flex-col justify-center order-2 lg:order-1">
            {/* Header con avatar y título */}
            <div className="flex items-center mb-3 lg:mb-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2 lg:mr-3">
                <span className="text-white font-bold text-sm lg:text-base">N</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                  Nova, 'La Reclutadora Digital'
                </h2>
                <p className="text-xs lg:text-sm text-gray-600">{title}</p>
              </div>
            </div>

            {/* Mensaje con scroll */}
            <div className="bg-gray-50 rounded-lg p-3 lg:p-4 mb-4 lg:mb-5 max-h-60 overflow-y-auto">
              <div className="text-gray-800 text-xs sm:text-sm lg:text-sm leading-relaxed whitespace-pre-line">
                {message}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 text-sm sm:text-base"
              >
                {confirmButtonText}
              </button>
            </div>
          </div>

          {/* Video Section - DERECHA (segundo en desktop) */}
          <div className="w-full lg:w-1/2 bg-gray-100 flex items-center justify-center relative h-64 lg:h-auto order-1 lg:order-2">
            <video
              ref={setVideoRef}
              className="w-full h-full object-cover"
              loop
              autoPlay
              playsInline
              muted
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={() => {
                if (videoRef && isOpen) {
                  videoRef.play().catch(console.error);
                }
              }}
            >
              <source src={videoPath} type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
            
            {/* Controles de video */}
            <div className="absolute bottom-2 left-2 right-2 lg:bottom-4 lg:left-4 lg:right-4 flex items-center justify-between bg-black bg-opacity-50 rounded-lg p-2">
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <Play className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
              </button>
              
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isMuted ? "Activar sonido" : "Silenciar"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Botón de cerrar (X) */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </div>
  );
};

export default NovaModal;
```

**Notas importantes:**
- El video está a la **derecha** usando `order-2 lg:order-2` en la sección de video y `order-1 lg:order-1` en la sección de contenido
- El contenido está a la **izquierda** en desktop
- En móvil, el video aparece primero (arriba) y el contenido abajo

---

### 2. Crear el Hook useNovaModal

**Archivo: `src/hooks/useNovaModal.js`**

```javascript
import { useState } from 'react';

const useNovaModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Función para generar mensajes (puedes personalizarla)
  const generateMessage = (message) => {
    return message;
  };

  // Mensajes y videos por módulo/sección
  const novaMessages = {
    dashboard: {
      title: "Dashboard Principal",
      message: generateMessage("🏠 ¡Hola! Soy Nova, tu asistente. 👋\n\nTe ayudo a organizar y analizar todos tus proyectos. 📊\n\n¡Vamos a revisar el estado general! 🎯"),
      video: "/videos/Nova-Dashboard.mp4"
    },
    jobs: {
      title: "Gestión de Vacantes",
      message: generateMessage("💼 ¡Perfecto! Vamos a gestionar las vacantes. 🚀\n\nTe ayudo a crear nuevas posiciones y organizar todos los cargos. 📝\n\n¡Empecemos! 🏢"),
      video: "/videos/Nova-Tengo-un-nuevo-cargo-para-postular.mp4"
    },
    // Agrega más módulos según necesites
  };

  const openModal = (module) => {
    const data = novaMessages[module];
    if (data) {
      setModalData(data);
      setIsOpen(true);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalData(null);
  };

  const confirmAndNavigate = (navigate, path) => {
    closeModal();
    navigate(path);
  };

  return {
    isOpen,
    modalData,
    novaMessages,
    openModal,
    closeModal,
    confirmAndNavigate
  };
};

export default useNovaModal;
```

---

### 3. Implementar Sistema de Textos y Videos Aleatorios

En tu componente principal (ej: `Layout.js` o donde uses los modals), agrega:

```javascript
import React, { useState, useEffect } from 'react';
import NovaModal from './components/NovaModal';
import useNovaModal from './hooks/useNovaModal';

const TuComponente = () => {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const { isOpen, modalData, openModal, closeModal } = useNovaModal();

  // ===== TEXTS ALEATORIOS =====
  const motivationalMessages = [
    "🌟 ¡Hoy es el día perfecto para cambiar vidas! 💫\n\nCada acción que realizas tiene el potencial de transformar. ✨\n\n¡Vamos a hacer que la magia suceda! 🎭",
    "👥 ¡Conozcamos personas extraordinarias hoy! 🌟\n\nHay alguien esperando tu ayuda, alguien cuyo talento puede revolucionar. 💎\n\n¡La persona correcta está ahí! ⭐",
    "🚀 ¡Vamos a conseguir resultados increíbles! 💼\n\nCada análisis que realizas construye el futuro. 🏗️\n\n¡Tu intuición y experiencia son la clave! 🗝️",
    // Agrega más mensajes aquí
  ];

  const getRandomMotivationalMessage = () => {
    return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  };

  // ===== VIDEOS ALEATORIOS =====
  const welcomeVideos = [
    "/videos/Nova-Dashboard.mp4",
    "/videos/Nova-Tengo-un-nuevo-cargo-para-postular.mp4",
    "/videos/Nova-Analizando-hojas-de-vida.mp4",
    "/videos/Nova-Haciendo-Entrevistas.mp4",
    "/videos/Nova-Feliz-porque-encontró-al-candidato.mp4",
    "/videos/Nova-Principal.mp4",
    "/videos/Nova-escogiendo-email-plantilla.mp4",
    "/videos/Nova-Actividades.mp4"
  ];

  const getRandomWelcomeVideo = () => {
    return welcomeVideos[Math.floor(Math.random() * welcomeVideos.length)];
  };

  // Mensaje de bienvenida
  const getWelcomeMessage = () => {
    return "🎉 ¡Bienvenido al futuro! 🌟\n\nSoy Nova, tu asistente digital, y estoy aquí para ayudarte. ✨\n\n¡Vamos a hacer que este proceso sea inspirador! 🎯";
  };

  // Mostrar modal de bienvenida al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcomeModal(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {/* Tu contenido aquí */}
      
      {/* Modal de Bienvenida con video y texto aleatorios */}
      <NovaModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onConfirm={() => setShowWelcomeModal(false)}
        module="welcome"
        videoPath={getRandomWelcomeVideo()} // Video aleatorio
        message={getWelcomeMessage()}
        title="¡Bienvenido al Sistema! 🚀"
        confirmButtonText="¡Genial!" // Personalizable
      />
      
      {/* Modal de Motivación con video y texto aleatorios */}
      <NovaModal
        isOpen={showMotivationModal}
        onClose={() => setShowMotivationModal(false)}
        onConfirm={() => setShowMotivationModal(false)}
        module="motivation"
        videoPath={getRandomWelcomeVideo()} // Video aleatorio
        message={getRandomMotivationalMessage()} // Texto aleatorio
        title="¡Motivación del Día!"
        confirmButtonText="Anímate" // Personalizable
      />
      
      {/* Modal de Navegación (cuando se selecciona un módulo) */}
      <NovaModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={() => {
          closeModal();
          // Tu lógica de navegación aquí
        }}
        module={modalData?.module}
        videoPath={modalData?.video}
        message={modalData?.message}
        title={modalData?.title}
        confirmButtonText="¡Suerte!" // Personalizable
      />
    </div>
  );
};

export default TuComponente;
```

---

## 🎨 Personalización del Botón

Para personalizar el texto del botón, simplemente pasa la prop `confirmButtonText`:

```javascript
<NovaModal
  // ... otras props
  confirmButtonText="Anímate" // o "Suerte", "¡Genial!", "Continuar", etc.
/>
```

Si quieres diferentes textos para diferentes modals, puedes crear un objeto con los textos:

```javascript
const buttonTexts = {
  welcome: "¡Genial!",
  motivation: "Anímate",
  navigation: "¡Suerte!",
  default: "Continuar"
};

// Y usarlo así:
<NovaModal
  confirmButtonText={buttonTexts[module] || buttonTexts.default}
  // ... otras props
/>
```

---

## 📱 Responsive Design

El modal está diseñado para ser responsive:

- **Desktop (lg:)**:
  - Layout horizontal: Contenido a la izquierda, video a la derecha
  - Ancho máximo: `max-w-4xl`
  
- **Móvil (sm:)**:
  - Layout vertical: Video arriba, contenido abajo
  - Padding reducido para pantallas pequeñas

---

## 🎬 Gestión de Videos

### Ubicación de Videos

Los videos deben estar en la carpeta `public/videos/` para que sean accesibles con rutas como `/videos/nombre-video.mp4`.

### Formatos Soportados

- **Recomendado:** MP4 (H.264)
- El código actual solo soporta MP4, pero puedes extenderlo para otros formatos

### Propiedades del Video

- **Auto-play:** Se reproduce automáticamente al abrir el modal
- **Loop:** El video se repite continuamente
- **Muted:** Inicia silenciado para permitir auto-play
- **Controles:** Play/Pause y Mute/Unmute disponibles

---

## ⚙️ Funcionalidades Clave

### 1. Auto-play del Video
- Se reproduce automáticamente al abrir el modal
- Inicia silenciado (muted) para cumplir con políticas de navegadores
- Reintenta si falla el primer intento

### 2. Controles de Video
- **Play/Pause:** Botón para pausar/reproducir
- **Mute/Unmute:** Botón para activar/desactivar sonido
- Los controles aparecen sobre el video con fondo semitransparente

### 3. Gestión de Estado
- El video se pausa automáticamente al cerrar el modal
- El estado de reproducción se sincroniza con el video real

### 4. Textos Aleatorios
- Cada vez que se abre el modal, se selecciona un mensaje aleatorio
- Los mensajes soportan saltos de línea con `\n`
- Los emojis se muestran correctamente

### 5. Videos Aleatorios
- Cada vez que se abre el modal, se selecciona un video aleatorio de la lista
- Los videos pueden ser diferentes para cada tipo de modal

---

## 🔍 Debugging

### Problemas Comunes

1. **El video no se reproduce:**
   - Verifica que la ruta del video sea correcta
   - Asegúrate de que el video esté en `public/videos/`
   - Verifica la consola del navegador para errores

2. **El modal no se muestra:**
   - Verifica que `isOpen` sea `true`
   - Revisa que el z-index no esté siendo sobrescrito

3. **Los textos no se muestran con saltos de línea:**
   - Asegúrate de usar `whitespace-pre-line` en el contenedor del mensaje
   - Verifica que los mensajes incluyan `\n` para los saltos

---

## 📝 Ejemplo de Uso Completo

```javascript
import React, { useState } from 'react';
import NovaModal from './components/NovaModal';

function App() {
  const [showModal, setShowModal] = useState(false);

  const videos = [
    "/videos/video1.mp4",
    "/videos/video2.mp4",
    "/videos/video3.mp4"
  ];

  const mensajes = [
    "Mensaje 1\n\nCon más líneas",
    "Mensaje 2\n\nOtro mensaje",
    "Mensaje 3\n\nTercer mensaje"
  ];

  const getRandomVideo = () => videos[Math.floor(Math.random() * videos.length)];
  const getRandomMessage = () => mensajes[Math.floor(Math.random() * mensajes.length)];

  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Abrir Modal
      </button>

      <NovaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          console.log("Confirmado!");
          setShowModal(false);
        }}
        videoPath={getRandomVideo()}
        message={getRandomMessage()}
        title="Mi Modal"
        confirmButtonText="¡Anímate!"
      />
    </div>
  );
}

export default App;
```

---

## ✅ Checklist de Implementación

- [ ] Instalar dependencias (React, lucide-react, Tailwind CSS)
- [ ] Crear carpeta `public/videos/` y agregar videos
- [ ] Crear componente `NovaModal.js`
- [ ] Crear hook `useNovaModal.js` (opcional, solo si usas módulos)
- [ ] Implementar sistema de textos aleatorios
- [ ] Implementar sistema de videos aleatorios
- [ ] Personalizar textos de botones
- [ ] Probar en desktop y móvil
- [ ] Verificar que los videos se reproduzcan correctamente
- [ ] Verificar que los textos aleatorios funcionen

---

## 🎯 Resumen de Características Implementadas

✅ Video a la derecha (en desktop)  
✅ Textos aleatorios  
✅ Videos aleatorios  
✅ Botón personalizable (¡Genial!, Anímate, Suerte, etc.)  
✅ Controles de video (Play/Pause, Mute/Unmute)  
✅ Auto-play del video  
✅ Diseño responsive  
✅ Cierre del modal con X o botón Cancelar  
✅ Confirmación con botón personalizado  

---

## 📞 Notas Finales

- El sistema está completamente funcional y listo para usar
- Puedes personalizar los colores, textos y comportamientos según tus necesidades
- Los videos deben estar optimizados para web (tamaño razonable)
- Considera la accesibilidad agregando `aria-label` a los botones (ya incluido en el código)

---

**¡Listo para replicar!** 🚀

