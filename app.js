let currentPdfBytes = null;
const fieldValues = {};
let scale = 1.0;

// FIX 1: Use the correct global variable name for PDF.js
const pdfjs = window.pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('placeholder').style.display = 'none';

    const reader = new FileReader();
    reader.onload = async (event) => {
        currentPdfBytes = new Uint8Array(event.target.result);
        
        try {
            // Render the preview first to establish the canvas sizing scale
            await renderCanvasPreview(currentPdfBytes);
            // Build the interactive mobile form fields right after
            await renderMobileForm(currentPdfBytes);
            
            document.getElementById('export-btn').style.display = 'block';
            document.getElementById('preview-card').style.display = 'block';
        } catch (error) {
            console.error("Error loading PDF:", error);
            alert("Failed to process this PDF file.");
        }
    };
    reader.readAsArrayBuffer(file);
});

// Direct touchstart tracking to instantly focus inputs and force soft keyboards
document.getElementById('dynamic-fields-stack').addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        e.target.focus();
    }
});

// Draw page image layout preview directly on screen using standard canvas configurations
async function renderCanvasPreview(bytes) {
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const canvas = document.getElementById('mobile-pdf-canvas');
    const context = canvas.getContext('2d');
    
    // Set scale exactly to match parent element width for responsive mobile viewports
    scale = canvas.parentElement.clientWidth / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale: scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport: viewport }).promise;
}

// Extract interactive objects using standard coordinates
async function renderMobileForm(pdfBytes) {
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const container = document.getElementById('dynamic-fields-stack');
    container.innerHTML = ''; 

    if (fields.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">No interactive form fields detected in this PDF structure.</p>';
        return;
    }

    fields.forEach(field => {
        const name = field.getName();
        const fieldGroup = document.createElement('div');

        // FIX 2: Use instanceof checks instead of constructor string names
        // Text Fields
        if (field instanceof PDFLib.PDFTextField) {
            fieldGroup.className = 'field-group';
            fieldGroup.innerHTML = `
                <label>${name}</label>
                <input type="text" 
                       data-field-name="${name}" 
                       value="${field.getText() || ''}" 
                       placeholder="Tap to enter details..."
                       autocapitalize="none"
                       autocomplete="off"
                       autocorrect="off"
                       spellcheck="false"
                       enterkeyhint="next">
            `;
            fieldGroup.querySelector('input').addEventListener('input', (e) => {
                fieldValues[name] = e.target.value;
            });
            container.appendChild(fieldGroup);

        // Checkboxes
        } else if (field instanceof PDFLib.PDFCheckBox) {
            fieldGroup.className = 'checkbox-group';
            const isChecked = typeof field.isChecked === 'function' ? field.isChecked() : false;
            fieldGroup.innerHTML = `
                <input type="checkbox" data-field-name="${name}" ${isChecked ? 'checked' : ''} id="chk-${name}">
                <label for="chk-${name}">${name}</label>
            `;
            fieldGroup.querySelector('input').addEventListener('change', (e) => {
                fieldValues[name] = e.target.checked;
            });
            container.appendChild(fieldGroup);

        // Dropdowns
        } else if (field instanceof PDFLib.PDFDropdown) {
            fieldGroup.className = 'field-group';
            const options = typeof field.getOptions === 'function' ? field.getOptions() : [];
            const selected = typeof field.getSelected === 'function' ? field.getSelected() : [];
            
            let optionsHtml = options.map(opt => `<option value="${opt}" ${selected.includes(opt) ? 'selected' : ''}>${opt}</option>`).join('');
            
            fieldGroup.innerHTML = `
                <label>${name}</label>
                <select data-field-name="${name}">
                    <option value="">Select option...</option>
                    ${optionsHtml}
                </select>
            `;
            fieldGroup.querySelector('select').addEventListener('change', (e) => {
                fieldValues[name] = e.target.value;
            });
            container.appendChild(fieldGroup);
        }
    });
}

// Inject entries and download complete file instance updates
document.getElementById('export-btn').addEventListener('click', async () => {
    if (!currentPdfBytes) return;

    const pdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
    const form = pdfDoc.getForm();

    Object.keys(fieldValues).forEach(fieldName => {
        try {
            const field = form.getField(fieldName);

            // FIX 2 (Continued): Use instanceof checks here as well
            if (field instanceof PDFLib.PDFTextField) {
                field.setText(fieldValues[fieldName]);
            } else if (field instanceof PDFLib.PDFCheckBox) {
                if (fieldValues[fieldName]) {
                    field.check();
                } else {
                    field.uncheck();
                }
            } else if (field instanceof PDFLib.PDFDropdown) {
                field.select(fieldValues[fieldName]);
            }
        } catch (err) {
            console.warn(`Could not update field: ${fieldName}`, err);
        }
    });

    const modifiedPdfBytes = await pdfDoc.save();

    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filled_mobile_document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
