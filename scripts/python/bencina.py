# bencina.py
import requests
import sys
import json

def obtener_datos_bencina(comuna):
    """
    Obtiene los datos de bencina para una comuna específica desde la API.
    """
    try:
        url = "https://api.bencinaenlinea.cl/api/busqueda_estacion_filtro"
        response = requests.get(url, timeout=10) # Se añade un timeout
        response.raise_for_status()
        datos = response.json()
        
        # Filtra las estaciones que coinciden con la comuna
        estaciones_encontradas = [
            estacion for estacion in datos["data"] 
            if comuna.lower() in estacion["comuna"].lower()
        ]
        
        return estaciones_encontradas
    except requests.exceptions.RequestException as e:
        # En caso de error, se devuelve un mensaje claro para el bot
        print(json.dumps({"error": f"Error al conectar con la API de bencinas: {e}"}))
        return None
    except Exception as e:
        print(json.dumps({"error": f"Error inesperado en el script de Python: {e}"}))
        return None

def formatear_respuesta(estaciones, comuna):
    """
    Formatea la lista de estaciones en un string legible para WhatsApp.
    """
    if not estaciones:
        return f"😕 No se encontraron estaciones de servicio para la comuna de *{comuna.title()}*."

    respuesta = [f"⛽ Bencineras en *{comuna.title()}*:\n"]
    
    for estacion in estaciones[:5]: # Limita la respuesta a las primeras 5 para no saturar el chat
        nombre = estacion['direccion'].strip()
        lat, lon = estacion['latitud'], estacion['longitud']
        mapa_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
        
        respuesta.append(f"📍 *{nombre}*")
        respuesta.append(f"🗺️ Ver en mapa: {mapa_url}")
        
        precios = []
        for comb in estacion['combustibles']:
            try:
                # Formatea el precio como moneda chilena (sin decimales)
                precio_formateado = f"${float(comb['precio']):,.0f}".replace(",", ".")
                precios.append(f"› _{comb['nombre_largo']}:_ {precio_formateado}")
            except (ValueError, TypeError):
                continue # Ignora si el precio no es un número válido
        
        if precios:
            respuesta.append("\n".join(precios))
        
        respuesta.append("--------------------")

    return "\n".join(respuesta)

def main(comuna):
    """
    Función principal del script.
    """
    datos_bencina = obtener_datos_bencina(comuna)
    if datos_bencina is not None:
        # Imprime el resultado formateado directamente a la salida estándar
        print(formatear_respuesta(datos_bencina, comuna))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Uso incorrecto. Se requiere el nombre de una comuna."}))
        sys.exit(1)
    
    comuna_argumento = sys.argv[1]
    main(comuna_argumento)