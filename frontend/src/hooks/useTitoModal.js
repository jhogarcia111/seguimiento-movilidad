import { useState } from 'react';

const useTitoModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Mensajes de movilidad y transporte
  const mobilityMessages = {
    welcome: {
      title: "¡Bienvenido! 🚀",
      messages: [
        "🚦 ¡Hola! Soy Transito - Tito, tu asistente de movilidad. 👋\n\nTe ayudo a conocer el estado del tráfico y la movilidad en Bogotá en tiempo real. 📊\n\n¡Vamos a revisar la situación actual! 🎯",
        "🚗 ¡Bienvenido a Seguimiento Movilidad! 🚦\n\nSoy Tito y estoy aquí para ayudarte a navegar por la ciudad de manera más eficiente. 📍\n\n¡Exploremos juntos las rutas y el estado del tráfico! 🗺️",
        "🚦 ¡Hola! Soy Tito, tu guía de movilidad. 👋\n\nConmigo podrás conocer problemas de tráfico, accidentes y desvíos en tiempo real. ⚡\n\n¡Empecemos a explorar la ciudad! 🏙️"
      ],
      videos: [
        "/videos/Tito- saludando.mp4",
        "/videos/Tito- saludando 1.mp4",
        "/videos/Tito- saludando 2.mp4"
      ],
      buttonTexts: ["¡Genial!", "¡Vamos!", "¡Empecemos!"]
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

  // Función para obtener video aleatorio
  const getRandomVideo = (type) => {
    const videos = mobilityMessages[type]?.videos || [];
    if (videos.length === 0) return '';
    return videos[Math.floor(Math.random() * videos.length)];
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

