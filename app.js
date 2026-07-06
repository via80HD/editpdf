const fileInput = document.getElementById('fileInput');
const loadPdfButton = document.getElementById('loadPdf');
const pdfCanvas = document.getElementById('pdfCanvas');
const printPdfButton = document.getElementById('printPdf');

let pdfDoc = null;
let pageNum = 1;

loadPdfButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDoc = pdf;
                renderPage(pageNum);
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        alert('Please select a PDF file.');
    }
});

function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: 1 });
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;

        const renderContext = {
            canvasContext: pdfCanvas.getContext('2d'),
            viewport: viewport
        };
        page.render(renderContext);
    });
}

printPdfButton.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Print PDF</title></head><body>');
    printWindow.document.write('<img src="' + pdfCanvas.toDataURL() + '" />');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
});
