import sys
from PIL import Image, ImageDraw, ImageFont
import os

def create_banner(style, text):
    # --- ¡MEJORADO! ---
    # Ahora cada estilo incluye colores para el relleno, contorno y sombra.
    font_map = {
        'vengadores': {
            'file': 'Vengadores.ttf', 'size': 50, 'color': (237, 28, 36), # Rojo Vengadores
            'stroke_width': 2, 'stroke_color': (30, 30, 30),
            'shadow_offset': (3, 3), 'shadow_color': (0, 0, 0, 128)
        },
        'shrek': {
            'file': 'Sherk.ttf', 'size': 60, 'color': (124, 161, 39), # Verde Shrek
            'stroke_width': 2, 'stroke_color': (40, 25, 10),
            'shadow_offset': (2, 2), 'shadow_color': (0, 0, 0, 100)
        },
        'mario': {
            'file': 'Mario.ttf', 'size': 50, 'color': (255, 0, 0), # Rojo Mario
            'stroke_width': 3, 'stroke_color': (0, 0, 150),
            'shadow_offset': (4, 4), 'shadow_color': (0, 0, 0, 150)
        },
        'nintendo': {
            'file': 'Nintendo.ttf', 'size': 40, 'color': (230, 0, 18), # Rojo Nintendo
            'stroke_width': 2, 'stroke_color': (100, 100, 100)
        },
        'sega': {
            'file': 'Sega.TTF', 'size': 50, 'color': (0, 133, 202), # Azul Sega
            'stroke_width': 2, 'stroke_color': (255, 255, 255)
        },
        'potter': {
            'file': 'HarryP.TTF', 'size': 70, 'color': (221, 184, 91), # Dorado
            'stroke_width': 1, 'stroke_color': (50, 50, 50),
            'shadow_offset': (2, 2), 'shadow_color': (0, 0, 0, 200)
        },
        'starwars': {
            'file': 'Star.ttf', 'size': 60, 'color': (255, 232, 31), # Amarillo Star Wars
            'stroke_width': 2, 'stroke_color': (0, 0, 0)
        },
        'disney': {
            'file': 'Disney.ttf', 'size': 60, 'color': (64, 134, 239), # Azul Disney
            'shadow_offset': (2, 2), 'shadow_color': (0, 0, 0, 100)
        },
        'coca': {
            'file': 'cocacola.ttf', 'size': 60, 'color': (255, 255, 255), # Blanco Coca-Cola
            'background_color': (220, 10, 15) # Fondo rojo
        },
        'stranger': {
            'file': 'pixel.ttf', 'size': 60, 'color': (255, 0, 0), # Rojo Neón
            'shadow_offset': (0, 0), 'shadow_color': (255, 0, 0, 100) # Simula un brillo
        },
        'pixel': {
            'file': 'pixel.ttf', 'size': 40, 'color': (0, 0, 0)
        }
    }


    if style not in font_map:
        raise ValueError(f"Estilo '{style}' no es válido.")

    style_info = font_map[style]

    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        font_path = os.path.join(base_dir, '..', '..', 'assets', 'fonts', style_info['file'])
        font = ImageFont.truetype(font_path, style_info['size'])
    except IOError:
        raise FileNotFoundError(f"La fuente '{style_info['file']}' no se encontró en la ruta esperada: {font_path}")

    dummy_img = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    img_width = text_width + 40
    img_height = text_height + 40
    
    # --- ¡MEJORADO! ---
    # Usamos el color de fondo definido o transparente por defecto
    background = style_info.get('background_color', (255, 255, 255, 0))
    img = Image.new('RGBA', (img_width, img_height), background)
    draw = ImageDraw.Draw(img)

    pos = (20, 20)

    # --- ¡NUEVO! Lógica para dibujar con efectos ---
    # 1. Dibuja la sombra (si está definida)
    if 'shadow_offset' in style_info and 'shadow_color' in style_info:
        shadow_pos = (pos[0] + style_info['shadow_offset'][0], pos[1] + style_info['shadow_offset'][1])
        draw.text(shadow_pos, text, font=font, fill=style_info['shadow_color'])

    # 2. Dibuja el contorno (si está definido)
    if 'stroke_width' in style_info and 'stroke_color' in style_info:
        w = style_info['stroke_width']
        # Dibuja el texto en 8 direcciones alrededor del centro para crear el contorno
        for x_offset in [-w, 0, w]:
            for y_offset in [-w, 0, w]:
                if x_offset != 0 or y_offset != 0:
                    draw.text((pos[0] + x_offset, pos[1] + y_offset), text, font=font, fill=style_info['stroke_color'])
    
    # 3. Dibuja el texto principal encima de todo
    draw.text(pos, text, font=font, fill=style_info['color'])

    temp_dir = os.path.join(base_dir, '..', '..', 'temp')
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    output_path = os.path.join(temp_dir, f"banner_temp.png")
    img.save(output_path, 'PNG')
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python banner.py <estilo> \"<texto>\"", file=sys.stderr)
        sys.exit(1)
    
    style_arg = sys.argv[1]
    text_arg = sys.argv[2]
    
    try:
        result_path = create_banner(style_arg, text_arg)
        print(result_path)
    except (ValueError, FileNotFoundError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
