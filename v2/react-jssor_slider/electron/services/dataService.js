const fs = require('fs');
const path = require('path');

/**
 * Data Service
 * Menguruskan file operations (read, write) untuk data files
 */

class DataService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.allowedFiles = ['slides', 'kuliah', 'images', 'announcements', 'takwim', 'config'];
  }

  /**
   * Validate filename
   */
  isValidFilename(filename) {
    return this.allowedFiles.includes(filename);
  }

  /**
   * Get file path
   */
  getFilePath(filename) {
    return path.join(this.dataPath, `${filename}.txt`);
  }

  /**
   * Read file content
   */
  readFile(filename) {
    return new Promise((resolve, reject) => {
      if (!this.isValidFilename(filename)) {
        return reject(new Error('Invalid filename'));
      }

      const filePath = this.getFilePath(filename);
      
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return reject(new Error('Failed to read file'));
        }
        resolve(data);
      });
    });
  }

  /**
   * Write file content
   */
  writeFile(filename, content) {
    return new Promise((resolve, reject) => {
      if (!this.isValidFilename(filename)) {
        return reject(new Error('Invalid filename'));
      }

      if (content === undefined) {
        return reject(new Error('Content is required'));
      }

      const filePath = this.getFilePath(filename);
            
      // Write new content
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          console.error('Error writing file:', err);
          return reject(new Error('Failed to write file'));
        }
        resolve({
          success: true,
          filename: `${filename}.txt`
        });
      });
    });
  }

  /**
   * List all data files
   */
  listFiles() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.dataPath, (err, files) => {
        if (err) {
          return reject(new Error('Failed to list files'));
        }
        const txtFiles = files.filter(f => f.endsWith('.txt'));
        resolve(txtFiles);
      });
    });
  }

  /**
   * Parse file content to array based on file type
   */
  parseFileContent(filename, content) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const parsed = [];
    
    lines.forEach((line, index) => {
      const parts = line.split('|');
      
      if (filename === 'slides') {
        parsed.push({
          id: index + 1,
          type: parts[0] || '',
          image: parts[1] || '',
          duration: parts[2] || '',
          overlay: parts[3] || '',
          raw: line
        });
      } else if (filename === 'kuliah') {
        parsed.push({
          id: index + 1,
          week: parts[0] || '',
          day: parts[1] || '',
          type: parts[2] || '',
          speaker: parts[3] || '',
          speakerId: parts[4] || '',
          title: parts[5] || '',
          raw: line
        });
      } else if (filename === 'images') {
        parsed.push({
          id: index + 1,
          imageCode: parts[0] || '',
          imagePath: parts[1] || '',
          raw: line
        });
      } else if (filename === 'announcements') {
        parsed.push({
          id: index + 1,
          type: parts[0] || '',
          title: parts[1] || '',
          speaker: parts[2] || '',
          category: parts[3] || '',
          datetime: parts[4] || '',
          location: parts[5] || '',
          audience: parts[6] || '',
          raw: line
        });
      } else if (filename === 'takwim') {
        // Takwim format: Skip 2 baris pertama (header)
        // Format: DD-MM-YYYY DD-MM-HHHH\tImsak\tSubuh\tSyuruk\tZohor\tAsar\tMaghrib\tIsyak
        if (index < 2) {
          // Skip 2 baris pertama (header lines)
          return;
        }
        
        // Parse dengan tab separator
        const tabParts = line.split('\t');
        if (tabParts.length >= 8) {
          // Split date dan hijri (format: DD-MM-YYYY DD-MM-HHHH)
          const dateHijri = tabParts[0].trim();
          const dateHijriParts = dateHijri.split(/\s+/);
          const date = dateHijriParts[0] || ''; // DD-MM-YYYY
          const hijri = dateHijriParts[1] || ''; // DD-MM-HHHH
          
          parsed.push({
            id: parsed.length + 1, // Use parsed.length + 1 since we're skipping rows
            date: date,
            hijri: hijri,
            imsak: tabParts[1] || '',
            subuh: tabParts[2] || '',
            syuruk: tabParts[3] || '',
            zohor: tabParts[4] || '',
            asar: tabParts[5] || '',
            maghrib: tabParts[6] || '',
            isyak: tabParts[7] || '',
            raw: line
          });
        }
      } else if (filename === 'config') {
        // Config format: KEY|VALUE
        parsed.push({
          id: index + 1,
          key: parts[0] || '',
          value: parts[1] || '',
          raw: line
        });
      }
    });
    
    return parsed;
  }

  /**
   * Get column names for file type
   */
  getColumns(filename) {
    const columnMap = {
      'slides': ['type', 'image', 'duration', 'overlay'],
      'kuliah': ['week', 'day', 'type', 'speaker', 'speakerId', 'title'],
      'images': ['imageCode', 'imagePath'],
      'announcements': ['type', 'title', 'speaker', 'category', 'datetime', 'location', 'audience'],
      'takwim': ['date', 'hijri', 'imsak', 'subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'],
      'config': ['key', 'value']
    };
    return columnMap[filename] || [];
  }

  /**
   * Update single row
   * Find line index yang betul dengan cara yang sama seperti parseFileContent
   */
  updateRow(filename, id, rowData) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isValidFilename(filename)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(filename);
        const allLines = content.split('\n');
        
        // Find line index yang betul dengan cara yang sama seperti parseFileContent
        let lineIndex = null;
        let currentId = 0;
        
        if (filename === 'takwim') {
          // Takwim: Skip 2 baris pertama (header), kemudian filter kosong
          for (let i = 2; i < allLines.length; i++) {
            const line = allLines[i];
            const tabParts = line.split('\t');
            if (tabParts.length >= 8 && line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        } else {
          // Other files: Filter kosong dulu, kemudian cari ID
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        }
        
        if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
          return reject(new Error('Invalid row ID'));
        }
        
        // Update the line
        if (filename === 'takwim' && rowData.raw) {
          // Reconstruct raw line dari fields jika perlu
          const rawLine = rowData.raw || `${rowData.date || ''} ${rowData.hijri || ''}\t${rowData.imsak || ''}\t${rowData.subuh || ''}\t${rowData.syuruk || ''}\t${rowData.zohor || ''}\t${rowData.asar || ''}\t${rowData.maghrib || ''}\t${rowData.isyak || ''}`;
          allLines[lineIndex] = rawLine;
        } else {
          allLines[lineIndex] = rowData.raw || rowData;
        }
        
        // Write updated content
        const result = await this.writeFile(filename, allLines.join('\n'));
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Insert row baru
   */
  insertRow(filename, rowData, position = 'end') {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isValidFilename(filename)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(filename);
        const lines = content.split('\n');
        
        // Determine insert position
        let insertIndex;
        if (position === 'start') {
          // For takwim, insert after header (index 2)
          insertIndex = filename === 'takwim' ? 2 : 0;
        } else if (position === 'end') {
          insertIndex = lines.length;
        } else if (typeof position === 'number') {
          insertIndex = position;
        } else {
          return reject(new Error('Invalid position'));
        }
        
        // Insert new row
        const newRow = rowData.raw || rowData;
        lines.splice(insertIndex, 0, newRow);
        
        // Write updated content
        const result = await this.writeFile(filename, lines.join('\n'));
        resolve({
          ...result,
          insertedAt: insertIndex
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete row
   * Find line index yang betul dengan cara yang sama seperti parseFileContent
   */
  deleteRow(filename, id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isValidFilename(filename)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(filename);
        const allLines = content.split('\n');
        
        // Find line index yang betul dengan cara yang sama seperti parseFileContent
        let lineIndex = null;
        let currentId = 0;
        
        if (filename === 'takwim') {
          // Takwim: Skip 2 baris pertama (header), kemudian filter kosong
          for (let i = 2; i < allLines.length; i++) {
            const line = allLines[i];
            const tabParts = line.split('\t');
            if (tabParts.length >= 8 && line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        } else {
          // Other files: Filter kosong dulu, kemudian cari ID
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        }
        
        if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
          return reject(new Error('Invalid row ID'));
        }
        
        // Remove the line
        allLines.splice(lineIndex, 1);
        
        // Write updated content
        const result = await this.writeFile(filename, allLines.join('\n'));
        resolve({
          ...result,
          deletedId: id
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = DataService;
