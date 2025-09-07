import sys
from PIL import Image, ImageDraw, ImageFont
import os

def create_banner(style, text):
    # Mapeo de estilos a archivos de fuentes y configuraciones.
    # Asegúrate de que los nombres de archivo coincidan con los que tienes en assets/fonts/
    font_map = {
        'vengadores': {'file': 'Vengadores.ttf', 'size': 50, 'color': (255, 255, 0)},
        'shrek': {'file': 'Sherk.ttf', 'size': 60, 'color': (124, 161, 39)},
        'mario': {'file': 'Mario.ttf', 'size': 50, 'color': (255, 0, 0)},
        'nintendo': {'file': 'Nintendo.ttf', 'size': 40, 'color': (255, 0, 0)},
        'sega': {'file': 'Sega.TTF', 'size': 50, 'color': (0, 0, 255)},
        'potter': {'file': 'HarryP.TTF', 'size': 70, 'color': (255, 215, 0)},
        'starwars': {'file': 'Star.ttf', 'size': 60, 'color': (255, 232, 31)},
        'disney': {'file': 'Disney.ttf', 'size': 60, 'color': (64, 134, 239)},
        'coca': {'file': 'cocacola.ttf', 'size': 60, 'color': (255, 0, 0)},
        # 'stranger' y 'pixel' pueden usar la misma fuente si lo deseas
        'stranger': {'file': 'pixel.ttf', 'size': 60, 'color': (255, 0, 0)},
        'pixel': {'file': 'pixel.ttf', 'size': 40, 'color': (0, 0, 0)}
    }

    if style not in font_map:
        raise ValueError(f"Estilo '{style}' no es válido.")

    style_info = font_map[style]

    try:
        # --- ¡ESTA ES LA CORRECCIÓN CLAVE! ---
        # Construimos una ruta absoluta a la fuente, relativa a la ubicación de este script.
        # Esto funciona sin importar desde dónde se ejecute el script.
        base_dir = os.path.dirname(os.path.abspath(__file__))
        font_path = os.path.join(base_dir, '..', '..', 'assets', 'fonts', style_info['file'])
        
        font = ImageFont.truetype(font_path, style_info['size'])
    except IOError:
        # Si la fuente no se encuentra, ahora el error será mucho más claro.
        raise FileNotFoundError(f"La fuente '{style_info['file']}' no se encontró en la ruta esperada: {font_path}")

    # Creamos una imagen temporal para calcular el tamaño del texto
    dummy_img = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    
    # Usamos textbbox para un cálculo más preciso del tamaño
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Creamos la imagen final con un fondo transparente
    img_width = text_width + 40
    img_height = text_height + 40
    img = Image.new('RGBA', (img_width, img_height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Dibujamos el texto
    draw.text((20, 20), text, font=font, fill=style_info['color'])

    # Guardamos la imagen en una carpeta temporal en la raíz del proyecto
    temp_dir = os.path.join(base_dir, '..', '..', 'temp')
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    output_path = os.path.join(temp_dir, f"banner_temp.png")
    img.save(output_path, 'PNG')
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) != 3:
        # Salida de error para la consola
        print("Uso: python banner.py <estilo> \"<texto>\"", file=sys.stderr)
        sys.exit(1)
    
    style_arg = sys.argv[1]
    text_arg = sys.argv[2]
    
    try:
        result_path = create_banner(style_arg, text_arg)
        # Salida estándar con la ruta del archivo generado
        print(result_path)
    except (ValueError, FileNotFoundError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)