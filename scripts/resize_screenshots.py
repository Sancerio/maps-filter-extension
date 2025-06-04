#!/usr/bin/env python3
"""
Script to resize screenshots to 1280x800 for Chrome Web Store submissions.
This script will resize all PNG files in the images directory while maintaining aspect ratio.
"""

import os
import sys
from PIL import Image
import argparse
from pathlib import Path

def resize_image(input_path, output_path, target_size=(1280, 800), method='fit', bg_color=(45, 45, 45)):
    """
    Resize an image to target size.
    
    Args:
        input_path: Path to input image
        output_path: Path to save resized image
        target_size: Target dimensions (width, height)
        method: 'fit' to maintain aspect ratio with padding, 'stretch' to stretch, 'crop' to crop
        bg_color: Background color for padding (RGB tuple)
    """
    try:
        with Image.open(input_path) as img:
            if method == 'fit':
                # Maintain aspect ratio and add padding if needed
                img.thumbnail(target_size, Image.Resampling.LANCZOS)
                
                # Create a new image with target size and dark background
                new_img = Image.new('RGB', target_size, bg_color)
                
                # Center the resized image
                x = (target_size[0] - img.size[0]) // 2
                y = (target_size[1] - img.size[1]) // 2
                
                # If the original image has transparency, handle it properly
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    # Convert to RGBA for proper transparency handling
                    img = img.convert('RGBA')
                    # Create a composite with the background color
                    composite = Image.new('RGBA', img.size, bg_color + (255,))
                    composite = Image.alpha_composite(composite, img)
                    img = composite.convert('RGB')
                
                new_img.paste(img, (x, y))
                new_img.save(output_path, 'PNG', optimize=True)
                
            elif method == 'stretch':
                # Stretch to exact dimensions
                resized_img = img.resize(target_size, Image.Resampling.LANCZOS)
                # Convert to RGB if needed
                if resized_img.mode != 'RGB':
                    resized_img = resized_img.convert('RGB')
                resized_img.save(output_path, 'PNG', optimize=True)
                
            elif method == 'crop':
                # Crop to maintain aspect ratio and fill target size
                img_ratio = img.size[0] / img.size[1]
                target_ratio = target_size[0] / target_size[1]
                
                if img_ratio > target_ratio:
                    # Image is wider than target
                    new_height = img.size[1]
                    new_width = int(new_height * target_ratio)
                    left = (img.size[0] - new_width) // 2
                    img_cropped = img.crop((left, 0, left + new_width, new_height))
                else:
                    # Image is taller than target
                    new_width = img.size[0]
                    new_height = int(new_width / target_ratio)
                    top = (img.size[1] - new_height) // 2
                    img_cropped = img.crop((0, top, new_width, top + new_height))
                
                resized_img = img_cropped.resize(target_size, Image.Resampling.LANCZOS)
                # Convert to RGB if needed
                if resized_img.mode != 'RGB':
                    resized_img = resized_img.convert('RGB')
                resized_img.save(output_path, 'PNG', optimize=True)
                
        return True
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Resize screenshots for Chrome Web Store')
    parser.add_argument('--method', choices=['fit', 'stretch', 'crop'], default='fit',
                        help='Resize method: fit (maintain ratio + padding), stretch (exact size), crop (maintain ratio + crop)')
    parser.add_argument('--width', type=int, default=1280, help='Target width')
    parser.add_argument('--height', type=int, default=800, help='Target height')
    parser.add_argument('--images-dir', default='images', help='Directory containing images')
    parser.add_argument('--output-dir', default='dist/images', help='Directory to save resized images')
    parser.add_argument('--bg-color', default='45,45,45', help='Background color for padding (R,G,B format, e.g., "45,45,45")')
    
    args = parser.parse_args()
    
    target_size = (args.width, args.height)
    images_dir = Path(args.images_dir)
    output_dir = Path(args.output_dir)
    
    # Parse background color
    try:
        bg_color = tuple(map(int, args.bg_color.split(',')))
        if len(bg_color) != 3 or any(c < 0 or c > 255 for c in bg_color):
            raise ValueError("Invalid color format")
    except ValueError:
        print(f"Error: Invalid background color '{args.bg_color}'. Use R,G,B format (e.g., '45,45,45')")
        sys.exit(1)
    
    if not images_dir.exists():
        print(f"Error: Images directory '{images_dir}' not found")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all PNG files
    png_files = list(images_dir.glob('screenshot-*.png'))
    
    if not png_files:
        print(f"No screenshot PNG files found in {images_dir}")
        sys.exit(1)
    
    print(f"Found {len(png_files)} screenshot files to resize")
    print(f"Target size: {target_size[0]}x{target_size[1]}")
    print(f"Method: {args.method}")
    print(f"Background color: RGB{bg_color}")
    print(f"Output directory: {output_dir}")
    print()
    
    successful = 0
    failed = 0
    
    for png_file in sorted(png_files):
        print(f"Processing: {png_file.name}")
        
        # Get original dimensions
        try:
            with Image.open(png_file) as img:
                original_size = img.size
                print(f"  Original size: {original_size[0]}x{original_size[1]}")
        except Exception as e:
            print(f"  Error reading image: {e}")
            failed += 1
            continue
        
        # Set output path
        output_path = output_dir / png_file.name
        
        if resize_image(png_file, output_path, target_size, args.method, bg_color):
            print(f"  ✓ Resized to: {target_size[0]}x{target_size[1]}")
            print(f"  ✓ Saved to: {output_path}")
            successful += 1
        else:
            print(f"  ✗ Failed to resize")
            failed += 1
        
        print()
    
    print(f"Completed: {successful} successful, {failed} failed")
    
    if successful > 0:
        print(f"\nResized images are ready for Chrome Web Store submission!")
        print(f"Check the '{output_dir}' directory for your resized screenshots.")
        print("Original files remain unchanged in the 'images' directory.")

if __name__ == '__main__':
    main() 