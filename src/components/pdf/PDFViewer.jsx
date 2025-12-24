import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Highlighter,
  Save,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Configure PDF.js worker - use local file from public folder
// This is safe for offline and avoids version mismatches
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

console.log('PDF.js version:', pdfjs.version);
console.log('PDF Worker Source:', pdfjs.GlobalWorkerOptions.workerSrc);

const PDFViewer = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1); // still used for highlight navigation
  const pageRefs = useRef({});
  const [scale, setScale] = useState(1.0);
  const [highlights, setHighlights] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [error, setError] = useState(null);

  // Inject TextLayer styles dynamically
  useEffect(() => {
    const styleId = 'react-pdf-textlayer-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .react-pdf__Page__textContent {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 0.2;
          line-height: 1;
          font-weight: bold;
          font-size: 10px;
        }
        .react-pdf__Page__textContent > span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          -webkit-user-select: text;
          user-select: text;
        }
        .react-pdf__Page__textContent > span::selection {
          background: rgba(0, 123, 255, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
    console.log('PDFViewer component mounted');
    return () => console.log('PDFViewer component unmounted');
  }, []);

  // Load PDF file
  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      console.log('PDF file selected:', selectedFile.name, selectedFile.size, 'bytes');
      setFile(selectedFile);
      
      // Read file as ArrayBuffer for editing
      const reader = new FileReader();
      reader.onload = async (e) => {
        console.log('PDF file read successfully');
        setPdfBytes(e.target.result);
      };
      reader.onerror = (error) => {
        console.error('Error reading PDF file:', error);
        toast.error('Failed to read PDF file');
      };
      reader.readAsArrayBuffer(selectedFile);
      
      toast.success('PDF loaded successfully');
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  // Handle text selection for highlighting
  const handleTextSelect = () => {
    if (!isSelecting) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (!text || text.length === 0) return;
    
    try {
      if (selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Get the container position for relative coordinates
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      // Only create highlight if it's within reasonable bounds
      if (rect.width < 5 || rect.height < 5) return;
      
      const highlight = {
        id: Date.now() + Math.random(),
        text,
        pageNumber,
        color: highlightColor,
        position: {
          x: Math.max(0, rect.x - containerRect.x),
          y: Math.max(0, rect.y - containerRect.y),
          width: rect.width,
          height: rect.height
        }
      };
      
      setHighlights(prev => [...prev, highlight]);
      setSelectedText(text);
      toast.success('Text highlighted!');
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  };

  const toggleHighlightMode = () => {
    setIsSelecting(!isSelecting);
    if (!isSelecting) {
      toast.info('Highlight mode enabled - select text to highlight');
    } else {
      toast.info('Highlight mode disabled');
    }
  };

  // Save PDF with highlights
  const savePDF = async () => {
    if (!pdfBytes) {
      toast.error('No PDF loaded');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Add highlights to the PDF
      for (const highlight of highlights) {
        const page = pdfDoc.getPage(highlight.pageNumber - 1);
        const { height } = page.getSize();
        
        // Convert hex color to RGB
        const hexColor = highlight.color.replace('#', '');
        const r = parseInt(hexColor.substr(0, 2), 16) / 255;
        const g = parseInt(hexColor.substr(2, 2), 16) / 255;
        const b = parseInt(hexColor.substr(4, 2), 16) / 255;
        
        // Draw highlight rectangle (this is a simplified version)
        page.drawRectangle({
          x: 50,
          y: height - 100 - (highlights.indexOf(highlight) * 20),
          width: 200,
          height: 15,
          color: rgb(r, g, b),
          opacity: 0.5,
        });
        
        // Add text annotation
        page.drawText(highlight.text.substring(0, 50), {
          x: 55,
          y: height - 95 - (highlights.indexOf(highlight) * 20),
          size: 8,
          color: rgb(0, 0, 0),
        });
      }
      
      const pdfBytesModified = await pdfDoc.save();
      
      // Create download link
      const blob = new Blob([pdfBytesModified], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited_document.pdf';
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF saved successfully');
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast.error('Failed to save PDF');
    }
  };

  // Download original PDF
  const downloadPDF = () => {
    if (!file) {
      toast.error('No PDF loaded');
      return;
    }
    
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('PDF downloaded');
  };

  const removeHighlight = (id) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    toast.info('Highlight removed');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* File Upload */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              Open PDF
            </Button>
            
            {file && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {file.name}
              </span>
            )}
          </div>

          {/* Page Navigation */}
          {numPages && (
            <div className="flex items-center gap-2">
              <Button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button onClick={zoomOut} variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button onClick={zoomIn} variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Highlight Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleHighlightMode}
              variant={isSelecting ? "default" : "outline"}
              size="sm"
            >
              <Highlighter className="mr-2 h-4 w-4" />
              {isSelecting ? 'Highlighting' : 'Highlight'}
            </Button>
            
            <Input
              type="color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
              className="w-12 h-8 p-1 cursor-pointer"
              title="Highlight color"
            />
          </div>

          {/* Save/Download */}
          <div className="flex items-center gap-2">
            <Button onClick={savePDF} variant="outline" size="sm" disabled={!file}>
              <Save className="mr-2 h-4 w-4" />
              Save with Edits
            </Button>
            <Button onClick={downloadPDF} variant="outline" size="sm" disabled={!file}>
              <Download className="mr-2 h-4 w-4" />
              Download Original
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <ScrollArea className="flex-1">
          <div
            ref={containerRef}
            className="flex flex-col items-center gap-8 p-8 relative"
            onMouseUp={handleTextSelect}
          >
            {file ? (
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error('react-pdf Document load error:', error);
                  toast.error(`Failed to load PDF: ${error?.message || 'Unknown error'}`);
                }}
                className="pdf-document"
                loading={<div className="p-8 text-center">Loading PDF...</div>}
                error={<div className="p-8 text-center text-red-500">Failed to load PDF file.</div>}
              >
                {Array.from({ length: numPages || 0 }, (_, idx) => {
                  const pageIdx = idx + 1;
                  return (
                    <div
                      key={pageIdx}
                      ref={el => (pageRefs.current[pageIdx] = el)}
                      className="relative mb-8 shadow-2xl"
                      style={{ width: 'fit-content' }}
                    >
                      <Page
                        pageNumber={pageIdx}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                        onLoadError={error => {
                          console.error('react-pdf Page load error:', error);
                        }}
                      />
                      {/* Render highlights overlay for this page */}
                      {highlights
                        .filter(h => h.pageNumber === pageIdx)
                        .map(highlight => (
                          <div
                            key={highlight.id}
                            className="absolute pointer-events-auto cursor-pointer hover:opacity-75 transition-opacity"
                            style={{
                              top: `${highlight.position.y * scale}px`,
                              left: `${highlight.position.x * scale}px`,
                              width: `${highlight.position.width * scale}px`,
                              height: `${highlight.position.height * scale}px`,
                              backgroundColor: highlight.color,
                              opacity: 0.4,
                              mixBlendMode: 'multiply',
                              pointerEvents: 'all',
                            }}
                            onClick={() => removeHighlight(highlight.id)}
                            title="Click to remove highlight"
                          />
                        ))}
                    </div>
                  );
                })}
              </Document>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="h-24 w-24 mb-4" />
                <p className="text-xl font-medium">No PDF loaded</p>
                <p className="text-sm mt-2">Click \"Open PDF\" to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Highlights Sidebar */}
        {highlights.length > 0 && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4">Highlights ({highlights.length})</h3>
            <div className="space-y-2">
              {highlights.map(highlight => (
                <div
                  key={highlight.id}
                  className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setPageNumber(highlight.pageNumber);
                    // Scroll to the page div
                    const el = pageRefs.current[highlight.pageNumber];
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    toast.info(`Navigated to page ${highlight.pageNumber}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <span className="text-xs text-gray-500">Page {highlight.pageNumber}</span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-3">{highlight.text}</p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHighlight(highlight.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
