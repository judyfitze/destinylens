"""
VSL Video Builder - DestinyLens
Generates slides from script (audio to be added later)
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Config
WIDTH = 1920
HEIGHT = 1080
BG_COLOR = (255, 255, 255)  # White
TEXT_COLOR = (0, 0, 0)  # Black
OUTPUT_DIR = "slide_images"
SCRIPT_PATH = "vsl-script.txt"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load script and break into slides
with open(SCRIPT_PATH, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f.readlines() if line.strip()]

print(f"Loaded {len(lines)} slide phrases")

# Font setup
def get_font(size):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# Calculate font size based on word count
def get_font_size(word_count):
    if word_count <= 4:
        return 140
    elif word_count <= 8:
        return 100
    elif word_count <= 14:
        return 72
    else:
        return 55

# Generate slide image
def create_slide(text, slide_num):
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # ALWAYS USE UPPERCASE
    text = text.upper()
    
    word_count = len(text.split())
    font_size = get_font_size(word_count)
    font = get_font(font_size)
    
    # Word wrap
    max_width = WIDTH - 300
    lines = []
    words_list = text.split()
    current_line = ""
    
    for word in words_list:
        test_line = current_line + " " + word if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        line_width = bbox[2] - bbox[0]
        
        if line_width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    # Center vertically
    line_height = font_size + 20
    total_height = len(lines) * line_height
    start_y = (HEIGHT - total_height) // 2
    
    # Draw centered text
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        x = (WIDTH - line_width) // 2
        y = start_y + (i * line_height)
        draw.text((x, y), line, font=font, fill=TEXT_COLOR)
    
    output_path = f"{OUTPUT_DIR}/slide_{slide_num:03d}.png"
    img.save(output_path)
    
    if slide_num % 20 == 0:
        print(f"Created {slide_num} slides...")
    
    return output_path

# Create all slides
print("Generating slides...")
slide_files = []

for i, line in enumerate(lines, start=1):
    slide_path = create_slide(line, i)
    slide_files.append(slide_path)

print(f"Generated {len(slide_files)} slides")
print(f"Slides saved to {OUTPUT_DIR}/")
print("\nTo create video with audio (when available):")
print("ffmpeg -f concat -i slides_duration.txt -i vsl-audio.mp3 -c:v libx264 -c:a aac -pix_fmt yuv420p vsl-video.mp4")
