import { useState } from 'react';

const useTitoModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Mensajes de movilidad y transporte
  const mobilityMessages = {
    welcome: {
      title: "¡Bienvenido! 🚀",
      messages: [
        "🚦 ¡Hola! Soy Transito - Tito, tu asistente de movilidad. 👋\n\n¡Estoy emocionado por comenzar este día contigo! 🌟 Juntos vamos a descubrir el estado de la ciudad y encontrar las mejores rutas. 📊\n\n¡Tu ayuda y mi ayuda hacen que seamos uno para el otro! 🎯",
        "🚗 ¡Bienvenido a Transito Tito! 🚦\n\n¡Qué emocionante día! Estoy aquí para hacerte sentir especial y ayudarte a navegar por Bogotá de la mejor manera. 💫\n\nEspero que quieras volver pronto para leer más mensajes y descubrir juntos la ciudad. 🗺️",
        "🚦 ¡Hola! Soy Tito, tu compañero de movilidad. 👋\n\n¡Estoy súper emocionado de estar aquí contigo hoy! 🌟 Juntos vamos a explorar la ciudad, encontrar las mejores rutas y hacer que cada viaje sea especial. 🎉\n\n¡Yo te ayudo y tú me ayudas, somos un equipo perfecto! ⚡",
        "💫 ¡Qué alegría verte de nuevo! 🚦\n\nCada día que comenzamos juntos es una nueva oportunidad para descubrir cosas increíbles sobre nuestra ciudad. 🗺️\n\nEstoy emocionado por ayudarte a encontrar las mejores rutas y hacer que tu día sea perfecto. ¡Vamos a lograrlo juntos! 🌟",
        "🎯 ¡Bienvenido! Soy Tito y estoy aquí para ti. 👋\n\nEste es un día emocionante y estoy feliz de compartirlo contigo. 💫 Juntos vamos a explorar Bogotá, encontrar las mejores rutas y hacer que cada momento sea especial. 🚗\n\n¡Espero que vuelvas pronto para seguir descubriendo juntos! 🗺️",
        "🌟 ¡Hola! ¡Qué día tan emocionante! 🚦\n\nSoy Tito y estoy aquí para hacerte sentir especial. Cada vez que vienes, es una nueva aventura que descubrimos juntos. 💫\n\n¡Yo te ayudo y tú me ayudas! Somos uno para el otro, y juntos vamos a hacer que este día sea increíble. 🎉"
      ],
      videos: [
        "/videos/Tito- saludando.mp4",
        "/videos/Tito- saludando 1.mp4",
        "/videos/Tito- saludando 2.mp4"
      ],
      buttonTexts: ["¡Genial!", "¡Vamos!", "¡Empecemos!", "¡Perfecto!", "¡Excelente!", "¡Emocionante!"]
    },
    searching: {
      title: "Buscando Información 🔍",
      messages: [
        "🔍 Estoy buscando información actualizada sobre movilidad en Bogotá. 📊\n\nRevisando fuentes oficiales y redes sociales para darte la información más reciente. ⚡\n\n¡Encuentra los mejores resultados! 🎯",
        "📡 Consultando información de movilidad en tiempo real... 🚦\n\nAnalizando datos de @SectorMovilidad, @BogotaTransito y bogota.gov.co. 📱\n\n¡Casi listo con los resultados! ⏱️",
        "🔎 Buscando problemas de movilidad y tráfico actuales... 🚗\n\nVerificando accidentes, manifestaciones, obras y desvíos en la ciudad. 🏙️\n\n¡Procesando la información más reciente! 📊"
      ],
      videos: [
        "/videos/Tito- Buscando.mp4",
        "/videos/Tito - Buscando 2.mp4",
        "/videos/Tito- Buscando 3.mp4"
      ],
      buttonTexts: ["¡Perfecto!", "¡Excelente!", "¡Genial!"]
    },
    clear: {
      title: "Camino Libre ✅",
      messages: [
        "✅ ¡Excelente noticia! El camino está libre. 🚗\n\nNo hay problemas de movilidad reportados en este momento. ⚡\n\n¡Puedes transitar con normalidad! 🛣️",
        "🟢 ¡Todo está despejado! 🚦\n\nNo hay accidentes, manifestaciones ni obras que afecten la movilidad. 📍\n\n¡El tráfico fluye normalmente! 🚗",
        "✅ ¡Camino libre! 🎉\n\nNo se han reportado problemas de tráfico o movilidad en este sector. 🗺️\n\n¡Puedes circular sin inconvenientes! 🛣️"
      ],
      videos: [
        "/videos/Tito- Camino libre.mp4",
        "/videos/Tito- Camino libre 2.mp4",
        "/videos/Tito- Camino libre 3.mp4"
      ],
      buttonTexts: ["¡Perfecto!", "¡Excelente!", "¡Genial!"]
    },
    notifications: {
      title: "Notificaciones Push 📱",
      messages: [
        "📱 ¡Activa las notificaciones push para estar siempre informado! 🔔\n\nRecibirás alertas sobre problemas de movilidad, accidentes y desvíos en tiempo real. ⚡\n\n¡No te pierdas ninguna actualización importante! 🎯",
        "🔔 Mantente al día con las notificaciones de movilidad. 📊\n\nTe avisaremos sobre cambios en el tráfico, cierres viales y eventos importantes. 🚦\n\n¡Activa las notificaciones para estar siempre informado! 📱",
        "📲 ¡Activa las notificaciones y recibe alertas instantáneas! ⚡\n\nTe mantendremos informado sobre problemas de movilidad, manifestaciones y obras en tiempo real. 🚗\n\n¡No te pierdas ninguna actualización! 🔔"
      ],
      videos: [
        "/videos/Tito- Notificaciones push.mp4"
      ],
      buttonTexts: ["¡Activar!", "¡Perfecto!", "¡Genial!"]
    }
  };

  // Función para obtener mensaje aleatorio
  const getRandomMessage = (type) => {
    const messages = mobilityMessages[type]?.messages || [];
    if (messages.length === 0) return '';
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Función para obtener video aleatorio (excluyendo videos ya usados)
  const getRandomVideo = (type, excludeVideos = []) => {
    const videos = mobilityMessages[type]?.videos || [];
    if (videos.length === 0) return '';
    
    // Filtrar videos excluidos
    const availableVideos = videos.filter(video => !excludeVideos.includes(video));
    
    // Si no hay videos disponibles después de filtrar, usar todos
    const videosToChoose = availableVideos.length > 0 ? availableVideos : videos;
    
    return videosToChoose[Math.floor(Math.random() * videosToChoose.length)];
  };

  // Función para obtener texto de botón aleatorio
  const getRandomButtonText = (type) => {
    const buttonTexts = mobilityMessages[type]?.buttonTexts || ['¡Genial!'];
    if (buttonTexts.length === 0) return '¡Genial!';
    return buttonTexts[Math.floor(Math.random() * buttonTexts.length)];
  };

  // Función para abrir modal
  const openModal = (type) => {
    const data = mobilityMessages[type];
    if (data) {
      setModalData({
        type,
        title: data.title,
        message: getRandomMessage(type),
        video: getRandomVideo(type),
        buttonText: getRandomButtonText(type)
      });
      setIsOpen(true);
    }
  };

  // Función para cerrar modal
  const closeModal = () => {
    setIsOpen(false);
    setModalData(null);
  };

  // Función para confirmar y navegar
  const confirmAndNavigate = (navigate, path) => {
    closeModal();
    if (navigate && path) {
      navigate(path);
    }
  };

  return {
    isOpen,
    modalData,
    mobilityMessages,
    openModal,
    closeModal,
    confirmAndNavigate,
    getRandomMessage,
    getRandomVideo,
    getRandomButtonText
  };
};

export default useTitoModal;

