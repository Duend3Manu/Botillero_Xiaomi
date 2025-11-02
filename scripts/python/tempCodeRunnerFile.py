import asyncio
import aiohttp
from bs4 import BeautifulSoup
import sys
from datetime import datetime
import re  # Para limpiar los strings
import json # Para leer el santoral
import os  # Para encontrar la ruta del santoral
import certifi # ¡Necesario para el SSL!
import ssl     # ¡Necesario para el SSL!

# Establecer la codificación de la salida estándar a UTF-8
sys.stdout.reconfigure(encoding='utf-8')

MAX_CONCURRENT_REQUESTS = 5

# --- 1. Lector de Santoral Local (Funciona OK) ---

def obtener_santoral_local():
    """Lee el santoral desde un archivo JSON local (santoral.json)."""
    meses_es = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
    try:
        ahora = datetime.now()
        nombre_mes = meses_es[ahora.month - 1]
        dia_indice = ahora.day - 1
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(script_dir, "santoral.json")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        santoral_hoy = data[nombre_mes][dia_indice]
        return santoral_hoy
    except Exception as e:
        return f"Error al leer santoral.json: {e}"

# --- 2. Funciones de Formato (Funciona OK) ---

def formatear_con_separadores(valor):
    try:
        return "{:,}".format(int(float(valor))).replace(",", ".")
    except (ValueError, TypeError):
        return "N/A"

def formatear_con_decimales(valor):
    try:
        return "{:,.2f}".format(float(valor)).replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "N/A"

def formatear_ipc(valor):
    try:
        return "{:,.1f}".format(float(valor)).replace(".", ",")
    except (ValueError, TypeError):
        return "N/A"


# --- 3. Funciones de API (Findic.cl - ¡NUEVO!) ---

async def obtener_valor_findic(session, indicador):
    """Obtiene el último valor de un indicador desde la API findic.cl."""
    url = f"https://findic.cl/api/{indicador}"
    try:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                # Devuelve el valor más reciente de la serie
                return (indicador, data['serie'][0]['valor'])
            else:
                print(f"Error en API findic.cl ({indicador}): Status {response.status}", file=sys.stderr)
                return (indicador, None)
    except Exception as e:
        print(f"Excepción en API findic.cl ({indicador}): {e}", file=sys.stderr)
        return (indicador, None)

# --- 4. Funciones de Scraping (Google - Funciona OK) ---

async def obtener_html(session, url):
    """Obtiene el HTML de una URL de forma asíncrona."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                return await response.text()
            else:
                print(f"No se pudo acceder a la página {url} (Status: {response.status})", file=sys.stderr)
                return None
    except aiohttp.ClientError as e:
        print(f"Error al obtener HTML desde {url}: {e}", file=sys.stderr)
        return None

async def obtener_valor_google(session, url, semaphore):
    """Scrapea Google Finance para un valor específico."""
    async with semaphore:
        html = await obtener_html(session, url)
        if html:
            try:
                soup = BeautifulSoup(html, 'html.parser')
                div_valor = soup.find('div', class_='YMlKec fxKbKc')
                if div_valor:
                    return div_valor.text.strip().replace(",", "")
            except Exception as e:
                print(f"Error al parsear HTML de {url}: {e}", file=sys.stderr)
        return None

async def scrapear_valores_google(session, semaphore):
    """Scrapea Google Finance para monedas extranjeras."""
    urls = {
        '🇦🇷💰': 'https://www.google.com/finance/quote/ARS-CLP',
        '🇵🇪💰': 'https://www.google.com/finance/quote/PEN-CLP',
        '🇧🇴💰': 'https://www.google.com/finance/quote/BOB-CLP',
        '🇨🇴💰': 'https://www.google.com/finance/quote/COP-CLP',
        '🇯🇵💰': 'https://www.google.com/finance/quote/JPY-CLP',
    }
    tareas = [obtener_valor_google(session, url, semaphore) for url in urls.values()]
    resultados = await asyncio.gather(*tareas)
    return dict(zip(urls.keys(), resultados))

# --- Función Principal ---

async def main():
    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m-%Y")
    hora = ahora.strftime("%H:%M")
    
    santoral = obtener_santoral_local()

    print(f"Fecha: {fecha}")
    print(f"Hora: {hora}")
    print(f"Santoral: {santoral}\n")

    # --- ¡SOLUCIÓN SSL (NECESARIA)! ---
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    # --- FIN SOLUCIÓN SSL ---

    async with aiohttp.ClientSession(connector=connector) as session:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

        # Tareas para la nueva API findic.cl
        indicadores_findic = ['uf', 'utm', 'dolar', 'euro', 'ipc']
        tareas_findic = [
            obtener_valor_findic(session, ind)
            for ind in indicadores_findic
        ]
        
        # Tarea para el scraping de Google
        tarea_google = scrapear_valores_google(session, semaphore)
        
        # Ejecutamos todo en paralelo
        resultados_findic_lista, valores_google = await asyncio.gather(
            asyncio.gather(*tareas_findic),
            tarea_google
        )
        
        # Convertimos la lista de findic a un diccionario
        indicadores = dict(resultados_findic_lista)

        print("---- Indicadores ----")
        print(f"🇨🇱 UF: ${formatear_con_separadores(indicadores.get('uf'))}")
        print(f"🇨🇱 UTM: ${formatear_con_separadores(indicadores.get('utm'))}")
        print(f"💵 USD (Findic): ${formatear_con_separadores(indicadores.get('dolar'))}")
        print(f"🇪🇺 Euro (Findic): €{formatear_con_separadores(indicadores.get('euro'))}")
        print(f"🇨🇱 IPC (Mensual): {formatear_ipc(indicadores.get('ipc'))}%")


        print("\n---- Otras monedas ----")
        
        if valores_google:
            for divisa, valor in valores_google.items():
                if valor:
                    print(f"{divisa} : ${formatear_con_decimales(valor)}")
                else:
                    print(f"{divisa} : No disponible (falló scraping)")
        else:
            print("No se pudieron obtener las otras divisas.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error en el script principal: {e}", file=sys.stderr)