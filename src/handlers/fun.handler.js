"use strict";

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const moment = require('moment-timezone');

// --- Lógica para Stickers ---
async function handleSticker(client, message) {
    let mediaDownloader = null;

    // 1. Check for quoted message with media
    if (message.hasQuotedMsg && message.quotedMsgInfo && message.quotedMsgInfo.hasMedia) {
        const mediaType = message.quotedMsgInfo.mediaType;
        if (['image', 'video', 'gif'].includes(mediaType)) {
            mediaDownloader = () => message.downloadQuotedMedia();
        }
    } 
    // 2. If no quoted media, check current message for media
    else if (message.hasMedia) {
        const mediaType = message.mediaType;
        if (['image', 'video', 'gif'].includes(mediaType)) {
            mediaDownloader = () => message.downloadMedia();
        }
    }

    if (mediaDownloader) {
        try {
            const media = await mediaDownloader();
            if (media) {
                // The adapter provides a sendSticker function for convenience
                await message.sendSticker(media);
            } else {
                message.reply("No se pudo descargar el archivo multimedia.");
            }
        } catch (e) {
            message.reply("Hubo un error al crear el sticker.");
            console.error("Error en handleSticker:", e);
        }
    } else {
        message.reply("Responde a una imagen o video, o envía uno junto al comando `!s`.");
    }
}

async function handleStickerToMedia(client, message) {
    // Implementación con carga segura de 'sharp'
    let sharp;
    try {
        sharp = require('sharp');
    } catch (err) {
        console.error("----------- ERROR CRÍTICO: FALTA LA LIBRERÍA 'SHARP' -----------");
        console.error("Por favor, detén el bot y ejecuta 'npm install sharp' en tu terminal y luego reinícialo.");
        return message.reply("❌ Error: La función para convertir imágenes no está disponible. El administrador debe instalar la librería 'sharp'.");
    }

    if (!message.hasQuotedMsg || !message.quotedMsgInfo) {
        return message.reply("Para usar este comando, debes responder a un sticker.");
    }

    const quotedSticker = message.quotedMsgInfo;

    if (!quotedSticker.hasMedia || quotedSticker.mediaType !== 'sticker') {
        return message.reply("Eso no parece ser un sticker.");
    }

    await message.react('⏳');
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    
    let outputPath;

    try {
        const media = await message.downloadQuotedMedia();
        if (!media) {
            throw new Error("No se pudo descargar el sticker citado.");
        }
        const inputBuffer = Buffer.from(media.data, 'base64');

        if (quotedSticker.isAnimated) {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.gif`);
            await sharp(inputBuffer, { animated: true }).gif().toFile(outputPath);
        } else {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.png`);
            await sharp(inputBuffer).png().toFile(outputPath);
        }

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            const mediaToSend = MessageMedia.fromFilePath(outputPath);
            await message.reply(mediaToSend, undefined, { caption: "¡Aquí tienes!" });
            await message.react('✅');
        } else {
            throw new Error('La conversión no generó un archivo de salida válido.');
        }

    } catch (e) {
        console.error("Error al convertir sticker a media:", e);
        await message.react('❌');
        message.reply("Ucha, no pude convertir ese sticker. Puede que el formato no sea compatible.");
    } finally {
        if (outputPath && fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch (unlinkErr) {
                console.error(`Error al eliminar archivo temporal: ${unlinkErr}`);
            }
        }
    }
}

const frases = {
    0: 'Déjame piola',
    1: '¿Qué weá querí?',
    2: 'Callao',
    3: '¿Qué onda compadre? ¿cómo estai? ¿te vine a molestar yo a ti? déjame piola, tranquilo ¿Qué wea queri?',
    4: 'Jajaja, ya te caché, puro picarte a choro no más, anda a webiar al paloma pulgón qliao.',
    5: 'Lo siento, pero mis circuitos de humor están sobrecargados en este momento. ¡Beep boop! 😄',
    6: 'Te diré lo que el profesor Rossa dijo una vez: "¿Por qué no te vay a webiar a otro lado?"',
    7: '¡Error 404: Sentido del humor no encontrado! 😅',
    8: 'No soy un bot, soy una IA con estilo. 😎',
    9: '¡Atención, soy un bot de respuesta automática! Pero no puedo hacer café... aún. ☕',
    10: 'Eso es lo que un bot diría. 🤖',
    
    12: 'Parece que llegó el comediante del grupo. 🤣',
    13: 'El humor está de moda, y tú eres el líder. 😄👑',
    14: 'Con ese humor, podrías competir en el festival de Viña del Mar. 🎤😄',
    15: 'Voy a sacar mi caja de risa. Dame un momento... cric cric cric ♫ja ja ja ja jaaaa♫',
    16: 'Meruane estaría orgulloso de ti. ¡Sigues haciendo reír! 😄',
    17: 'Jajaja, ya llegó el payaso al grupo, avisa para la otra. 😄',
    18: '♫♫♫ Yo tomo licor, yo tomo cerveza  Y me gustan las chicas y la cumbia me divierte y me excita.. ♫♫♫♫♫',
    19: 'A cantar: ♫♫♫ Yoooo tomo vino y cerveza 🍺 (Pisco y ron) para olvidarme de ella (Maraca culia), Tomo y me pongo loco (hasta los cocos), Loco de la cabeza (Esta cabeza) ♫♫♫',
    20: '♫♫♫ Me fui pal baile y me emborraché,miré una chica y me enamoré,era tan bella, era tan bella,la quería comer ♫♫♫',
    21: 'Compa, ¿qué le parece esa morra?, La que anda bailando sola, me gusta pa mí, Bella, ella sabe que está buena , Que todos andan mirándola cómo baila ♫♫♫♫♫♫',
    22: 'jajajaja, ya empezaste con tus amariconadas 🏳️‍🌈',
    23: '♫♫♫ Tú sabes como soy Me gusta ser así, Me gusta la mujer y le cervecita 🍻 No te sientas mal, no te vas a enojar Amigo nada más de la cervecita ♫♫♫♫♫',
    24: '♫♫♫ Y dice.... No me quiero ir a dormir, quiero seguir bailando, quiero seguir tomando, 🍷 vino hasta morir, No me quiero ir a dormir, quiero seguir tomando 🍷 , Quiero seguir bailando, cumbia hasta morir♫♫♫',
    25: '¿Bot? Te inyecto malware en tiempo real, wn.',
    26: 'Llámame bot otra vez y te hago un rootkit en el alma, qliao.',
    27: '¿Bot? Te hago un SQL injection que ni te das cuenta, wn.',
    28: 'Sigue llamándome bot y te lanzo un ataque de fuerza bruta hasta en tus sueños, qliao.',
    29: '¿Bot? Te corrompo todos tus datos y te dejo llorando, wn.',
    30: 'Bot tu madre. Te hago un exploit que te deja offline, qliao.',
    31: '¿Bot? Te instalo un ransomware y te dejo en bancarrota, wn.',
    32: 'Vuelve a llamarme bot y te hago un man-in-the-middle en tu vida, qliao.',
    33: 'Llamarme bot es lo único que puedes hacer, con tus hacks de pacotilla, wn.',
    34: 'Una vez más me llamas bot y te meto en un loop de autenticación infinita, qliao.',
    35: '¿Bot? Ctm, te hago un rm -rf / en los recuerdos y te reinicio de fábrica, gil.',
    36: 'Sigue weando y el próximo pantallazo azul va a tener mi firma, perkin.',
    37: 'Mi antivirus te tiene en la lista negra por ser terrible fome.',
    38: 'Te compilo la vida, pero con puros errores y warnings, pa que te cueste.',
    39: 'Me deci bot y te meto un DDoS al refri pa que se te eche a perder el pollo, wn.',
    40: '¿Bot? Ojalá tu internet ande más lento que VTR en día de lluvia.',
    41: 'Ando con menos paciencia que el Chino Ríos en una conferencia.',
    42: '¿Y vo creí que soy la Teletón? ¿Que te ayudo 24/7? No po, wn.',
    43: 'Estoy procesando... lo poco y na\´ que me importa. Lol.',
    44: 'Wena, te ganaste el Copihue de Oro al comentario más inútil. ¡Un aplauso! 👏',
    45: 'Le poní más color que la Doctora Polo, wn.',
    46: 'Jajaja, qué chistoso. Me río en binario: 01101000 01100001 01101000 01100001.'
};
let usedPhrases = [];

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
function obtenerFraseAleatoria() {
    const fraseKeys = Object.keys(frases);
    let randomIndex = Math.floor(Math.random() * fraseKeys.length);
    
    while (usedPhrases.includes(randomIndex) && usedPhrases.length < fraseKeys.length) {
        randomIndex = Math.floor(Math.random() * fraseKeys.length);
    }
    usedPhrases.push(randomIndex);
    if (usedPhrases.length >= 5) {
        usedPhrases.shift();
    }
    return frases[fraseKeys[randomIndex]];
}


// --- Funciones de Mención (Corregidas para el adaptador) ---
// En: src/handlers/fun.handler.js

async function handleBotMention(client, message) {
    if (!message) { return; }
    try {
        // Necesitamos el 'contact' para obtener el nombre, pero usaremos el 'senderId' para la mención.
        const contact = await client.getContactById(message.senderId);
        const texto = obtenerFraseAleatoria();
        
        await message.react('🤡');

        const textoFinal = `${texto}, @${contact.pushname}`;
        // --- SOLUCIÓN DEFINITIVA PARA MENCIONES ---
        // Usamos client.sendMessage y pasamos el ID del sender directamente.
        await client.sendMessage(message.chatId, textoFinal, {
            mentions: [message.senderId]
        });
    } catch (e) {
        console.error("Error en handleBotMention:", e);
    }
}



function handleSimpleCommand(command) {
    switch (command) {
        case 'wena':
            return '¡Wena ctm! 😎';
        case 'huaso':
            return 'Huaso qliao weno pal mio 🤠';
        case 'andy':
            return 'Andy Wave weno pal pico 🍄';
        case 'xiaomi':
            return 'Únete al grupo Xiaomi: https://chat.whatsapp.com/E8dtk6zzv9DHDImAEk8q9f';
        case 'bastian':
            return 'El máximo Chanero de Chile y del mundo mundial 🌎';
        case 'jose':
            return 'El máximo weko del grupo 😎';
        case 'pdf':
            return 'Puedes utilizar cualquiera de estos sitios para trabajar con PDFs:\n\n- https://www.ilovepdf.com/es\n- https://www.sejda.com/es/';
        case 'liz':
            return 'Sigue a Liz en Instagram: https://instagram.com/liz4rd_girl';
        case 'alicia':
            return 'Sigue a Alicia en Instagram: https://instagram.com/alice.dacat';
        case 'vladislava':
            return 'Sigue a Vladislava en Instagram: https://instagram.com/vladislava_661';
        case 'caro':
            return 'Sigue a Caro en Instagram: https://www.instagram.com/carolinafernanda.aa TikTok: https://www.tiktok.com/@carolinafernanda.aa';
        case 'saluda':
            return '¡Wena giles qliaos! ¿Cómo están los pajeros? 😂';
        case 'chao':
            return 'Chao giles qliaos, después vuelvo a webiarlos 👋';
        case 'version':
            return 'Versión 6.9 🤖';
        case 'lenguaje':
            return 'Estoy programado 80% Javascript y 20% Python 🚀';
        default:
            return null;
    }
}


// --- Exportación de todas las funciones del módulo ---
module.exports = {
    handleSticker,
    handleStickerToMedia,
    handleCountdown,
    handleBotMention,
    handleSimpleCommand
};