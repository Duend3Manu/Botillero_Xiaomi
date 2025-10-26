"use strict";

// --- Importaciones de todos los Servicios y Handlers necesarios ---
const economyService = require('../services/economy.service');
const leagueService = require('../services/league.service.js');
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');

const externalService = require('../services/external.service');
const utilityService = require('../services/utility.service.js');

const { handlePing } = require('./system.handler.js');
const { handleMenu, handleClima, handleSismos, handleFeriados, handleFarmacias, handleSec, handleBus } = require('./utility.handler.js');
const { 
    handleSticker, handleStickerToMedia, handleCountdown, handleBotMention, 
    handleOnce, handleSimpleCommand
} = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleXvideosSearch } = require('./adult.handler');
const { handleFapSearch } = require('./fap.handler'); // New import

const { handleAiHelp } = require('./ai.handler');
const { handlePatenteSearch, handleTneSearch, handlePhoneSearch } = require('./personalsearch.handler.js');
const { handleNetworkQuery } = require('./network.handler.js');
const { handleBanner } = require('./banner.handler.js');

const { exec } = require('child_process'); // <--- AÑADIR ESTA LÍNEA
const util = require('util'); // <--- AÑADIR ESTA LÍNEA
const execPromise = util.promisify(exec); // <--- AÑADIR ESTA LÍNEA
// --- Utilidades ---

const countdownCommands = ['18', 'navidad', 'añonuevo'];

/**
 * callHandler: invoca un handler intentando ambas firmas posibles:
 *  - handler(message)
 *  - handler(client, message)
 * Si el handler no existe retorna undefined y propaga errores.
 */
async function callHandler(fn, client, message, ...extra) {
    if (typeof fn !== 'function') return undefined;
    try {
        if (fn.length >= 2) {
            return await fn(client, message, ...extra);
        }
        return await fn(message, ...extra);
    } catch (err) {
        throw err;
    }
}

async function commandHandler(client, message) {

    try {
        // Verificación de seguridad: si el mensaje no es válido o no tiene texto, lo ignoramos.
        if (!message || !message.text) {
            return;
        }

        const rawText = message.text.toLowerCase().trim();

        // --- Menciones y comandos especiales sin prefijo ---
        // if (rawText.includes('bot')) return handleBotMention(client, message); // <-- CAMBIO 2: Se pasa 'client'
        

        // Ignoramos mensajes que no son comandos con prefijo
        if (!rawText.startsWith('!') && !rawText.startsWith('/')) {
            return;
        }

        const command = rawText.substring(1).split(' ')[0];
        console.log(`(Handler) -> Comando recibido en ${message.platform}: "${command}"`);

        try {
            // Respuestas aleatorias y mención al usuario
            const responses = ['Al tiro', 'Estamos en eso'];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const contact = await client.getContactById(message.senderId);
            const text = `${randomResponse} @${contact.pushname}`;
            await client.sendMessage(message.chatId, text, { mentions: [contact.id._serialized] });
        } catch (e) {
            console.error("Error al enviar la respuesta con mención:", e);
            // No detenemos la ejecución, solo lo logeamos. El comando principal debe seguir.
        }

        const simpleCommandResponse = handleSimpleCommand(command);
        if (simpleCommandResponse) {
            return message.reply(simpleCommandResponse);
        }

        if (countdownCommands.includes(command)) {
            return message.reply(handleCountdown(command));
        }

        // --- Manejo del resto de comandos ---
        let replyMessage; // <-- CAMBIO 5: Se define replyMessage aquí
        switch (command) {
            // Comandos de Fútbol y Deportes
            case 'tabla': case 'ligatabla':
                await message.showLoading();
                return message.reply(await leagueService.getLeagueTable());
            case 'prox': case 'ligapartidos':
                await message.showLoading();
                return message.reply(await leagueService.getLeagueUpcomingMatches());
            case 'partidos':
                await message.showLoading();
                return message.reply(await leagueService.getMatchDaySummary());
            case 'tclasi': case 'selecciontabla':
                return message.reply(await nationalTeamService.getQualifiersTable());
            case 'clasi': case 'seleccionpartidos':
                return message.reply(await nationalTeamService.getQualifiersMatches());
case 'mundial':
                await message.showLoading(); // Usamos tu función nativa de "cargando"
                try {
                    const { stdout, stderr } = await execPromise('python ./scripts/mundial.py');
                    if (stderr) {
                        console.error(`(Mundial Script) stderr: ${stderr}`);
                        return message.reply('❌ Ocurrió un error en el script de Python.');
                    }
                    // Si todo sale bien, stdout tiene el texto formateado
                    return message.reply(stdout);
                } catch (error) {
                    console.error(`(Mundial Script) exec error: ${error}`);
                    return message.reply('❌ No se pudo ejecutar el script del mundial. Revisa la consola de errores del bot.');
                }
            // ------------------------------------
            // Comandos de Servicios y APIs Externas
            case 'metro':
                await message.showLoading();
                const metroResult = await metroService.getMetroStatus();
                if (metroResult.type === 'video' && message.platform === 'whatsapp') {
                    return message.sendAnimation(metroResult.path, metroResult.caption);
                }
                return message.reply(metroResult.content);
            case 'random':
                await message.showLoading();
                const randomInfo = await utilityService.getRandomInfo();
                if (typeof randomInfo === 'object' && randomInfo.type === 'image') {
                    return message.sendImage(randomInfo.url, randomInfo.caption);
                }
                return message.reply(randomInfo);
            case 'valores':
                return message.reply(await economyService.getEconomicIndicators());
            
            case 'bencina':
                return message.reply(await externalService.getBencinaData(message.args[0]));
            case 'bolsa':
                return message.reply(await externalService.getBolsaData());
                
            // Comandos de Búsqueda Personal
            case 'tel': case 'num': return handlePhoneSearch(client, message);
            case 'pat': case 'patente': return handlePatenteSearch(message);
            case 'tne': return handleTneSearch(message);

            // Comandos de Red y Banners
            case 'net': case 'whois': case 'scan': return handleNetworkQuery(message);
            case 'banner': return handleBanner(message);

            // Comandos de Diversión
            case 's': return handleSticker(client, message);
            case 'toimg': case 'imagen': return handleStickerToMedia(client, message); // <-- CAMBIO 6: Se pasa 'client'
            
            
            // Comandos de Búsqueda General
            case 'wiki': return message.reply(await handleWikiSearch(message));
            case 'noticias': return message.reply(await handleNews());
            case 'g': return message.reply(await handleGoogleSearch(message));
            
            // Comandos de Utilidad y Sistema
            case 'menu':
            case 'help':
                return message.reply(handleMenu());
            case 'ping':
                replyMessage = await callHandler(handlePing, client, message);
                break;
            case 'feriados':
                // intenta handler local si existe, sino el servicio
                if (typeof handleFeriados === 'function') {
                    replyMessage = await callHandler(handleFeriados, client, message);
                } else if (utilityService && typeof utilityService.getFeriados === 'function') {
                    replyMessage = await utilityService.getFeriados();
                } else {
                    console.warn('[command.handler] handleFeriados no encontrada; revisa exports');
                    replyMessage = 'Función feriados no disponible. Avísale al administrador.';
                }
                break;
            case 'far':
                replyMessage = await callHandler(handleFarmacias, client, message);
                break;
            case 'clima':
                replyMessage = await callHandler(handleClima, client, message);
                break;
            case 'sismos':
                replyMessage = await callHandler(handleSismos, client, message);
                break;
            case 'bus':
                // handleBus puede tener firma (client, message) o (message, client) - llamarlo directamente si implementado
                // intentamos callHandler y, si devuelve undefined, llamar legacy
                try {
                    const res = await callHandler(handleBus, client, message, client);
                    if (res !== undefined) return res;
                } catch (e) {
                    // si falla, intentar la firma legacy
                    try { return await handleBus(message, client); } catch (err) { throw err; }
                }
                break;
            case 'sec': case 'secrm':
                replyMessage = await callHandler(handleSec, client, message);
                break;
            
            case 'xv':
                return message.reply(await handleXvideosSearch(message));
            
            case 'fap': // New case for !fap command
                return handleFapSearch(client, message);
            
            case 'ayuda': return message.reply(await handleAiHelp(message));
            
            case 'id': return message.reply(`ℹ️ El ID de este chat es:
${message.chatId}`);

            default:
                break;
        }

        // Si se llegó aquí, significa que se encontró un handler y se ejecutó
        if (replyMessage) {
            return message.reply(replyMessage);
        }
    } catch (err) {
        console.error("[command.handler] Error inesperado:", err);
        message.reply("Ocurrió un error inesperado al procesar tu comando.");
    }
}

module.exports = commandHandler;