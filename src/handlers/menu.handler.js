// src/handlers/menu.handler.js (VERSIÓN XIAOMI — sin audios, chiste, horóscopo, ticket)
"use strict";

/**
 * Handler de menú para WhatsApp — Botillero Xiaomi
 * Excluye: audios/sonidos, chiste, horóscopo, ticket
 */

function getMainMenu() {
    return `
╔════════════════════════════╗
   🤖 *BOTILLERO - MENÚ* 🤖
╚════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *SERVICIOS Y CONSULTAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☀️ \`!clima [ciudad]\` → Pronóstico del tiempo
💵 \`!valores\` → Indicadores económicos (UF, dólar, etc.)
🎉 \`!feriados\` → Próximos feriados en Chile
💊 \`!far [comuna]\` → Farmacias de turno
🚇 \`!metro\` → Estado del Metro de Santiago
🌋 \`!sismos\` → Últimos sismos reportados
🚌 \`!bus [paradero]\` → Llegada de micros RED
⚡ \`!sec\` / \`!secrm\` → Cortes de luz (nacional/RM)
💳 \`!transbank\` → Estado servicios Transbank
🏦 \`!bancos\` → Estado sitios web bancarios
🔧 \`!ping\` → Estado del sistema/bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 *BÚSQUEDAS E INFORMACIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 \`!wiki [texto]\` → Buscar en Wikipedia
🔎 \`!g [texto]\` → Buscar en Google
📰 \`!noticias\` → Titulares de última hora
🚗 \`!pat [patente]\` → Info de vehículo
📱 \`!num [teléfono]\` → Info de número
📝 \`!resumen [url]\` → Resumir web con IA
🎲 \`!random\` → Dato curioso aleatorio
🍿 \`!streaming\` → Trending en Netflix, Disney+, HBO
🤝 \`!ayuda [duda]\` → Asistente IA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚽ *FÚTBOL Y DEPORTES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 \`!tabla\` → Tabla liga chilena
📅 \`!partidos\` → Resumen de la fecha
📆 \`!prox\` → Próximos partidos liga
🇨🇱 \`!clasi\` → Partidos clasificatorias
🏅 \`!tclasi\` → Tabla clasificatorias
🏆 \`!cliga\` → Grupos Copa de la Liga
📅 \`!liga\` → Partidos Copa de la Liga

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 *REDES Y DOMINIOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 \`!whois [dominio/ip]\` → Consulta WHOIS
🇨🇱 \`!nic [dominio.cl]\` → Info dominio chileno

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 *ENTRETENIMIENTO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 \`!s\` → Crear sticker (responde img/video)
🖼️ \`!toimg\` → Sticker a imagen
⏳ \`!18\` / \`!navidad\` / \`!añonuevo\` → Countdowns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *GRUPO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 \`!todos\` → Mencionar a todos (solo admins)
🆔 \`!id\` → ID del chat actual

`.trim();
}

module.exports = {
    getMainMenu
};
