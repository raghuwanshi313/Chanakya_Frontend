import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  Highlighter,
  Save,
  Undo,
  Redo,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { saveFile } from '@/services/electronService';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const PDFEditor = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfBytes, setPdfBytes] = useState(null);
  
  // Drawing states
  const [activeTool, setActiveTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState([]); // All annotations across all pages
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [drawColor, setDrawColor] = useState('#FF0000');
  const [drawSize, setDrawSize] = useState(3);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  // Load PDF file
  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        setPdfBytes(e.target.result);
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

  // Navigation
  const previousPage = () => setPageNumber(prev => Math.max(1, prev - 1));
  const nextPage = () => setPageNumber(prev => Math.min(numPages, prev + 1));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  // Drawing functions
  const startDrawing = (e) => {
    if (activeTool === 'select' || activeTool === 'text') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    
    const annotation = {
      id: Date.now(),
      type: activeTool,
      pageNumber,
      color: drawColor,
      size: drawSize,
      points: activeTool === 'pencil' || activeTool === 'eraser' ? [{ x, y }] : { startX: x, startY: y },
      opacity: activeTool === 'highlighter' ? 0.3 : 1
    };
    
    setCurrentAnnotation(annotation);
  };

  const draw = (e) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'highlighter') {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    } else {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: { ...prev.points, endX: x, endY: y }
      }));
    }
    
    renderCanvas();
  };

  const stopDrawing = () => {
    if (isDrawing && currentAnnotation) {
      const newAnnotations = [...annotations, currentAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
      setCurrentAnnotation(null);
    }
    setIsDrawing(false);
  };

  // Handle text tool
  const handleCanvasClick = (e) => {
    if (activeTool !== 'text') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setTextPosition({ x, y });
  };

  const addTextAnnotation = () => {
    if (!textInput.trim() || !textPosition) return;
    
    const annotation = {
      id: Date.now(),
      type: 'text',
      pageNumber,
      color: drawColor,
      size: drawSize * 4,
      text: textInput,
      position: textPosition
    };
    
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    
    setTextInput('');
    setTextPosition(null);
    toast.success('Text added');
  };

  // Render annotations on canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render all annotations for current page
    const pageAnnotations = annotations.filter(a => a.pageNumber === pageNumber);
    
    pageAnnotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.size;
      ctx.globalAlpha = annotation.opacity || 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (annotation.type === 'pencil' || annotation.type === 'eraser' || annotation.type === 'highlighter') {
        if (annotation.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(annotation.points[0].x * scale, annotation.points[0].y * scale);
        
        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x * scale, annotation.points[i].y * scale);
        }
        
        if (annotation.type === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = annotation.size * 2;
        }
        
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        
      } else if (annotation.type === 'rectangle') {
        const width = annotation.points.endX - annotation.points.startX;
        const height = annotation.points.endY - annotation.points.startY;
        ctx.strokeRect(
          annotation.points.startX * scale,
          annotation.points.startY * scale,
          width * scale,
          height * scale
        );
        
      } else if (annotation.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(annotation.points.endX - annotation.points.startX, 2) +
          Math.pow(annotation.points.endY - annotation.points.startY, 2)
        );
        ctx.beginPath();
        ctx.arc(
          annotation.points.startX * scale,
          annotation.points.startY * scale,
          radius * scale,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        
      } else if (annotation.type === 'text') {
        ctx.font = `${annotation.size * scale}px Arial`;
        ctx.fillText(annotation.text, annotation.position.x * scale, annotation.position.y * scale);
      }
    });
    
    // Render current annotation being drawn
    if (currentAnnotation && isDrawing) {
      ctx.strokeStyle = currentAnnotation.color;
      ctx.fillStyle = currentAnnotation.color;
      ctx.lineWidth = currentAnnotation.size;
      ctx.globalAlpha = currentAnnotation.opacity || 1;
      
      if (currentAnnotation.type === 'pencil' || currentAnnotation.type === 'highlighter') {
        if (currentAnnotation.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(currentAnnotation.points[0].x * scale, currentAnnotation.points[0].y * scale);
        
        for (let i = 1; i < currentAnnotation.points.length; i++) {
          ctx.lineTo(currentAnnotation.points[i].x * scale, currentAnnotation.points[i].y * scale);
        }
        
        ctx.stroke();
      } else if (currentAnnotation.points.endX) {
        if (currentAnnotation.type === 'rectangle') {
          const width = currentAnnotation.points.endX - currentAnnotation.points.startX;
          const height = currentAnnotation.points.endY - currentAnnotation.points.startY;
          ctx.strokeRect(
            currentAnnotation.points.startX * scale,
            currentAnnotation.points.startY * scale,
            width * scale,
            height * scale
          );
        } else if (currentAnnotation.type === 'circle') {
          const radius = Math.sqrt(
            Math.pow(currentAnnotation.points.endX - currentAnnotation.points.startX, 2) +
            Math.pow(currentAnnotation.points.endY - currentAnnotation.points.startY, 2)
          );
          ctx.beginPath();
          ctx.arc(
            currentAnnotation.points.startX * scale,
            currentAnnotation.points.startY * scale,
            radius * scale,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        }
      }
    }
    
    ctx.globalAlpha = 1;
  };

  // Update canvas when annotations or page changes
  useEffect(() => {
    if (canvasRef.current && pdfCanvasRef.current) {
      const pdfCanvas = pdfCanvasRef.current;
      canvasRef.current.width = pdfCanvas.width;
      canvasRef.current.height = pdfCanvas.height;
      renderCanvas();
    }
  }, [annotations, pageNumber, scale, currentAnnotation, isDrawing]);

  // History management
  const saveToHistory = (newAnnotations) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setAnnotations([]);
      setHistoryIndex(-1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const clearAnnotations = () => {
    const pageAnnotations = annotations.filter(a => a.pageNumber !== pageNumber);
    setAnnotations(pageAnnotations);
    saveToHistory(pageAnnotations);
    toast.success('Annotations cleared for this page');
  };

  // Save edited PDF
  const saveEditedPDF = async () => {
    if (!pdfBytes) {
      toast.error('No PDF loaded');
      return;
    }

    try {
      toast.info('Generating edited PDF...');
      
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Add annotations to each page
      for (let i = 0; i < numPages; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const pageAnnots = annotations.filter(a => a.pageNumber === i + 1);
        
        // Create a temporary canvas for this page
        const tempCanvas = document.createElement('canvas');
        const pdfCanvas = document.querySelectorAll('.react-pdf__Page__canvas')[i];
        if (!pdfCanvas) continue;
        
        tempCanvas.width = pdfCanvas.width;
        tempCanvas.height = pdfCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        // Draw annotations
        pageAnnots.forEach(annotation => {
          ctx.strokeStyle = annotation.color;
          ctx.fillStyle = annotation.color;
          ctx.lineWidth = annotation.size;
          ctx.globalAlpha = annotation.opacity || 1;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          const scaleX = width / tempCanvas.width;
          const scaleY = height / tempCanvas.height;
          
          if (annotation.type === 'pencil' || annotation.type === 'highlighter') {
            if (annotation.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
            for (let i = 1; i < annotation.points.length; i++) {
              ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
            }
            ctx.stroke();
          } else if (annotation.type === 'rectangle' && annotation.points.endX) {
            const w = annotation.points.endX - annotation.points.startX;
            const h = annotation.points.endY - annotation.points.startY;
            ctx.strokeRect(annotation.points.startX, annotation.points.startY, w, h);
          } else if (annotation.type === 'circle' && annotation.points.endX) {
            const radius = Math.sqrt(
              Math.pow(annotation.points.endX - annotation.points.startX, 2) +
              Math.pow(annotation.points.endY - annotation.points.startY, 2)
            );
            ctx.beginPath();
            ctx.arc(annotation.points.startX, annotation.points.startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (annotation.type === 'text') {
            ctx.font = `${annotation.size}px Arial`;
            ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
          }
        });
        
        // Convert canvas to image and embed in PDF
        const imageData = tempCanvas.toDataURL('image/png');
        const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);
        
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      }
      
      const editedPdfBytes = await pdfDoc.save();
      
      // Use Electron save dialog if available, otherwise download
      const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
      const dataURL = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      
      try {
        const result = await saveFile(dataURL, 'edited_document.pdf');
        if (result.success) {
          toast.success('PDF saved successfully!');
        }
      } catch (err) {
        // Fallback to browser download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'edited_document.pdf';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded successfully!');
      }
      
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast.error('Failed to save PDF: ' + error.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Open PDF
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={onFileChange}
          className="hidden"
        />
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Drawing Tools */}
        <Button
          variant={activeTool === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('select')}
        >
          Select
        </Button>
        <Button
          variant={activeTool === 'pencil' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('pencil')}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'highlighter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('highlighter')}
        >
          <Highlighter className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('eraser')}
        >
          <Eraser className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('rectangle')}
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('circle')}
        >
          <Circle className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('text')}
        >
          <Type className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Color and Size */}
        <input
          type="color"
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          className="w-10 h-10 rounded border"
        />
        <Input
          type="number"
          min="1"
          max="20"
          value={drawSize}
          onChange={(e) => setDrawSize(parseInt(e.target.value))}
          className="w-20"
        />
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* History */}
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex < 0}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearAnnotations}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Zoom */}
        <Button variant="outline" size="sm" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Save */}
        <Button
          variant="default"
          size="sm"
          onClick={saveEditedPDF}
          disabled={!file || annotations.length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Edited PDF
        </Button>
      </div>
      
      {/* Text Input Dialog */}
      {textPosition && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg z-50">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text..."
            className="mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTextAnnotation();
              if (e.key === 'Escape') setTextPosition(null);
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addTextAnnotation}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTextPosition(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <ScrollArea className="flex-1 p-4">
          {file ? (
            <div className="flex flex-col items-center">
              <div className="relative inline-block">
                <Document
                  file={file}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error('PDF load error:', error);
                    toast.error('Failed to load PDF');
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      canvasRef={pdfCanvasRef}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        cursor: activeTool === 'select' ? 'default' : 'crosshair',
                        pointerEvents: activeTool === 'select' ? 'none' : 'auto'
                      }}
                      onMouseDown={activeTool === 'text' ? handleCanvasClick : startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>
                </Document>
              </div>
              
              {/* Page Navigation */}
              <div className="mt-4 flex items-center gap-4 bg-white p-2 rounded-lg shadow">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousPage}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {pageNumber} of {numPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Upload a PDF to start editing</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default PDFEditor;
