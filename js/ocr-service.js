
// Wrapper for Tesseract.js interaction

const OCRService = {

    // Config
    worker: null,

    init: async function () {
        if (this.worker) return;
        // Tesseract is loaded via CDN globally
    },

    scanImage: async function (imageFile, progressCallback) {
        if (!window.Tesseract) {
            alert("La librería de escaneo no se ha cargado correctamente. Comprueba tu conexión.");
            return null;
        }

        try {
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (progressCallback) progressCallback(m);
                }
            });

            // We use 'eng' (English) often because traineddata is smaller and numbers are universal.
            // But 'spa' (Spanish) is better for text keyworks like "TOTAL".
            // Let's try to load both if possible or just Spanish.
            // For lightness, let's start with Spanish.
            await worker.loadLanguage('spa');
            await worker.initialize('spa');

            const ret = await worker.recognize(imageFile);
            await worker.terminate();

            return ret.data.text;

        } catch (err) {
            console.error("OCR Error:", err);
            alert("Error al procesar la imagen: " + err.message);
            return null;
        }
    },

    parseReceiptText: function (text) {
        const lines = text.split('\n');
        let maxPrice = 0.0;
        let items = [];

        // Regex for Price: 12,34 or 12.34 options
        // We look for a price at the END of the line usually
        const priceRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
        
        // Keywords to identify total (to exclude from items)
        const totalKeywords = ['TOTAL', 'VENTA', 'IMPORTE', 'PAGAR', 'SUMA', 'TARJETA', 'EFECTIVO', 'CAMBIO', 'ENTREGADO'];
        const badStartKeywords = ['TEL', 'CIF', 'NIF', 'CALLE', 'PLAZA', 'AVDA', 'C/', 'FACTURA', 'TICKET'];

        for (let line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length < 3) continue;

            const upperLine = trimmedLine.toUpperCase();
            
            // Check for price matches
            const matches = trimmedLine.match(priceRegex);
             
            if (matches) {
                // Potential price line
                // Pick the last match as the likely price for the line
                const priceStr = matches[matches.length - 1];
                
                // Parse Price
                let cleanNum = priceStr.replace(',', '.'); // Try simple replace
                // Handle 1.000,00 situation vs 12,34
                // If it has multiple dots/commas, it needs careful parsing, but let's keep it simple for now as per v1 logic inheritance
                let num = parseFloat(priceStr.replace(',', '.'));
                if (isNaN(num)) {
                     // Try reversing separator logic if failed
                     num = parseFloat(priceStr.replace('.', '').replace(',', '.'));
                }

                if (isNaN(num)) continue;

                // Is it the TOTAL?
                const isTotalLine = totalKeywords.some(k => upperLine.includes(k));

                if (isTotalLine) {
                    if (num > maxPrice) {
                        maxPrice = num;
                    }
                } else {
                    // Likely an ITEM, if it's not some header info
                    // Filter out headers/addresses
                    const isHeader = badStartKeywords.some(k => upperLine.startsWith(k));
                    
                    if (!isHeader && num > 0 && num < 1000) { // Sanity check for item price
                         // Extract Name: Everything before the price
                         // Using lastIndexOf to split
                         const priceIdx = trimmedLine.lastIndexOf(priceStr);
                         let itemName = trimmedLine.substring(0, priceIdx).trim();
                         
                         // Cleanup noise characters
                         itemName = itemName.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ%]/g, '');
                         
                         if (itemName.length > 2) {
                             items.push({ name: itemName, price: num });
                         }
                    }
                }
            }
        }
        
        // Fallback: If no maxPrice found via keywords, try biggest number? 
        // We'll stick to safe logic for now.

        return {
            text: text,
            total: maxPrice > 0 ? maxPrice : null,
            items: items
        };
    }
};
