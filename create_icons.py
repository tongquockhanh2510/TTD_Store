from PIL import Image, ImageDraw

# Open logo
logo = Image.open('public/logo.jpg')

# Hàm tạo icon với bo góc
def create_icon(source_img, size, output_path, radius=30):
    # Resize
    img = source_img.resize((size, size), Image.Resampling.LANCZOS)

    # Convert to RGBA nếu cần
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Tạo mask bo góc
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)

    # Apply mask
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)

    # Save as PNG
    output.save(output_path, 'PNG')
    print(f"✓ {output_path} ({size}x{size})")

# Create icons
create_icon(logo, 192, 'public/icon-192.png', radius=40)
create_icon(logo, 512, 'public/icon-512.png', radius=100)

print("\nDone!")
