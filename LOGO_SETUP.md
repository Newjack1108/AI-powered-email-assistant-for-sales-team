# Logo and Favicon Setup Instructions

## Where to Place Your Logo

Place your logo image file in the **`public`** folder at the root of your project.

### File Location:
```
sales-email-assistant/
  └── public/
      ├── logo.png  (or logo.jpg, logo.svg, etc.)
      └── favicon.ico  (or other favicon files)
```

## Favicon Setup

### Default Favicon

A default SVG favicon (`favicon.svg`) has been created for you. It shows a purple "E" icon. You can replace it with your own favicon files.

### Where to Place Your Favicon

Place your favicon files in the **`public`** folder:

```
public/
  ├── favicon.svg          (default SVG favicon - already created)
  ├── favicon.ico          (16x16 or 32x32, optional - replace default)
  ├── favicon-16x16.png    (optional, for better quality)
  ├── favicon-32x32.png    (optional, for better quality)
  ├── apple-touch-icon.png (180x180, for iOS devices)
  └── site.webmanifest     (already created - no need to change)
```

**Note:** The app will use `favicon.svg` by default. If you add other favicon files, they will be used as fallbacks for browsers that don't support SVG favicons.

### Favicon File Specifications

**Required:**
- `favicon.ico` - 16x16 or 32x32 pixels, ICO format

**Optional (but recommended):**
- `favicon-16x16.png` - 16x16 pixels, PNG format
- `favicon-32x32.png` - 32x32 pixels, PNG format
- `apple-touch-icon.png` - 180x180 pixels, PNG format (for iOS home screen)
- `site.webmanifest` - JSON file for PWA support

### Quick Setup

**Minimum setup (just favicon.ico):**
1. Create or export a 32x32 pixel icon
2. Save it as `favicon.ico` in the `public` folder
3. Done! It will appear in browser tabs

**Recommended setup (all sizes):**
1. Create icons in these sizes:
   - 16x16 pixels → `favicon-16x16.png`
   - 32x32 pixels → `favicon-32x32.png` and `favicon.ico`
   - 180x180 pixels → `apple-touch-icon.png`
2. Place all files in the `public` folder
3. The app will automatically use them

### Online Favicon Generators

You can use these tools to generate all favicon sizes from a single image:
- https://realfavicongenerator.net/
- https://favicon.io/
- https://www.favicon-generator.org/

Just upload your logo/image and download the generated files, then place them in the `public` folder.

## Supported File Formats

- **PNG** (recommended) - `/public/logo.png`
- **JPG/JPEG** - `/public/logo.jpg`
- **SVG** (best for scaling) - `/public/logo.svg`
- **WebP** - `/public/logo.webp`

## Recommended Logo Specifications

- **Size**: 200px width maximum (height will scale proportionally)
- **Format**: PNG with transparent background (recommended)
- **Aspect Ratio**: Any, but horizontal logos work best
- **File Size**: Keep under 100KB for fast loading

## How to Add Your Logo

### Option 1: Local Development

1. Place your logo file in the `public` folder:
   ```
   public/logo.png
   ```

2. The logo will automatically appear in the header

### Option 2: Railway Deployment

1. Place your logo file in the `public` folder locally
2. Commit and push to GitHub:
   ```bash
   git add public/logo.png
   git commit -m "Add company logo"
   git push origin master
   ```
3. Railway will automatically deploy it

## Customizing Logo Appearance

### If Your Logo is Already White/Light Colored

If your logo is already white or light colored and you want it to show as-is, edit `styles/globals.css` and remove or comment out this line:

```css
.header-logo {
  /* Remove this line if your logo is already white: */
  filter: brightness(0) invert(1);
}
```

### If Your Logo is Colored

If your logo has colors and you want to keep them, remove the filter:

```css
.header-logo {
  height: 50px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
  /* Remove the filter line below to show logo in original colors */
  /* filter: brightness(0) invert(1); */
}
```

### Adjusting Logo Size

To change the logo size, edit `styles/globals.css`:

```css
.header-logo {
  height: 60px; /* Increase or decrease this value */
  max-width: 250px; /* Adjust maximum width */
}
```

## Testing

1. After adding your logo, refresh the page
2. The logo should appear in the header next to "Sales Email Assistant"
3. If the logo doesn't appear, check:
   - File is in the `public` folder
   - File name matches exactly: `logo.png` (case-sensitive)
   - File format is supported
   - Browser console for any errors

## Notes

- The logo will automatically hide if the file doesn't exist (no errors shown)
- The logo is responsive and will scale on mobile devices
- For best results, use a PNG with transparent background

