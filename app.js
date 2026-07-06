let currentPdfDoc = null;
const fieldValues = {};

// 1. Direct Touchstart Focus Mapping (Guarantees Keyboard Popup)
document.getElementById('dynamic-fields-stack').addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'INPUT') {
        e.target.focus();
    }
});

// 2. Read and Render Form Fields into a Simple Stack
async function renderMobileForm(pdfBytes) {
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const container = document.getElementById('dynamic-fields-stack');
    container.innerHTML = ''; // Clear previous fields

    fields.forEach(field => {
        const type = field.constructor.name;
        const name = field.getName();

        if (type === 'PDFTextField') {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'field-group';
            
            fieldGroup.innerHTML = `
                <label>${name}</label>
                <input type="text" data-field-name="${name}" value="${field.getText() || ''}" placeholder="Tap to enter info...">
            `;
            
            // Sync values immediately on input type change
            fieldGroup.querySelector('input').addEventListener('input', (e) => {
                fieldValues[name] = e.target.value;
            });

            container.appendChild(fieldGroup);
        }
    });

    // Render underlying visual page canvas context using pdf.js setup
    renderCanvasPreview(pdfBytes);
}

async function renderCanvasPreview(bytes) {
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const canvas = document.getElementById('mobile-pdf-canvas');
    const context = canvas.getContext('2d');
    
    // Scale purely based on the mobile device viewport width
    const viewport = page.getViewport({ scale: canvas.parentElement.clientWidth / page.getViewport({scale: 1}).width });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport: viewport }).promise;
}
