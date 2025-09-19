"use strict";

const axios = require('axios');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const config = require('../config');
const { generateWhatsAppMessage } = require('../utils/secService');

// Añadir import al servicio de utilidades (si existe)
let utilityService = null;
try {
    utilityService = require('../services/utility.service');
} catch (e) {
    // Si no existe, se usará un fallback dentro de handleFeriados
}

/**
 * handleFeriados: handler para el comando !feriados
 * - Intenta obtener la lista desde services/utility.service.getFeriados()
 * - Si no existe el servicio, devuelve un mensaje fallback con la fecha actual
 */
async function handleFeriados(message) {
    try {
        if (utilityService && typeof utilityService.getFeriados === 'function') {
            const result = await utilityService.getFeriados();
            // retornamos string si el servicio lo entrega, si no, stringify
            return (typeof result === 'string') ? result : JSON.stringify(result, null, 2);
        }

        // Fallback: respuesta simple informativa
        const today = moment().tz(config.timezone || 'UTC').format('YYYY-MM-DD');
        return `No tengo acceso al servicio de feriados. Fecha actual: ${today}\n\nPide al administrador instalar/activar src/services/utility.service.js`;
    } catch (err) {
        console.error('[utility.handler] handleFeriados error:', err);
        return 'Ocurrió un error al obtener los feriados. Intenta de nuevo más tarde.';
    }
}

// Export defensivo: añadir handleFeriados a los exports existentes
if (typeof module.exports === 'object' && module.exports !== null) {
    module.exports = Object.assign(module.exports, { handleFeriados });
} else {
    module.exports = { handleFeriados };
}

// --- ESTRUCTURA DE COMANDOS PARA EL MENÚ DINÁMICO Y VISUAL ---
// Ahora el menú tiene emojis para ser más atractivo.
const menuConfig = {
    "UTILIDAD ⚙️": [
        { cmd: "!ping", desc: "Mide la latencia del bot 핑" },
        { cmd: "!metro", desc: "Estado de la red de Metro 🚇" },
        { cmd: "!feriados", desc: "Muestra los próximos feriados 🗓️" },
        { cmd: "!far <comuna>", desc: "Farmacias de turno ⚕️" },
        { cmd: "!clima <ciudad>", desc: "El tiempo en tu ciudad 🌦️" },
        { cmd: "!sismos", desc: "Últimos sismos en Chile 🌋" },
        { cmd: "!bus <paradero>", desc: "Próximas llegadas de buses 🚌" },
        { cmd: "!sec", desc: "Reclamos por cortes de luz 💡" },
        { cmd: "!valores", desc: "Indicadores económicos 💸" },
        { cmd: "!bencina <comuna>", desc: "Bencineras más baratas ⛽" },
        { cmd: "!trstatus", desc: "Estado del traductor de DeepL 🌐" },
        { cmd: "!bolsa", desc: "Estado de la bolsa de Santiago 📈" }
    ],
    "FÚTBOL ⚽": [
        { cmd: "!tabla", desc: "Tabla de posiciones del torneo nacional 🏆" },
        { cmd: "!prox", desc: "Próximos partidos del torneo 🔜" },
        { cmd: "!partidos", desc: "Partidos de la fecha actual 📅" },
        { cmd: "!tclasi", desc: "Tabla de clasificatorias 🇨🇱" },
        { cmd: "!clasi", desc: "Partidos de clasificatorias 🇨🇱" }
    ],
    "BÚSQUEDA 🔍": [
        { cmd: "!wiki <búsqueda>", desc: "Busca en Wikipedia 📚" },
        { cmd: "!noticias", desc: "Noticias más recientes 📰" },
        { cmd: "!g <búsqueda>", desc: "Búsqueda rápida en Google 🌐" }
    ],
    "ENTRETENCIÓN 🎉": [
        { cmd: "!s", desc: "Crea un sticker (respondiendo a imagen/video) 🖼️" },
        { cmd: "!toimg", desc: "Convierte un sticker a imagen/gif ️" },
        { cmd: "!banner <estilo> <texto>", desc: "Crea un banner ✨" },
        { cmd: "!texto <arriba> - <abajo>", desc: "Añade texto a una imagen ✍️" },
        { cmd: "!18, !navidad, !añonuevo", desc: "Cuenta regresiva ⏳" },
        { cmd: "!xv <búsqueda>", desc: "Busca videos +18 🔞" } // Added !xv
    ],
    "INSTAGRAM 📸": [ // New Category
        { cmd: "!Liz", desc: "Perfil de Liz en Instagram" },
        { cmd: "!Alicia", desc: "Perfil de Alicia en Instagram" },
        { cmd: "!Vladislava", desc: "Perfil de Vladislava en Instagram" },
        { cmd: "!Caro", desc: "Perfil de Caro en Instagram y TikTok" }
    ],
    "COMANDOS SIMPLES 💬": [ // New Category
        { cmd: "!wena", desc: "Saludo informal" },
        { cmd: "!huaso", desc: "Respuesta sobre huasos" },
        { cmd: "!andy", desc: "Respuesta sobre Andy Wave" },
        { cmd: "!xiaomi", desc: "Enlace a grupo Xiaomi" },
        { cmd: "!bastian", desc: "Respuesta sobre Bastian" },
        { cmd: "!jose", desc: "Respuesta sobre Jose" },
        { cmd: "!pdf", desc: "Herramientas para PDF" },
        { cmd: "!saluda", desc: "Saludo del bot" },
        { cmd: "!chao", desc: "Despedida del bot" },
        { cmd: "!version", desc: "Versión del bot" },
        { cmd: "!lenguaje", desc: "Lenguaje de programación del bot" }
    ],
    "OTROS 🤖": [
        { cmd: "!ayuda <pregunta>", desc: "Pregúntale a la IA 🧠" },
        { cmd: "!id", desc: "Muestra el ID del chat 🆔" }
    ]
};

// --- FUNCIÓN DE MENÚ MEJORADA ---
function handleMenu() {
    let menu = "🤖 *¡Wena! Soy Botillero, tu asistente.* 🤖\n\n";
    menu += "Aquí tení la lista actualizada de todas las weás que cacho hacer.\n";
    menu += "_Usa `!` o `/` pa' los comandos, da lo mismo._\n\n";

    for (const categoria in menuConfig) {
        menu += `*--- ${categoria} ---*\n`;
        menuConfig[categoria].forEach(item => {
            // Usamos un punto diferente para darle más estilo
            menu += `◦ *${item.cmd}*: ${item.desc}\n`;
        });
        menu += "\n"; // Añade un espacio entre categorías
    }
    return menu.trim();
}

// --- FUNCIONES DE LOS COMANDOS (LÓGICA ORIGINAL RESTAURADA) ---

async function handleFarmacias(message) {
    const comuna = message.args[0];
    if (!comuna) {
        return 'Pone la comuna po, wn. Por ejemplo: `!far santiago`';
    }
    const city = comuna.toLowerCase(); // Usamos la variable 'comuna'

    try {
        const response = await axios.get('https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php');
        const farmacias = response.data;
        const filteredFarmacias = farmacias.filter(f => f.comuna_nombre.toLowerCase().includes(city));

        if (filteredFarmacias.length === 0) {
            return `No pillé farmacias de turno en ${city}, compa.`;
        }

        let replyMessage = `🏥 Estas son las farmacias de turno que pillé en *${city.charAt(0).toUpperCase() + city.slice(1)}*:\n\n`;
        filteredFarmacias.slice(0, 5).forEach(f => {
            replyMessage += `*${f.local_nombre}*\n`;
            replyMessage += `Dirección: ${f.local_direccion}\n`;
            replyMessage += `Horario: ${f.funcionamiento_hora_apertura} a ${f.funcionamiento_hora_cierre}\n\n`;
        });
        return replyMessage.trim();
    } catch (error) {
        console.error('Error al obtener las farmacias:', error.message);
        return 'Ucha, se cayó el sistema de las farmacias.';
    }
}

async function handleClima(message) {
    const city = message.args.join(' ');
    if (!city) {
        return "Ya po, dime la ciudad. Ej: `!clima arica`";
    }

    try {
        const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
            params: {
                key: config.weatherApiKey,
                q: city,
                days: 1,
                aqi: 'no',
                alerts: 'no',
                lang: 'es'
            }
        });

        const data = response.data;
        const current = data.current;
        const forecast = data.forecast.forecastday[0].day;
        const location = data.location;

        const reply = `
🌤️ *El tiempo en ${location.name}, ${location.region}*

- *Ahora mismo:* ${current.temp_c}°C, ${current.condition.text}
- *Se siente como:* ${current.feelslike_c}°C
- *Viento:* ${current.wind_kph} km/h
- *Humedad:* ${current.humidity}%

- *Hoy (Máx/Mín):* ${forecast.maxtemp_c}°C / ${forecast.mintemp_c}°C
- *¿Llueve?:* ${forecast.daily_chance_of_rain}% de prob.
        `.trim();
        return reply;
    } catch (error) {
        console.error("Error al obtener el clima de WeatherAPI:", error.response?.data?.error?.message || error.message);
        return `Ucha, no pillé el clima pa' "${city}", sorry.`;
    }
}

async function handleSismos() {
    try {
        const response = await axios.get('https://api.gael.cloud/general/public/sismos');
        let reply = '🌋 *Los últimos 5 temblores en Chilito:*\n\n';
        
        response.data.slice(0, 5).forEach(sismo => {
            const fecha = moment(sismo.Fecha).tz('America/Santiago').format('DD/MM/YYYY HH:mm');
            reply += `*Fecha:* ${fecha}\n`;
            reply += `*Lugar:* ${sismo.RefGeografica}\n`;
            reply += `*Magnitud:* ${sismo.Magnitud} ${sismo.Escala}\n`;
            reply += `*Profundidad:* ${sismo.Profundidad} km\n\n`;
        });
        return reply;
    } catch (error) {
        console.error("Error al obtener sismos:", error);
        return "No pude cachar los temblores, wn.";
    }
}

async function handleBus(message, client) {
    // Aceptar tanto mensaje adaptado (message.args) como raw whatsapp (message.body/message.text)
    const rawText = (message.args ? [message.command, ...message.args].join(' ') : (message.body || message.text || '')).toString();
    const args = message.args || (rawText.trim().split(/\s+/).slice(1));
    const paradero = args[0] ? args[0].toUpperCase() : null;
    if (!paradero) {
        return message.sendMessage("Tírame el código del paradero po. Ej: `!bus PA433`");
    }

    await message.react('⏳');
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://www.red.cl/planifica-tu-viaje/cuando-llega/?codsimt=${paradero}`);
        
        await page.waitForSelector('.nombre-parada', { timeout: 15000 });
        const nombreParadero = await page.$eval('.nombre-parada', el => el.textContent.trim());

        let reply = `🚌 *Paradero ${nombreParadero} (${paradero})*:\n\n`;
        const services = await page.$$eval('#tabla-servicios-paradero tbody tr', rows => 
            rows.map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 3) return null;
                return {
                    servicio: cells[0].innerText,
                    destino: cells[1].innerText,
                    llegadas: [cells[2].innerText, cells[3].innerText]
                };
            }).filter(Boolean)
        );

        if (services.length === 0) {
            await browser.close();
            return message.sendMessage(`No viene ninguna micro pa'l paradero *${paradero}*.`);
        }

        services.forEach(s => {
            reply += `*Micro ${s.servicio}* (va pa' ${s.destino})\n`;
            reply += `  - Llega en: ${s.llegadas[0]}\n`;
            reply += `  - La siguiente: ${s.llegadas[1]}\n\n`;
        });
        
        await browser.close();
        await message.react('✅');
        return message.sendMessage(reply.trim());

    } catch (error) {
        console.error("Error con Puppeteer en !bus:", error);
        if (browser) await browser.close();
        await message.react('❌');
        return message.sendMessage(`No pude cachar la info del paradero *${paradero}*. A lo mejor pusiste mal el código.`);
    }
}

async function handleSec(message) {
    const command = message.text.toLowerCase().split(' ')[0];
    let region = null;
    if (command === '!secrm' || command === '/secrm') {
        region = 'Metropolitana';
    }
    return generateWhatsAppMessage(region);
}

// Se elimina handleFeriados de las exportaciones ya que no está definida en este archivo
// y probablemente se maneja a través de python.service directamente en command.handler.js
module.exports = { 
    handleFarmacias,
    handleClima,
    handleSismos,
    handleBus,
    handleSec,
    handleMenu
};