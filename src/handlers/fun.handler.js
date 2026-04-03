// src/handlers/fun.handler.js
"use strict";

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const ffmpeg = require('fluent-ffmpeg');
const { MessageMedia } = require('whatsapp-web.js');

// --- Sistema de Caché de Medias ---
const mediaCache = [];
const MAX_CACHE_SIZE = 3;
const MAX_VIDEO_DURATION = 5; // segundos

// Función para agregar media al caché
function addToMediaCache(messageId, media, mimetype, from) {
    try {
        // Solo guardar si es imagen, gif o video
        if (!mimetype.includes('image') && !mimetype.includes('video')) return;
        
        // Evitar duplicados
        const exists = mediaCache.find(item => item.messageId === messageId);
        if (exists) return;
        
        mediaCache.unshift({ 
            messageId, 
            media, 
            mimetype, 
            from, 
            timestamp: Date.now() 
        });
        
        if (mediaCache.length > MAX_CACHE_SIZE) {
            mediaCache.pop();
        }
        
        console.log(`(MediaCache) -> Nueva media guardada: ${mimetype.split('/')[0]} de ${from.split('@')[0]}`);
    } catch (err) {
        console.error('(MediaCache) -> Error al guardar:', err);
    }
}

// Validar duración de video usando ffprobe
async function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const duration = metadata.format.duration;
            resolve(duration);
        });
    });
}

// --- Lógica para Stickers ---
async function handleSticker(client, message) {
    try {
        // Feedback visual inmediato
        try { await message.react('⏳'); } catch (e) {}

        let mediaMessage = message;
        let media = null;
        let downloadSource = 'directo';

        // si no tiene media, revisa si responde a una
        if (!message.hasMedia && message.hasQuotedMsg) {
            try {
                const quoted = await message.getQuotedMessage();
                if (quoted && quoted.hasMedia) {
                    mediaMessage = quoted;
                    downloadSource = 'quoted';
                    console.log(`(Sticker) -> Usando mensaje citado de tipo: ${quoted.type}`);
                }
            } catch (quotedErr) {
                console.error('(Sticker) -> Error al obtener mensaje citado:', quotedErr);
            }
        }

        // Intentar descargar media
        if (mediaMessage.hasMedia) {
            try {
                console.log(`(Sticker) -> Descargando desde ${downloadSource}...`);
                media = await mediaMessage.downloadMedia();
                
                if (!media) {
                    console.log('(Sticker) -> downloadMedia() retornó null, intentando con caché...');
                }
            } catch (downloadErr) {
                console.error('(Sticker) -> Error en downloadMedia():', downloadErr.message);
                console.log('(Sticker) -> Buscando en caché de medias recientes...');
            }
        }

        // Si falla la descarga directa, buscar en caché
        if (!media && mediaCache.length > 0) {
            console.log(`(Sticker) -> Usando media del caché (${mediaCache.length} disponibles)`);
            const cached = mediaCache[0]; // Más reciente
            media = cached.media;
            downloadSource = 'cache';
        }

        // Si aún no hay media, error
        if (!media) {
            return message.reply('❌ Responde a una imagen, gif o video con `!s` o envía media directamente.');
        }

        console.log(`(Sticker) -> Media obtenida desde: ${downloadSource}, tipo: ${media.mimetype}`);

        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const ext = media.mimetype.split('/')[1].split(';')[0];
        const timestamp = Date.now();
        const tempFilePath = path.join(tempDir, `sticker_in_${timestamp}.${ext}`);
        const outputFilePath = path.join(tempDir, `sticker_out_${timestamp}.webp`);

        fs.writeFileSync(tempFilePath, media.data, 'base64');

        const isAnimated = media.mimetype.includes('video') || media.mimetype.includes('gif');

        // Validar duración de video
        if (isAnimated && media.mimetype.includes('video')) {
            try {
                const duration = await getVideoDuration(tempFilePath);
                console.log(`(Sticker) -> Video duración: ${duration.toFixed(2)} segundos`);
                
                if (duration > MAX_VIDEO_DURATION) {
                    fs.unlinkSync(tempFilePath);
                    return message.reply(`❌ El video es muy largo (${duration.toFixed(1)}s). Máximo ${MAX_VIDEO_DURATION} segundos para stickers.`);
                }
            } catch (probeErr) {
                console.error('(Sticker) -> Error al verificar duración:', probeErr);
                // Continuar de todos modos, ffmpeg cortará si es muy largo
            }
        }

        await new Promise((resolve, reject) => {
            const command = ffmpeg(tempFilePath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve());

            if (isAnimated) {
                // Configuración optimizada para animados (evita superposición de frames)
                command
                    .inputOptions(['-t 6'])  // Máximo 6 segundos
                    .outputOptions([
                        '-vcodec libwebp',
                        // CORRECCIÓN: Scale con pad para centrar y evitar artefactos
                        '-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=10,setsar=1',
                        '-loop 0',
                        '-preset default',
                        '-lossless 0',  // No usar lossless (muy pesado)
                        '-quality 75',  // Calidad balanceada
                        '-compression_level 4',  // Compresión media
                        '-an',  // Sin audio
                        '-metadata:s:v:0 alpha_mode="1"'  // Soporte de transparencia
                    ])
                    .toFormat('webp');
            } else {
                // Configuración SIMPLE para estáticos
                command
                    .outputOptions([
                        '-vcodec libwebp',
                        '-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                        '-qscale 75'
                    ])
                    .toFormat('webp');
            }
            
            command.save(outputFilePath);
        });

        // Validar que el archivo se generó correctamente
        if (!fs.existsSync(outputFilePath)) {
            throw new Error('No se generó el archivo WebP');
        }

        const stats = fs.statSync(outputFilePath);
        console.log(`(Sticker) -> WebP generado: ${(stats.size / 1024).toFixed(2)} KB`);

        // Validar tamaño (WhatsApp tiene límite de ~500KB para stickers)
        if (stats.size > 500 * 1024) {
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputFilePath);
            return message.reply('❌ El sticker es muy grande (>500KB). Usa un video/gif más corto.');
        }

        const webpMedia = MessageMedia.fromFilePath(outputFilePath);
        await message.reply(webpMedia, undefined, { sendMediaAsSticker: true });
        
        try { await message.react('✅'); } catch (e) {}

        // Limpieza
        try {
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputFilePath);
        } catch (e) {}

    } catch (err) {
        console.error('(Sticker) -> Error:', err);
        try { await message.react('❌'); } catch (e) {}
        message.reply('❌ Error al crear sticker. Intenta con una imagen, GIF o video más corto.');
    }
}

function getCountdownMessage(targetDate, eventName, emoji) {
    const now = moment().tz('America/Santiago');
    const diff = moment.duration(targetDate.diff(now));

    if (diff.asMilliseconds() <= 0) return `¡Feliz ${eventName}! ${emoji}`;

    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();

    return `Para ${eventName} quedan: ${days} días, ${hours} horas y ${minutes} minutos ${emoji}`;
}

function handleCountdown(command) {
    const year = moment().year();
    switch (command) {
        case '18':
            return getCountdownMessage(moment.tz(`${year}-09-18 00:00:00`, 'America/Santiago'), 'el 18', '🇨🇱');
        case 'navidad':
            return getCountdownMessage(moment.tz(`${year}-12-25 00:00:00`, 'America/Santiago'), 'Navidad', '🎅');
        case 'añonuevo':
            return getCountdownMessage(moment.tz(`${year + 1}-01-01 00:00:00`, 'America/Santiago'), 'Año Nuevo', '🎆');
        default:
            return null;
    }
}

const frases = [
    'Hola, ¿Qué necesitás?',
    '¿Cómo te puedo ayudar?',
    'Estoy acá para asistirte'
];
let usedPhrases = [];

function obtenerFraseAleatoria() {
    let randomIndex = Math.floor(Math.random() * frases.length);
    
    while (usedPhrases.includes(randomIndex) && usedPhrases.length < frases.length) {
        randomIndex = Math.floor(Math.random() * frases.length);
    }
    usedPhrases.push(randomIndex);
    if (usedPhrases.length >= 5) {
        usedPhrases.shift();
    }
    return frases[randomIndex];
}

async function reactAndReplyWithMention(message, text, reaction, separator = ', ') {
    try {
        // Obtener el ID del usuario de manera más directa
        const userId = message.author || message.from;
        
        if (!userId) {
            console.error("No se pudo obtener el ID del usuario");
            return message.reply(text);
        }
        
        // Intentar reaccionar, pero ignorar si falla
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await message.react(reaction);
        } catch (reactionError) {
            // Ignoramos el error cosmético
        }
        
        // Extraer solo el número de usuario (antes del @)
        const userNumber = userId.split('@')[0];
        
        await message.reply(`${text}${separator}@${userNumber}`, undefined, {
            mentions: [userId]
        });
    } catch (e) {
        console.error("Error en reactAndReplyWithMention:", e);
        // Fallback: responder sin mención si falla todo
        try {
            await message.reply(text);
        } catch (fallbackError) {
            console.error("Error en fallback:", fallbackError);
        }
    }
}

async function handleBotMention(client, message) {
    const texto = obtenerFraseAleatoria();
    await reactAndReplyWithMention(message, texto, '🤡', ', ');
}

async function handleOnce(client, message) {
    await reactAndReplyWithMention(message, 'Chupalo entonces', '😂', ' ');
}


module.exports = {
    handleSticker,
    handleCountdown,
    handleBotMention,
    handleOnce,
    addToMediaCache
};
