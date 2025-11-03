import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const TWITTER_API_URL = 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

async function testTwitterAPI() {
  console.log('🔍 Probando conexión con Twitter API v2...\n');

  if (!BEARER_TOKEN) {
    console.error('❌ TWITTER_BEARER_TOKEN no encontrado en .env');
    console.log('💡 Asegúrate de tener TWITTER_BEARER_TOKEN=tu_token en backend/.env');
    process.exit(1);
  }

  console.log('📋 Configuración:');
  console.log(`   API URL: ${TWITTER_API_URL}`);
  console.log(`   Bearer Token: ${BEARER_TOKEN.substring(0, 20)}...${BEARER_TOKEN.substring(BEARER_TOKEN.length - 10)}`);
  console.log('');

  try {
    // Probar con una cuenta conocida - Query simple primero
    const testAccount = 'SectorMovilidad';
    
    console.log(`1️⃣ Probando búsqueda de tweets de @${testAccount}...`);
    
    // Query simplificada para evitar errores
    const query = `from:${testAccount} -is:retweet lang:es`;
    
    console.log(`   Query: ${query}`);
    
    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      params: {
        query: query,
        max_results: 10,
        'tweet.fields': 'created_at,author_id,public_metrics,text',
        expansions: 'author_id'
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    if (response.data && response.data.data) {
      console.log(`✅ Conexión exitosa!`);
      console.log(`   Tweets encontrados: ${response.data.data.length}`);
      console.log('');
      
      console.log('2️⃣ Ejemplo de tweet obtenido:');
      if (response.data.data.length > 0) {
        const tweet = response.data.data[0];
        console.log(`   ID: ${tweet.id}`);
        console.log(`   Texto: ${tweet.text.substring(0, 100)}...`);
        console.log(`   Fecha: ${tweet.created_at}`);
        console.log(`   Métricas: ${JSON.stringify(tweet.public_metrics)}`);
      }
      
      console.log('');
      console.log('========================================');
      console.log('✅ ¡API DE TWITTER FUNCIONANDO!');
      console.log('========================================');
      console.log('');
      console.log('🎉 Todo está configurado correctamente.');
      console.log('💡 El sistema ahora usará la API real de Twitter.');
      
      process.exit(0);
    } else {
      console.log('⚠️ Respuesta vacía de Twitter API');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN:');
    console.error('========================================');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Mensaje: ${error.response.data?.error?.message || error.response.data?.title || 'Error desconocido'}`);
      
      if (error.response.status === 401) {
        console.error('\n💡 Solución: Verifica que el Bearer Token sea correcto en backend/.env');
      } else if (error.response.status === 403) {
        console.error('\n💡 Solución: Verifica los permisos de tu app en X Developer Portal');
      } else if (error.response.status === 429) {
        console.error('\n💡 Solución: Has excedido el límite de rate limiting. Espera unos minutos.');
      }
    } else if (error.request) {
      console.error('❌ No se recibió respuesta del servidor');
      console.error('💡 Verifica tu conexión a internet');
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.error('========================================\n');
    process.exit(1);
  }
}

// Ejecutar prueba
testTwitterAPI();
