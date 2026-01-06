const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * Formats a Date object to DD-MMM-YYYY string for readability in exports.
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
const formatDateForExport = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Formats a number as Indian currency (₹X,XXX).
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

/**
 * Removes special characters from filenames, replaces spaces with underscores.
 * @param {string} name - The filename to sanitize
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (name) => {
  if (!name) return 'export';
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

/**
 * Generates a CSV string from data and field configuration.
 * @param {Array} data - Array of objects to convert
 * @param {Array} fields - Field configuration with label and value mappings
 * @returns {string} CSV string
 */
const generateCSV = (data, fields) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      // Return CSV with headers only if no data
      const headers = fields.map(f => f.label || f.value).join(',');
      return headers + '\n';
    }
    
    const parser = new Parser({ fields });
    return parser.parse(data);
  } catch (error) {
    throw new Error(`Failed to generate CSV: ${error.message}`);
  }
};

/**
 * Generates a PDF document from data with title, table, and metadata.
 * @param {string} title - Report title
 * @param {Array} data - Array of objects to render
 * @param {Array} columns - Column configuration { header, key, width }
 * @param {Object} metadata - Optional metadata (dateRange, generatedAt)
 * @returns {Promise<Buffer>} PDF as Buffer
 */
const generatePDF = (title, data, columns, metadata = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(0.5);
      
      // Metadata
      doc.fontSize(10).font('Helvetica').fillColor('#666');
      if (metadata.dateRange) {
        doc.text(`Date Range: ${metadata.dateRange}`, { align: 'center' });
      }
      doc.text(`Generated: ${formatDateForExport(new Date())} at ${new Date().toLocaleTimeString('en-IN')}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000');
      
      if (!Array.isArray(data) || data.length === 0) {
        doc.fontSize(12).text('No data available for the selected criteria.', { align: 'center' });
        doc.end();
        return;
      }
      
      // Calculate column widths
      const pageWidth = doc.page.width - 100;
      const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
      const defaultWidth = totalDefinedWidth > 0 
        ? (pageWidth - totalDefinedWidth) / columns.filter(c => !c.width).length 
        : pageWidth / columns.length;
      
      const colWidths = columns.map(col => col.width || defaultWidth);
      const rowHeight = 25;
      const startX = 50;
      let currentY = doc.y;
      
      // Table Header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.rect(startX, currentY, pageWidth, rowHeight).fillAndStroke('#f0f0f0', '#ccc');
      
      let xPos = startX + 5;
      columns.forEach((col, i) => {
        doc.fillColor('#000').text(col.header, xPos, currentY + 7, {
          width: colWidths[i] - 10,
          ellipsis: true
        });
        xPos += colWidths[i];
      });
      currentY += rowHeight;
      
      // Table Rows
      doc.font('Helvetica').fontSize(9);
      
      data.forEach((row, rowIndex) => {
        // Check for page break
        if (currentY + rowHeight > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
          
          // Re-draw header on new page
          doc.font('Helvetica-Bold').fontSize(10);
          doc.rect(startX, currentY, pageWidth, rowHeight).fillAndStroke('#f0f0f0', '#ccc');
          
          let headerX = startX + 5;
          columns.forEach((col, i) => {
            doc.fillColor('#000').text(col.header, headerX, currentY + 7, {
              width: colWidths[i] - 10,
              ellipsis: true
            });
            headerX += colWidths[i];
          });
          currentY += rowHeight;
          doc.font('Helvetica').fontSize(9);
        }
        
        // Alternate row colors
        const bgColor = rowIndex % 2 === 0 ? '#fff' : '#f9f9f9';
        doc.rect(startX, currentY, pageWidth, rowHeight).fillAndStroke(bgColor, '#eee');
        
        xPos = startX + 5;
        columns.forEach((col, i) => {
          let value = row[col.key];
          
          // Format currency values
          if (col.isCurrency && typeof value === 'number') {
            value = formatCurrency(value);
          }
          
          // Format date values
          if (col.isDate && value) {
            value = formatDateForExport(value);
          }
          
          doc.fillColor('#333').text(String(value ?? 'N/A'), xPos, currentY + 7, {
            width: colWidths[i] - 10,
            ellipsis: true
          });
          xPos += colWidths[i];
        });
        currentY += rowHeight;
      });
      
      // Footer with total count
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Total Records: ${data.length}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(new Error(`Failed to generate PDF: ${error.message}`));
    }
  });
};

module.exports = PDFDocument;
