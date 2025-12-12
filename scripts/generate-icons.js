const fs = require('fs');
const path = require('path');

// Simple script to create placeholder icons
// For production, replace with proper designed icons

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const createSvgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <circle cx="256" cy="180" r="100" fill="#10b981"/>
  <rect x="156" y="300" width="200" height="30" rx="15" fill="#10b981"/>
  <rect x="180" y="350" width="152" height="20" rx="10" fill="#10b981" opacity="0.7"/>
  <rect x="200" y="390" width="112" height="16" rx="8" fill="#10b981" opacity="0.5"/>
  <text x="256" y="480" text-anchor="middle" fill="#10b981" font-family="Arial, sans-serif" font-size="60" font-weight="bold">WT</text>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (browsers can use these)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Create main icon
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), createSvgIcon(512));
console.log('Created icon.svg');

console.log('\nIcons generated! For production, convert SVGs to PNGs using:');
console.log('- https://svgtopng.com/');
console.log('- Or use: npx sharp-cli ...');
