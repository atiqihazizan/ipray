/**
 * Date Utilities
 * Function untuk parse dan format tarikh dengan pelbagai format
 */

/**
 * Detect format tarikh dan parse kepada Date object
 * Support format:
 * - YYYY-MM-DD HH:MM
 * - DD-MM-YYYY HH:MM
 * - YYYY-MM-DD
 * - DD-MM-YYYY
 * 
 * Logik auto-detect:
 * 1. Jika bahagian pertama adalah 4 digit -> YYYY-MM-DD
 * 2. Jika bahagian pertama bukan 4 digit -> DD-MM-YYYY
 * 3. Jika bahagian tengah > 12 -> ia adalah DD bukan MM (format DD-MM-YYYY)
 * 
 * @param {string} datetimeStr - String tarikh untuk parse
 * @returns {Date|null} - Date object atau null jika gagal
 */
function parseDateTime(datetimeStr) {
    if (!datetimeStr) return null;
    
    try {
        // Split datetime dan time
        const parts = datetimeStr.trim().split(' ');
        const datePart = parts[0]; // YYYY-MM-DD atau DD-MM-YYYY
        const timePart = parts[1] || '23:59'; // HH:MM (default to end of day)
        
        // Split date components
        const dateComponents = datePart.split('-').map(Number);
        
        if (dateComponents.length !== 3) {
            console.warn('Invalid date format:', datetimeStr);
            return null;
        }
        
        let year, month, day;
        
        // Auto-detect format
        const firstPart = dateComponents[0];
        const middlePart = dateComponents[1];
        const lastPart = dateComponents[2];
        
        // Check 1: Jika first part adalah 4 digit (1000-9999) -> YYYY-MM-DD
        if (firstPart >= 1000 && firstPart <= 9999) {
            year = firstPart;
            month = middlePart;
            day = lastPart;
        }
        // Check 2: Jika middle part > 12 -> ia adalah DD (format DD-MM-YYYY)
        else if (middlePart > 12) {
            day = firstPart;
            month = lastPart;
            year = middlePart;
        }
        // Check 3: Default assume DD-MM-YYYY
        else {
            day = firstPart;
            month = middlePart;
            year = lastPart;
        }
        
        // Parse time
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Validate ranges
        if (month < 1 || month > 12) {
            console.warn('Invalid month:', month, 'from', datetimeStr);
            return null;
        }
        
        if (day < 1 || day > 31) {
            console.warn('Invalid day:', day, 'from', datetimeStr);
            return null;
        }
        
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            console.warn('Invalid time:', hours, minutes, 'from', datetimeStr);
            return null;
        }
        
        // Create date object (month is 0-indexed in JS)
        const dateObj = new Date(year, month - 1, day, hours, minutes);
        
        // Validate date was created correctly
        if (isNaN(dateObj.getTime())) {
            console.warn('Invalid date object created from:', datetimeStr);
            return null;
        }
        
        return dateObj;
    } catch (error) {
        console.error('Error parsing datetime:', error, datetimeStr);
        return null;
    }
}

/**
 * Check if tarikh sudah lepas (expired)
 * @param {string} datetimeStr - String tarikh untuk check
 * @returns {boolean} - true jika sudah lepas, false jika masih aktif
 */
function isDateExpired(datetimeStr) {
    const parsedDate = parseDateTime(datetimeStr);
    
    if (!parsedDate) {
        console.warn('Cannot parse date, assuming not expired:', datetimeStr);
        return false;
    }
    
    const currentDate = new Date();
    const isExpired = parsedDate < currentDate;
    
    // Debug log (boleh dibuang kemudian)
    console.log('Date check:', {
        original: datetimeStr,
        parsed: parsedDate.toLocaleString('ms-MY'),
        current: currentDate.toLocaleString('ms-MY'),
        isExpired: isExpired
    });
    
    return isExpired;
}

/**
 * Format date object kepada string dengan format tertentu
 * @param {Date} date - Date object
 * @param {string} format - Format string ('YYYY-MM-DD HH:MM', 'DD-MM-YYYY', etc)
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD HH:MM') {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes);
}

/**
 * Get countdown string untuk tarikh
 * @param {string} datetimeStr - String tarikh
 * @returns {string} - Countdown string (e.g., "2 hari lagi", "LEWAT")
 */
function getCountdown(datetimeStr) {
    const targetDate = parseDateTime(datetimeStr);
    
    if (!targetDate) {
        return 'Tarikh tidak sah';
    }
    
    const now = new Date();
    const diffMs = targetDate - now;
    
    if (diffMs < 0) {
        return 'LEWAT';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
        return `${diffDays} hari lagi`;
    } else if (diffHours > 0) {
        return `${diffHours} jam lagi`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes} minit lagi`;
    } else {
        return 'Sekarang';
    }
}

// Export functions (untuk browser environment)
if (typeof window !== 'undefined') {
    window.DateUtils = {
        parseDateTime,
        isDateExpired,
        formatDate,
        getCountdown
    };
}
