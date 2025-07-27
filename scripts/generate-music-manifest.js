const fs = require('fs');
const path = require('path');

// Path to the music directory
const musicDir = path.join(__dirname, '../music');

// Function to get all MP3 files in a directory recursively
function getMP3Files(dir, baseDir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getMP3Files(file, baseDir));
    } else if (path.extname(file) === '.mp3') {
      // Get relative path from music directory
      const relativePath = path.relative(baseDir, file).replace(/\\/g, '/');
      results.push(relativePath);
    }
  });
  
  return results;
}

// Function to generate mood-based manifest
function generateMoodManifest() {
  const manifest = {};
  
  // Define mood mappings to folder paths
  const moodFolders = {
    'narrative/bittersweet': 'narrative/bittersweet',
    'narrative/foreboding': 'narrative/foreboding',
    'narrative/moral': 'narrative/moral',
    'narrative/mystical': 'narrative/mystical',
    'narrative/tension': 'narrative/tension',
    'actionable/cunning': 'actionable/cunning',
    'actionable/dangerous': 'actionable/dangerous',
    'actionable/heroic': 'actionable/heroic',
    'actionable/persuasive': 'actionable/persuasive',
    'actionable/playful': 'actionable/playful',
    'dramatic/angry': 'dramatic/angry',
    'dramatic/conflicted': 'dramatic/conflicted',
    'dramatic/intimate': 'dramatic/intimate',
    'dramatic/unstable': 'dramatic/unstable',
    'dramatic/wounded': 'dramatic/wounded'
  };
  
  // Get all MP3 files
  const allFiles = getMP3Files(musicDir, musicDir);
  
  // Group files by mood
  Object.keys(moodFolders).forEach(mood => {
    const folderPath = moodFolders[mood];
    manifest[mood] = allFiles.filter(file => file.startsWith(folderPath));
  });
  
  return manifest;
}

// Generate and save the manifest
const manifest = generateMoodManifest();
const outputPath = path.join(__dirname, '../music-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('Music manifest generated successfully at:', outputPath);
console.log('Moods found:', Object.keys(manifest).length);
