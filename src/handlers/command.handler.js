"use strict";

const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// --- Importaciones de Servicios (Python y otros) ---
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const economyService = require('../services/economy.service');
const externalService = require('../services/external.service');
const messagingService = require('../services/messaging.service.js');
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');
const bannerService = require('../services/banner.service.js');
const textoService = require('../services/texto.service.js');
const networkService = require('../services/network.service.js');
const utilityService = require('../services/utility.service.js');
// const rutificadorService = require('../services/rutificador.service.js'); // Eliminado

// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu } = require('./utility.handler');
const { handleSticker, handleStickerToMedia, handleCountdown } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePhoneSearch, handleTneSearch, handlePatenteSearch } = require('./personalsearch.handler'); // Eliminado handleRutSearch
const { handleNetworkQuery, handleNicClSearch } = require('./network.handler');

// --- Utilidades ---
const countdownCommands = ['18', 'navidad', 'añonuevo'];

// Esta función ahora es interna y se usa de forma diferente
function getArgs(body) {
    return body.trim().split(/\s+/).slice(1);
}

async function commandHandler(client, message) {

    // Normalizar texto
    const rawText = (message.body || '').toLowerCase().trim();

    // 1) Ignorar por completo cualquier mensaje que contenga la palabra "bot"
    if (/\bbot\b/i.test(rawText)) return;

    // 2) Procesar SOLO mensajes con prefijo (! o /)
    const hadPrefix = rawText.startsWith('!') || rawText.startsWith('/');
    if (!hadPrefix) return;

    // A partir de aquí puedes construir el comando usando rawText
    const command = rawText.substring(1).split(' ')[0];
    let replyMessage;

    console.log(`(Handler) -> Comando recibido: "${command}"`);

    // --- Menciones y comandos especiales (se ejecutan primero) ---
    if (/\b(bot|boot|bott|bbot)\b/.test(rawText)) {
        return handleBotMention(client, message);
    }
    if (/\b(once|onse|11)\b/.test(rawText)) {
        return handleOnce(client, message);
    }

    // --- NUEVA LÓGICA DE DETECCIÓN DE COMANDOS ---
    const commandMatch = message.body.match(/(?:!|\/)(\w+)/);

    // Si no se encuentra un patrón como !comando en todo el texto, no hace nada más.
    if (!commandMatch) {
        return;
    }

    // commandMatch[0] es el comando con prefijo (ej: "!metro")
    // commandMatch[1] es solo el comando (ej: "metro")
    const extractedCommand = commandMatch[1].toLowerCase();
    
    // Para que el resto de la lógica de argumentos funcione, "simulamos"
    // que el mensaje empieza con el comando encontrado.
    const commandStartIndex = message.body.indexOf(commandMatch[0]);
    const simulatedBody = message.body.substring(commandStartIndex);
    
    // Creamos un objeto de mensaje modificado para no alterar el original.
    // Los handlers que necesiten leer argumentos usarán este objeto.
    const modifiedMessage = { ...message, body: simulatedBody };

    // --- Comandos de countdown ---
        // NUEVA LÓGICA DE REACCIÓN CONTEXTUAL
        let reactionTarget = message; // Por defecto, reacciona al propio comando
        if (message.hasQuotedMsg) {
            // Si es una respuesta, el objetivo de la reacción es el mensaje citado
            reactionTarget = await message.getQuotedMessage();
        }

        if (countdownCommands.includes(extractedCommand)) {
            replyMessage = handleCountdown(extractedCommand);
            return message.reply(replyMessage);
        }

    // El switch ahora opera con el comando extraído
    // Y le pasamos el "modifiedMessage" a los handlers que leen argumentos
    switch (extractedCommand) {
        case 'tabla':
        case 'ligatabla':
            messagingService.sendLoadingMessage(message);
            replyMessage = await getLeagueTable();
            break;
        case 'prox':
        case 'ligapartidos':
            messagingService.sendLoadingMessage(message);
            replyMessage = await getLeagueUpcomingMatches();
            break;
        case 'partidos':
            messagingService.sendLoadingMessage(message);
            replyMessage = await getMatchDaySummary();
            break;
        
        case 'metro': {
            messagingService.sendLoadingMessage(message);
            const metroResult = await metroService.getMetroStatus();
            if (metroResult.type === 'video') {
                const media = MessageMedia.fromFilePath(metroResult.path);
                return client.sendMessage(message.from, media, { caption: metroResult.caption });
            } else {
                replyMessage = metroResult.content;
            }
            break;
        }

        case 'random':
            try {
                messagingService.sendLoadingMessage(message);
                const randomInfo = await utilityService.getRandomInfo();
                if (typeof randomInfo === 'object' && randomInfo.type === 'image') {
                    const media = await MessageMedia.fromUrl(randomInfo.url, { unsafeMime: true });
                    await client.sendMessage(message.from, media, { caption: randomInfo.caption });
                } else if (typeof randomInfo === 'string' && randomInfo) {
                    await client.sendMessage(message.from, randomInfo);
                } else {
                    await message.reply("No pude obtener un dato aleatorio, intenta de nuevo.");
                }
            } catch (error) {
                console.error("[DEBUG command.handler] Error en !random:", error);
                await message.reply("Ucha, algo se rompió feo con el comando !random. Revisa la consola.");
            }
            return;

        case 'tclasi': case 'selecciontabla':
            replyMessage = await nationalTeamService.getQualifiersTable();
            break;
        case 'clasi': case 'seleccionpartidos':
            replyMessage = await nationalTeamService.getQualifiersMatches();
            break;
        case 'valores':
            replyMessage = await economyService.getEconomicIndicators();
            break;
        case 'bencina': {
            // Captura todo lo que venga después del comando, incluyendo espacios
            const match = (message.body || '').match(/^(?:[!\/]\w+)\s+(.+)$/i);
            const comuna = match ? match[1].trim() : '';

            if (!comuna) {
                replyMessage = "Debes especificar una comuna. Ejemplo: `!bencina santiago`";
            } else {
                messagingService.sendLoadingMessage(message);
                replyMessage = await externalService.getBencinaData(comuna);
            }
            break;
        }
        case 'trstatus':
            replyMessage = await externalService.getTraductorStatus();
            break;
        case 'bolsa':
            replyMessage = await externalService.getBolsaData();
            break;

        case 'ping': replyMessage = await handlePing(message, client); break;
        case 'feriados': replyMessage = await utilityService.getFeriados(); break;
        case 'far': replyMessage = await handleFarmacias(modifiedMessage); break;
        case 'clima': replyMessage = await handleClima(modifiedMessage); break;
        case 'sismos': replyMessage = await handleSismos(); break;
        case 'bus': return handleBus(modifiedMessage, client);
        case 'sec': case 'secrm': replyMessage = await handleSec(modifiedMessage); break;
        case 'menu': case 'comandos': replyMessage = handleMenu(); break;
        case 'wiki': replyMessage = await handleWikiSearch(modifiedMessage); break;
        case 'noticias': replyMessage = await handleNews(); break;
        case 'g': replyMessage = await handleGoogleSearch(modifiedMessage); break;
        case 'pat': case 'patente': return handlePatenteSearch(modifiedMessage);
        // case 'rut': case 'nombre': return handleRutSearch(modifiedMessage); // Eliminado
        case 's': return handleSticker(client, message);
        case 'toimg': case 'imagen': return handleStickerToMedia(client, message);
        case 'chiste': return handleJoke(client, message);
        case 'ayuda': replyMessage = await handleAiHelp(modifiedMessage); break;
        case 'num': case 'tel': return handlePhoneSearch(client, message);
        case 'id':
            message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
            return;

        case 'net':
        case 'whois': {
            const domainToAnalyze = getArgs(modifiedMessage.body)[0];
            if (!domainToAnalyze) {
                return message.reply("Por favor, dame un dominio o IP para analizar. Ej: `!net google.com`");
            }
            messagingService.sendLoadingMessage(message);
            const fullResult = await networkService.analyzeDomain(domainToAnalyze);
            const [messageText, filePath] = fullResult.split('|||FILE_PATH|||');
            await client.sendMessage(message.from, messageText.trim());
            if (filePath && filePath.trim()) {
                const cleanFilePath = filePath.trim();
                const fileMedia = MessageMedia.fromFilePath(cleanFilePath);
                await client.sendMessage(message.from, fileMedia);
                setTimeout(() => {
                    try {
                        fs.unlinkSync(cleanFilePath);
                    } catch (err) {
                        console.error(`(Limpieza) -> Error al eliminar el archivo temporal: ${err.message}`);
                    }
                }, 15000);
            }
            return;
        }

        case 'banner': {
            const args = getArgs(modifiedMessage.body);
            if (args.length < 2) {
                return message.reply("Formato incorrecto. Usa: `!banner <estilo> <texto>`.\n\nEstilos disponibles: `vengadores`, `shrek`, `mario`, `nintendo`, `sega`, `potter`, `starwars`,`disney`, `stranger`.");
            }
            const style = args[0];
            const text = args.slice(1).join(' ');
            try {
                message.reply(`Creando tu banner estilo *${style}*... ✨`);
                const bannerPath = await bannerService.createBanner(style, text);
                const bannerMedia = MessageMedia.fromFilePath(bannerPath);
                await client.sendMessage(message.from, bannerMedia);
                fs.unlinkSync(bannerPath);
            } catch (error) {
                message.reply(`Hubo un error: ${error.message}`);
            }
            return;
        }

        case 'texto': {
            let imageMsg_texto = null;
            if (message.hasMedia) {
                imageMsg_texto = message;
            } else if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    imageMsg_texto = quotedMsg;
                }
            }
            if (!imageMsg_texto) {
                return message.reply("Para agregar texto, envía una imagen con el comando en el comentario, o responde a una imagen.");
            }
            const textoCompleto = getArgs(modifiedMessage.body).join(' ');
            if (!textoCompleto.includes('-')) {
                return message.reply("Formato incorrecto. Usa: `!texto texto arriba - texto abajo`");
            }
            const [textoArriba, textoAbajo] = textoCompleto.split('-').map(t => t.trim());
            try {
                const media = await imageMsg_texto.downloadMedia();
                if (media) {
                    const tempImagePath = `./temp_texto_${Date.now()}.${media.mimetype.split('/')[1] || 'jpeg'}`;
                    fs.writeFileSync(tempImagePath, Buffer.from(media.data, 'base64'));
                    message.reply("Añadiendo texto a tu imagen... ✍️");
                    const finalImagePath = await textoService.addTextToImage(tempImagePath, textoArriba, textoAbajo);
                    const finalMedia = MessageMedia.fromFilePath(finalImagePath);
                    await client.sendMessage(message.from, finalMedia);
                    fs.unlinkSync(tempImagePath);
                    fs.unlinkSync(finalImagePath);
                }
            } catch (error) {
                console.error(error);
                message.reply("Hubo un error al procesar la imagen. 😔");
            }
            return;
        }

        default:
            // Si el comando extraído no está en el switch, no hacemos nada.
            // Esto evita que el bot responda a cualquier palabra que empiece con "!"
            if (hadPrefix) {
                message.reply('Comando no encontrado. Usa !menu o !ayuda para ver comandos disponibles.');
            }
            break;
    }

    if (replyMessage) {
        message.reply(replyMessage);
    }
}
module.exports = commandHandler;
