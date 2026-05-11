import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { getTwitterSources } from './sourcesService.js';
import { getCachedTweets, saveCachedTweets } from '../database/incidents.js';

/**
 * Obtiene tweets mediante scraping directo de X/Twitter
 * Usa nitter.net como proxy para evitar bloqueos
 * @param {Array<string>} usernames - Array de usernames de Twitter (sin @)
 * @returns {Promise<Array>} Array de tweets
 */
export async function getTweetsByScraping(usernames = []) {
  // NOTA: Nitter está bloqueado por Cloudflare CAPTCHA y no es viable
  // Comentado temporalmente hasta encontrar una alternativa
  console.log('⚠️ Scraping de Twitter/Nitter deshabilitado (bloqueado por Cloudflare CAPTCHA)');
  console.log('⚠️ Enfocándose en bogota.gov.co (Waze pendiente) para datos reales');
  return [];
  
  /* COMENTADO: Nitter no funciona debido a Cloudflare CAPTCHA
  try {
    // Si no hay usernames, obtener de la base de datos
    if (usernames.length === 0) {
      usernames = await getTwitterSources();
    }

    if (usernames.length === 0) {
      console.warn('⚠️ No hay cuentas de Twitter configuradas para scraping');
      return [];
    }

    console.log(`🔍 Scrapeando tweets de ${usernames.length} cuentas usando Nitter...`);

    const allTweets = [];

    // Scrapear cada cuenta
    for (const username of usernames) {
      try {
        console.log(`🔍 Scrapeando tweets de @${username}...`);
        const tweets = await scrapeUserTweets(username);
        console.log(`✅ Obtenidos ${tweets.length} tweets de @${username}`);
        allTweets.push(...tweets);
      } catch (error) {
        console.error(`❌ Error scrapeando @${username}:`, error.message);
        // Continuar con la siguiente cuenta
        continue;
      }
    }

    // Ordenar por fecha (más recientes primero)
    allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ Obtenidos ${allTweets.length} tweets mediante scraping`);

    return allTweets;
  } catch (error) {
    console.error('Error en getTweetsByScraping:', error);
    return [];
  }
  */
}

/**
 * Scrapea tweets de un usuario específico usando Nitter
 * @param {string} username - Username de Twitter (sin @)
 * @returns {Promise<Array>} Array de tweets
 */
async function scrapeUserTweets(username) {
  // Lista de instancias de Nitter (pueden cambiar, algunas pueden estar caídas)
  // NOTA IMPORTANTE: Muchas instancias de Nitter están protegidas por Cloudflare CAPTCHA
  // Los CAPTCHAs NO se pueden resolver automáticamente, por lo que el scraping fallará
  // Si todas las instancias tienen CAPTCHA, el sistema usará cache o datos mock como fallback
  const nitterInstances = [
    'https://nitter.space', // Nueva instancia (puede tener CAPTCHA de Cloudflare)
    'https://nitter.net'    // Instancia original (puede tener CAPTCHA de Cloudflare)
    // Otras instancias comentadas porque:
    // - nitter.it: Muestra alertas de seguridad (certificados SSL inválidos)
    // - Otras instancias: Están caídas o no disponibles
    // Si todas fallan, el sistema usará cache o datos mock como fallback
  ];

  let lastError = null;
  let puppeteerBlocked = false;
  
  for (const instance of nitterInstances) {
    try {
      console.log(`🔍 Intentando instancia: ${instance}/${username}`);
      const tweets = await scrapeFromNitter(instance, username);
      if (tweets.length > 0) {
        console.log(`✅ Instancia ${instance} funcionó, obtenidos ${tweets.length} tweets de @${username}`);
        return tweets;
      } else {
        console.log(`⚠️ Instancia ${instance} no retornó tweets, intentando siguiente...`);
      }
    } catch (error) {
      lastError = error;
      
      // Detectar diferentes tipos de errores
      if (error.message.includes('ERR_BLOCKED_BY_CLIENT') || 
          error.message.includes('waitForTimeout') ||
          error.message.includes('ERR_CERT') ||
          error.message.includes('certificate') ||
          error.message.includes('SSL') ||
          error.message.includes('CERT_COMMON_NAME_INVALID')) {
        puppeteerBlocked = true;
        console.log(`⚠️ ${instance} bloqueado o con problemas de seguridad (certificado SSL inválido o bloqueo anti-bot)`);
        console.log(`⚠️ Saltando esta instancia por seguridad`);
        // Si es un problema de certificado o seguridad, no intentar más
        break;
      } else {
        console.log(`⚠️ Instancia ${instance} no disponible: ${error.message}`);
      }
      
      continue;
    }
  }

  // Si ninguna instancia funciona, no intentar scraping directo (toma mucho tiempo)
  console.log(`⚠️ Ninguna instancia de Nitter disponible para @${username}`);
  
  if (lastError) {
    console.error(`❌ No se pudieron obtener tweets de @${username} desde ninguna fuente`);
    console.error(`   Último error: ${lastError.message}`);
  }
  
  // Si todas las instancias tienen CAPTCHA o están bloqueadas, explicar el problema
  if (puppeteerBlocked || lastError?.message?.includes('CAPTCHA') || lastError?.message?.includes('Cloudflare')) {
    console.warn(`⚠️ IMPORTANTE: Las instancias de Nitter están protegidas por Cloudflare CAPTCHA`);
    console.warn(`⚠️ Los CAPTCHAs NO se pueden resolver automáticamente`);
    console.warn(`⚠️ RECOMENDACIÓN: Cambiar a "Twitter API v2" en la configuración del admin`);
    console.warn(`⚠️ El sistema usará cache o datos mock como fallback`);
  }
  
  return [];
}

/**
 * Scrapea tweets desde una instancia de Nitter
 * @param {string} instanceUrl - URL de la instancia de Nitter
 * @param {string} username - Username de Twitter
 * @returns {Promise<Array>} Array de tweets
 */
async function scrapeFromNitter(instanceUrl, username) {
  const url = `${instanceUrl}/${username}`;
  
  console.log(`🔍 Intentando scrapear desde ${instanceUrl}/${username}...`);

  try {
    // Primero intentar con axios (más rápido)
    // NOTA: Si hay problemas de certificado SSL, axios puede fallar
    const response = await axios.get(url, {
      timeout: 10000, // Reducir timeout a 10 segundos para fallar rápido
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      validateStatus: (status) => status >= 200 && status < 500,
      // NO ignorar errores de certificado SSL por seguridad
      // Si hay problemas de certificado, axios lanzará un error
    });

    if (response.status !== 200) {
      console.log(`⚠️ Instancia ${instanceUrl} retornó status ${response.status}`);
      
      // Status 403 generalmente significa que está bloqueado por Cloudflare CAPTCHA
      if (response.status === 403) {
        console.warn(`⚠️ ${instanceUrl} está bloqueado (403 Forbidden) - probablemente Cloudflare CAPTCHA`);
        console.warn(`⚠️ Los CAPTCHAs NO se pueden resolver automáticamente`);
      }
      
      return [];
    }

    // Verificar si el HTML contiene CAPTCHA de Cloudflare
    const htmlContent = response.data;
    const hasCloudflareCaptcha = htmlContent.includes('cf-browser-verification') ||
                                  htmlContent.includes('challenge-platform') ||
                                  htmlContent.includes('Verifique que usted es un ser humano') ||
                                  htmlContent.includes('Verify that you are a human') ||
                                  htmlContent.includes('Just a moment') ||
                                  htmlContent.includes('Checking your browser') ||
                                  htmlContent.includes('cf-challenge') ||
                                  htmlContent.includes('cf-ray');

    if (hasCloudflareCaptcha) {
      console.warn(`⚠️ ${instanceUrl} está protegido por Cloudflare CAPTCHA`);
      console.warn(`⚠️ Los CAPTCHAs NO se pueden resolver automáticamente`);
      console.warn(`⚠️ El scraping automático NO funcionará con esta instancia`);
      return []; // Retornar vacío para que intente la siguiente instancia
    }
    
    // Si el HTML está vacío o es muy corto, probablemente está bloqueado
    if (htmlContent.length < 500) {
      console.warn(`⚠️ ${instanceUrl} retornó HTML muy corto (${htmlContent.length} caracteres) - probablemente bloqueado`);
      console.warn(`⚠️ HTML sample: ${htmlContent.substring(0, 200)}`);
      return [];
    }

    // Verificar si el HTML contiene solo JavaScript (Nitter moderno)
    const hasOnlyJS = htmlContent.includes('<div id="target"') && 
                      htmlContent.includes('window.park') && 
                      !htmlContent.includes('tweet-content') &&
                      !htmlContent.includes('timeline-item');

    if (hasOnlyJS) {
      console.log(`⚠️ Nitter usa JavaScript para cargar contenido, usando Puppeteer...`);
      return await scrapeFromNitterWithPuppeteer(instanceUrl, username);
    }

    const $ = cheerio.load(htmlContent);
    const tweets = [];

    // Nitter puede usar diferentes estructuras HTML dependiendo de la versión
    // Intentar múltiples selectores
    const tweetSelectors = [
      '.tweet-content',
      '.timeline-item .tweet-body',
      'article[data-tweet-id]',
      '.tweet'
    ];

    // Log del HTML para debugging
    console.log(`📄 HTML recibido de ${instanceUrl}: ${htmlContent.length} caracteres`);
    if (htmlContent.length < 2000) {
      console.log(`📄 HTML completo (primeros 1000 caracteres): ${htmlContent.substring(0, 1000)}`);
    } else {
      console.log(`📄 HTML sample (primeros 1000 caracteres): ${htmlContent.substring(0, 1000)}`);
    }
    
    let foundTweets = false;
    
    for (const selector of tweetSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Encontrados ${elements.length} elementos con selector "${selector}" para @${username}`);
        foundTweets = true;
        
        elements.each((index, element) => {
          if (index >= 20) return false; // Limitar a 20 tweets por cuenta

          const $tweet = $(element);
          
          // Intentar múltiples formas de extraer el texto
          let text = '';
          const textSelectors = ['.tweet-body', '.tweet-text', 'p', '.content'];
          
          for (const textSelector of textSelectors) {
            text = $tweet.find(textSelector).first().text().trim();
            if (text && text.length > 10) break;
          }
          
          // Si no se encontró con selectores, intentar obtener todo el texto del elemento
          if (!text || text.length < 10) {
            text = $tweet.text().trim();
            // Limpiar texto de elementos no deseados
            text = text.replace(/\s+/g, ' ').trim();
          }
          
          if (!text || text.length < 10) {
            console.log(`⚠️ Tweet ${index} de @${username} sin texto suficiente, saltando...`);
            return; // Saltar tweets vacíos o muy cortos
          }

          // Extraer fecha/hora - intentar múltiples formas
          let timeText = '';
          let tweetLink = '';
          
          const timeSelectors = [
            '.tweet-date a',
            'time',
            '.tweet-date',
            'a[href*="/status/"]'
          ];
          
          for (const timeSelector of timeSelectors) {
            const timeElement = $tweet.closest('.timeline-item, article, .tweet').find(timeSelector).first();
            if (timeElement.length > 0) {
              timeText = timeElement.attr('title') || timeElement.attr('datetime') || timeElement.text().trim();
              tweetLink = timeElement.attr('href') || '';
              if (timeText) break;
            }
          }
          
          // Si no se encontró link, buscar en el elemento padre
          if (!tweetLink) {
            const parentLink = $tweet.closest('a[href*="/status/"]');
            if (parentLink.length > 0) {
              tweetLink = parentLink.attr('href') || '';
            }
          }

          // Extraer ID del tweet (del link o del atributo data-tweet-id)
          let tweetId = '';
          if (tweetLink) {
            const match = tweetLink.match(/\/status\/(\d+)/);
            if (match) {
              tweetId = match[1];
            } else {
              tweetId = tweetLink.split('/').pop();
            }
          }
          
          // Si no hay ID del link, intentar del atributo data-tweet-id
          if (!tweetId) {
            tweetId = $tweet.closest('.timeline-item, article').attr('data-tweet-id') || '';
          }
          
          // Si aún no hay ID, generar uno único
          if (!tweetId) {
            tweetId = `scraped-${Date.now()}-${index}-${username}`;
          }

          // Parsear fecha
          const createdAt = parseNitterDate(timeText) || new Date().toISOString();

          // Extraer métricas (retweets, likes) - intentar múltiples formas
          const parent = $tweet.closest('.timeline-item, article, .tweet');
          const retweetCount = parseInt(parent.find('.retweet-count, .icon-retweet').parent().text().trim().replace(/\D/g, '')) || 0;
          const likeCount = parseInt(parent.find('.like-count, .icon-heart').parent().text().trim().replace(/\D/g, '')) || 0;

          tweets.push({
            id: tweetId,
            text: text,
            author_id: username,
            created_at: createdAt,
            public_metrics: {
              retweet_count: retweetCount,
              like_count: likeCount
            }
          });
          
          console.log(`✅ Tweet ${index + 1} extraído de @${username}: "${text.substring(0, 50)}..."`);
        });
        
        break; // Si encontramos tweets con este selector, no intentar los demás
      }
    }

    if (!foundTweets) {
      console.log(`⚠️ No se encontraron tweets con ningún selector para @${username} en ${instanceUrl}`);
      // Guardar una muestra del HTML para debugging (solo si no hay tweets)
      const htmlSample = response.data.substring(0, 1000);
      console.log(`🔍 HTML sample (primeros 1000 caracteres): ${htmlSample}`);
      
      // Intentar buscar cualquier elemento que contenga texto que parezca un tweet
      const allText = $('body').text();
      if (allText.toLowerCase().includes(username.toLowerCase())) {
        console.log(`ℹ️ El HTML contiene el username @${username}, pero no se encontraron tweets con los selectores estándar`);
        console.log(`   Esto puede indicar que la estructura HTML de Nitter ha cambiado`);
      }
    }

    console.log(`✅ Extraídos ${tweets.length} tweets de @${username} desde ${instanceUrl}`);
    return tweets;
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error HTTP ${error.response.status} al scrapear ${instanceUrl}/${username}`);
    } else if (error.request) {
      console.log(`❌ No se recibió respuesta de ${instanceUrl}/${username}`);
    } else {
      console.log(`❌ Error scrapeando ${instanceUrl}/${username}:`, error.message);
    }
    throw error;
  }
}

/**
 * Scrapea tweets desde Nitter usando Puppeteer (para contenido cargado con JavaScript)
 * @param {string} instanceUrl - URL de la instancia de Nitter
 * @param {string} username - Username de Twitter
 * @returns {Promise<Array>} Array de tweets
 */
async function scrapeFromNitterWithPuppeteer(instanceUrl, username) {
  const url = `${instanceUrl}/${username}`;
  let browser = null;

  try {
    console.log(`🌐 Iniciando navegador headless para ${url}...`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled', // Ocultar que es un bot
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar user agent y headers para parecer un navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Ocultar que es Puppeteer
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    // Navegar a la página con timeout más corto
    // NOTA: Si hay problemas de certificado SSL o CAPTCHA, Puppeteer puede fallar
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', // Cambiar a domcontentloaded para ser más rápido
        timeout: 10000 // Reducir timeout a 10 segundos para fallar rápido
      });
    } catch (error) {
      // Detectar problemas de certificado SSL o seguridad
      if (error.message.includes('timeout') || 
          error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.message.includes('ERR_CERT') ||
          error.message.includes('certificate') ||
          error.message.includes('SSL') ||
          error.message.includes('CERT_COMMON_NAME_INVALID')) {
        console.log(`⚠️ Problema de seguridad o timeout al cargar ${url} con Puppeteer`);
        console.log(`⚠️ Error: ${error.message}`);
        throw error;
      }
      throw error;
    }

    // Verificar si hay CAPTCHA de Cloudflare después de cargar la página
    const pageContent = await page.content();
    const hasCloudflareCaptcha = pageContent.includes('cf-browser-verification') ||
                                  pageContent.includes('challenge-platform') ||
                                  pageContent.includes('Verifique que usted es un ser humano') ||
                                  pageContent.includes('Verify that you are a human') ||
                                  pageContent.includes('Just a moment') ||
                                  pageContent.includes('Checking your browser');

    if (hasCloudflareCaptcha) {
      console.warn(`⚠️ ${instanceUrl} está protegido por Cloudflare CAPTCHA (detectado con Puppeteer)`);
      console.warn(`⚠️ Los CAPTCHAs NO se pueden resolver automáticamente`);
      console.warn(`⚠️ El scraping automático NO funcionará con esta instancia`);
      return []; // Retornar vacío para que intente la siguiente instancia
    }

    // Esperar a que se cargue el contenido (Nitter puede tardar)
    // Usar setTimeout en lugar de waitForTimeout (deprecado en Puppeteer 21+)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Intentar esperar a que aparezcan los tweets
    try {
      await page.waitForSelector('.tweet-content, .timeline-item, article[data-tweet-id]', { 
        timeout: 5000 
      });
    } catch (error) {
      console.log(`⚠️ No se encontraron tweets con selectores estándar, continuando...`);
    }

    // Intentar múltiples selectores para encontrar tweets
    const tweets = await page.evaluate((username) => {
      const tweetElements = [];
      
      // Intentar múltiples selectores
      const selectors = [
        '.tweet-content',
        '.timeline-item',
        'article[data-tweet-id]',
        '.tweet',
        '[data-tweet-id]'
      ];

      let foundElements = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          foundElements = Array.from(elements);
          break;
        }
      }

      // Si no se encontraron con selectores, buscar cualquier elemento que contenga texto que parezca un tweet
      if (foundElements.length === 0) {
        const allElements = document.querySelectorAll('div, article, section');
        foundElements = Array.from(allElements).filter(el => {
          const text = el.textContent || '';
          return text.length > 50 && 
                 text.length < 500 && 
                 (text.includes('@') || text.includes('#') || text.includes('http'));
        });
      }

      // Limitar a 20 tweets
      foundElements = foundElements.slice(0, 20);

      for (let i = 0; i < foundElements.length; i++) {
        const element = foundElements[i];
        const text = element.textContent?.trim() || '';
        
        if (!text || text.length < 10) continue;

        // Intentar extraer fecha/hora
        const timeElement = element.querySelector('time, .tweet-date, a[href*="/status/"]');
        const timeText = timeElement?.getAttribute('title') || 
                        timeElement?.getAttribute('datetime') || 
                        timeElement?.textContent?.trim() || '';

        // Intentar extraer ID del tweet
        let tweetId = '';
        const linkElement = element.querySelector('a[href*="/status/"]');
        if (linkElement) {
          const href = linkElement.getAttribute('href');
          const match = href?.match(/\/status\/(\d+)/);
          if (match) {
            tweetId = match[1];
          }
        }
        
        // Si no hay ID del link, intentar del atributo data-tweet-id
        if (!tweetId) {
          tweetId = element.closest('[data-tweet-id]')?.getAttribute('data-tweet-id') || '';
        }
        
        // Si aún no hay ID, generar uno único
        if (!tweetId) {
          tweetId = `scraped-${Date.now()}-${i}-${username}`;
        }

        // Extraer métricas básicas
        const retweetText = element.textContent?.match(/(\d+)\s*retweet/i)?.[1] || '0';
        const likeText = element.textContent?.match(/(\d+)\s*like/i)?.[1] || '0';

        tweetElements.push({
          id: tweetId,
          text: text,
          author_id: username,
          created_at: timeText || new Date().toISOString(),
          public_metrics: {
            retweet_count: parseInt(retweetText) || 0,
            like_count: parseInt(likeText) || 0
          }
        });
      }

      return tweetElements;
    }, username);

    console.log(`✅ Puppeteer extrajo ${tweets.length} tweets de @${username} desde ${instanceUrl}`);

    return tweets;
  } catch (error) {
    console.error(`❌ Error usando Puppeteer para ${url}:`, error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Intenta scrapear directamente desde x.com (más difícil, puede ser bloqueado)
 * @param {string} username - Username de Twitter
 * @returns {Promise<Array>} Array de tweets
 */
async function scrapeFromXDirect(username) {
  // Nota: Scraping directo de x.com es muy difícil porque:
  // 1. Requiere autenticación
  // 2. Usa JavaScript para cargar contenido
  // 3. Tiene protección anti-bot
  // Por ahora, retornamos array vacío y confiamos en Nitter o cache
  
  console.warn(`⚠️ Scraping directo de x.com no implementado (requiere autenticación y es más complejo)`);
  return [];
}

/**
 * Parsea fecha de Nitter a ISO string
 * @param {string} dateText - Texto de fecha de Nitter
 * @returns {string|null} ISO string o null si no se puede parsear
 */
function parseNitterDate(dateText) {
  if (!dateText) return null;

  try {
    // Nitter muestra fechas en formato relativo o absoluto
    // Ejemplos: "2 hours ago", "Nov 6, 2024 · 3:51 PM UTC"
    
    // Intentar parsear fecha absoluta
    const absoluteDateMatch = dateText.match(/(\w+)\s+(\d+),\s+(\d+)\s+·\s+(\d+):(\d+)\s+(AM|PM)\s+UTC/);
    if (absoluteDateMatch) {
      const [, month, day, year, hour, minute, period] = absoluteDateMatch;
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      let hour24 = parseInt(hour);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;
      
      const date = new Date(parseInt(year), months[month], parseInt(day), hour24, parseInt(minute));
      return date.toISOString();
    }

    // Intentar parsear fecha relativa
    const relativeMatch = dateText.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
    if (relativeMatch) {
      const [, amount, unit] = relativeMatch;
      const now = new Date();
      const amountNum = parseInt(amount);
      
      switch (unit.toLowerCase()) {
        case 'minute':
        case 'minutes':
          now.setMinutes(now.getMinutes() - amountNum);
          break;
        case 'hour':
        case 'hours':
          now.setHours(now.getHours() - amountNum);
          break;
        case 'day':
        case 'days':
          now.setDate(now.getDate() - amountNum);
          break;
        case 'week':
        case 'weeks':
          now.setDate(now.getDate() - (amountNum * 7));
          break;
        case 'month':
        case 'months':
          now.setMonth(now.getMonth() - amountNum);
          break;
        case 'year':
        case 'years':
          now.setFullYear(now.getFullYear() - amountNum);
          break;
      }
      
      return now.toISOString();
    }

    // Si no se puede parsear, usar fecha actual
    return new Date().toISOString();
  } catch (error) {
    console.error('Error parseando fecha de Nitter:', error);
    return new Date().toISOString();
  }
}

/**
 * Obtiene todos los tweets recientes mediante scraping
 * @returns {Promise<Array>} Array de tweets
 */
export async function getAllRecentTweetsByScraping() {
  try {
    // 1. Verificar cache primero (últimas 4 horas)
    const cachedTweets = await getCachedTweets();
    
    // Si hay suficientes tweets en cache (más de 10), usarlos directamente
    if (cachedTweets.length >= 10) {
      console.log(`✅ Usando ${cachedTweets.length} tweets del cache (scraping)`);
      return cachedTweets;
    }

    // 2. Obtener tweets mediante scraping
    console.log(`🔍 Intentando obtener tweets mediante scraping...`);
    const scrapedTweets = await getTweetsByScraping();

    if (scrapedTweets.length === 0) {
      // Si no hay tweets nuevos, usar cache aunque esté expirado
      if (cachedTweets.length > 0) {
        console.log(`⚠️ No se pudieron obtener tweets nuevos mediante scraping, usando ${cachedTweets.length} tweets del cache`);
        return cachedTweets;
      }
      console.warn('⚠️ Scraping no obtuvo tweets y no hay cache disponible');
      return [];
    }

    console.log(`✅ Scraping obtuvo ${scrapedTweets.length} tweets nuevos`);

    // 3. Guardar nuevos tweets en cache
    if (scrapedTweets.length > 0) {
      await saveCachedTweets(scrapedTweets);
      console.log(`✅ ${scrapedTweets.length} tweets guardados en cache`);
    }

    // 4. Combinar tweets nuevos con tweets del cache (eliminar duplicados)
    const allTweets = [...scrapedTweets];
    const cachedIds = new Set(scrapedTweets.map(t => t.id));

    for (const cachedTweet of cachedTweets) {
      if (!cachedIds.has(cachedTweet.id)) {
        allTweets.push(cachedTweet);
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ Retornando ${allTweets.length} tweets (${scrapedTweets.length} nuevos + ${cachedTweets.length} del cache)`);
    return allTweets;
  } catch (error) {
    console.error('❌ Error en getAllRecentTweetsByScraping:', error);
    
    // Intentar usar cache en caso de error
    const cachedTweets = await getCachedTweets();
    if (cachedTweets.length > 0) {
      console.log(`⚠️ Error en scraping, usando ${cachedTweets.length} tweets del cache como fallback`);
      return cachedTweets;
    }
    
    console.warn('⚠️ No hay cache disponible después del error en scraping');
    return [];
  }
}

