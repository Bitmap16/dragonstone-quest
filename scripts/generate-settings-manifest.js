const fs = require('fs');
const path = require('path');

// Path to the settings directory
const settingsDir = path.join(__dirname, '../assets/settings');

// Function to get all image files in the settings directory
function getImageFiles(dir) {
  const files = fs.readdirSync(dir);
  return files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    })
    .map(file => path.basename(file, path.extname(file))); // Return just the base filename without extension
}

// Function to generate settings manifest
function generateSettingsManifest() {
  const imageFiles = getImageFiles(settingsDir);
  
  // Create a manifest with the filenames (without extensions)
  const manifest = {
    settings: imageFiles
  };
  
  return manifest;
}

// Generate and save the manifest
const manifest = generateSettingsManifest();
const outputPath = path.join(__dirname, '../settings-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`Settings manifest generated at: ${outputPath}`);
console.log(`Found ${manifest.settings.length} settings.`);
