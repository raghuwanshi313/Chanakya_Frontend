import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Import react-pdf styles for text layer
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
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
  Trash2,
  FileText,
  MousePointer
} from 'lucide-react';
import { toast } from 'sonner';

// Configure PDF.js worker with fallback options
if (typeof window !== 'undefined') {
  // Try local worker first, fallback to CDN if not available
  const workerSrc = import.meta.env.PROD 
    ? `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    : '/pdf.worker.min.mjs';
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

const PDFMerged = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfBytes, setPdfBytes] = useState(null);
  
  // Drawing states (from PDFEditor)
  const [activeTool, setActiveTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState([]); // Canvas-based annotations
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [drawColor, setDrawColor] = useState('#FF0000');
  const [drawSize, setDrawSize] = useState(3);
  const [textSize, setTextSize] = useState(20);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [selectedAnnotationPage, setSelectedAnnotationPage] = useState(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Text highlighting states (from PDFViewer)
  const [highlights, setHighlights] = useState([]); // Text-based highlights
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const pageWrapperRef = useRef(null); // Outer wrapper
  const pageContainerRef = useRef(null); // The positioned page container we overlay on
  const pageRefs = useRef({}); // Refs for each page for scrolling
  const canvasRefs = useRef({}); // Canvas refs for each page

  // --- Persistence helpers (sessionStorage) ---
  const STORAGE_KEY = 'pdfEditorState';

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  };

  const hexToRgba = (hex, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.substring(0, 2), 16) || 0;
    const g = parseInt(normalized.substring(2, 4), 16) || 0;
    const b = parseInt(normalized.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Inject additional styles for text layer z-index and selection
  useEffect(() => {
    const styleId = 'react-pdf-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .react-pdf__Page__textContent {
          z-index: 2;
          user-select: text;
          -webkit-user-select: text;
        }
        .react-pdf__Page__textContent span {
          user-select: text;
          -webkit-user-select: text;
        }
        .react-pdf__Page__textContent span::selection {
          background: rgba(0, 123, 255, 0.4);
        }
        .react-pdf__Page__canvas {
          z-index: 1;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Load PDF file
  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const bytes = e.target.result;
        setPdfBytes(bytes);
        // Persist to sessionStorage
        try {
          const base64 = arrayBufferToBase64(bytes);
          const snapshot = {
            fileName: selectedFile.name,
            pdfBytes: base64,
            pageNumber,
            scale,
            annotations,
            highlights,
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch {}
      };
      reader.readAsArrayBuffer(selectedFile);
      
      toast.success('PDF loaded successfully');
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    // Keep current page if restored
    if (!pageNumber || pageNumber < 1) setPageNumber(1);
  };

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.pdfBytes) {
          const bytes = base64ToArrayBuffer(saved.pdfBytes);
          setPdfBytes(bytes);
        }
        if (saved.fileName) setFileName(saved.fileName);
        if (typeof saved.pageNumber === 'number') setPageNumber(saved.pageNumber);
        if (typeof saved.scale === 'number') setScale(saved.scale);
        if (Array.isArray(saved.annotations)) setAnnotations(saved.annotations);
        if (Array.isArray(saved.highlights)) setHighlights(saved.highlights);
        toast.info('Restored PDF editor state');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist key state changes
  useEffect(() => {
    try {
      if (!pdfBytes) return;
      const base64 = arrayBufferToBase64(pdfBytes);
      const snapshot = {
        fileName,
        pdfBytes: base64,
        pageNumber,
        scale,
        annotations,
        highlights,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [pdfBytes, fileName, pageNumber, scale, annotations, highlights]);

  // Navigation
  const previousPage = () => setPageNumber(prev => Math.max(1, prev - 1));
  const nextPage = () => setPageNumber(prev => Math.min(numPages, prev + 1));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  // Drawing functions for multi-page support
  const startDrawingOnPage = (e, targetPage) => {
    // Don't draw in highlight mode or select mode
    if (activeTool === 'select' || activeTool === 'text' || activeTool === 'highlight' || isHighlightMode) return;
    console.log('startDrawingOnPage', { activeTool, targetPage });

    const canvas = canvasRefs.current[targetPage];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setPageNumber(targetPage);
    
    const annotation = {
      id: Date.now(),
      type: activeTool,
      pageNumber: targetPage,
      color: drawColor,
      size: drawSize,
      points: activeTool === 'pencil' || activeTool === 'eraser' ? [{ x, y }] : { startX: x, startY: y },
      opacity: 1
    };
    
    setCurrentAnnotation(annotation);
  };

  const drawOnPage = (e, targetPage) => {
    if (!isDrawing || !currentAnnotation || isHighlightMode) return;
    if (currentAnnotation.pageNumber !== targetPage) return;
    // For debugging pencil: log a few moves at start of stroke
    if (currentAnnotation.points && currentAnnotation.points.length < 3) {
      console.log('drawOnPage first moves', { tool: activeTool, targetPage });
    }

    const canvas = canvasRefs.current[targetPage];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (activeTool === 'pencil' || activeTool === 'eraser') {
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
    
    renderCanvasForPage(targetPage);
  };

  const stopDrawing = () => {
    if (isDrawing && currentAnnotation) {
      const newAnnotations = [...annotations, currentAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations, highlights);
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

  // Set text insertion position for a specific page
  const setTextPositionForPage = (e, targetPage) => {
    if (isHighlightMode) return;
    console.log('setTextPositionForPage', { activeTool, targetPage });
    const canvas = canvasRefs.current[targetPage];
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setPageNumber(targetPage);

    // If clicking on existing text, select it and enable dragging
    if (activeTool === 'text' || activeTool === 'select') {
      const ctx = canvas.getContext('2d');
      const pageTexts = annotations.filter(a => a.pageNumber === targetPage && a.type === 'text');
      // check topmost first
      for (let i = pageTexts.length - 1; i >= 0; i--) {
        const a = pageTexts[i];
        ctx.font = `${a.size * scale}px Arial`;
        const width = ctx.measureText(a.text).width;
        const bx = a.position.x * scale;
        const by = a.position.y * scale - a.size * scale; // approximate top by font size
        const bw = width;
        const bh = a.size * scale;
        const hitX = x * scale;
        const hitY = y * scale;
        if (hitX >= bx && hitX <= bx + bw && hitY >= by && hitY <= by + bh) {
          setSelectedAnnotationId(a.id);
          setSelectedAnnotationPage(targetPage);
          setIsDraggingText(true);
          setDragOffset({ x: x - a.position.x, y: y - a.position.y });
          return;
        }
      }
    }

    // Otherwise set insertion point for new text or clear selection
    setSelectedAnnotationId(null);
    setSelectedAnnotationPage(null);
    if (activeTool === 'text') {
      setTextPosition({ x, y, pageNumber: targetPage });
    }
  };

  const addTextAnnotation = () => {
    if (!textInput.trim() || !textPosition) return;

    const targetPage = textPosition.pageNumber || pageNumber;
    console.log('addTextAnnotation', { targetPage, text: textInput });
    
    const annotation = {
      id: Date.now(),
      type: 'text',
      pageNumber: targetPage,
      color: drawColor,
      size: textSize,
      text: textInput,
      position: textPosition
    };
    
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations, highlights);
    
    setTextInput('');
    setTextPosition(null);
    toast.success('Text added');
  };

  // Text highlighting (from PDFViewer)
  const handleTextSelect = () => {
    console.log('handleTextSelect called, isHighlightMode:', isHighlightMode);
    
    if (!isHighlightMode) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    console.log('Selected text:', text);
    
    if (!text || text.length === 0) return;
    
    try {
      if (selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find which page the selection is on
      let targetPageNum = 1;
      let targetPageCanvas = null;
      
      for (let i = 1; i <= numPages; i++) {
        const pageEl = pageRefs.current[i];
        if (pageEl) {
          const pageRect = pageEl.getBoundingClientRect();
          // Check if selection is within this page
          if (rect.top >= pageRect.top && rect.bottom <= pageRect.bottom + 50) {
            targetPageNum = i;
            targetPageCanvas = pageEl.querySelector('.react-pdf__Page__canvas');
            break;
          }
        }
      }
      
      if (!targetPageCanvas) return;
      
      const pageRect = targetPageCanvas.getBoundingClientRect();

      if (rect.width < 5 || rect.height < 5) return;

      // Store highlight position relative to the page at scale 1.0
      // This way highlights stay in correct position when zooming
      const highlight = {
        id: Date.now() + Math.random(),
        text,
        pageNumber: targetPageNum,
        color: highlightColor,
        position: {
          x: (rect.x - pageRect.x) / scale,
          y: (rect.y - pageRect.y) / scale,
          width: rect.width / scale,
          height: rect.height / scale,
        },
      };
      
      const newHighlights = [...highlights, highlight];
      setHighlights(newHighlights);
      saveToHistory(annotations, newHighlights);
      toast.success(`Text highlighted on page ${targetPageNum}!`);
      
      selection.removeAllRanges();
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  };

  const toggleHighlightMode = () => {
    const newMode = !isHighlightMode;
    setIsHighlightMode(newMode);
    if (newMode) {
      setActiveTool('highlight');
      toast.info('Text highlight mode enabled - select text to highlight');
    } else {
      setActiveTool('select');
      toast.info('Text highlight mode disabled');
    }
  };

  const removeHighlight = (id) => {
    const newHighlights = highlights.filter(h => h.id !== id);
    setHighlights(newHighlights);
    saveToHistory(annotations, newHighlights);
    toast.info('Highlight removed');
  };

  // Render canvas annotations for a specific page
  const renderCanvasForPage = useCallback((targetPage) => {
    const canvas = canvasRefs.current[targetPage];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render all annotations for this page
    const pageAnnotations = annotations.filter(a => a.pageNumber === targetPage);
    
    pageAnnotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.size;
      ctx.globalAlpha = annotation.opacity || 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (annotation.type === 'pencil' || annotation.type === 'eraser') {
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
        if (!annotation.points.endX) return;
        const width = annotation.points.endX - annotation.points.startX;
        const height = annotation.points.endY - annotation.points.startY;
        ctx.strokeRect(
          annotation.points.startX * scale,
          annotation.points.startY * scale,
          width * scale,
          height * scale
        );
        
      } else if (annotation.type === 'circle') {
        if (!annotation.points.endX) return;
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
        // Draw selection outline if selected
        if (selectedAnnotationId === annotation.id) {
          const width = ctx.measureText(annotation.text).width;
          const x = annotation.position.x * scale;
          const height = annotation.size * scale;
          const yTop = annotation.position.y * scale - height;
          ctx.save();
          ctx.strokeStyle = '#3b82f6';
          ctx.setLineDash([4, 2]);
          ctx.lineWidth = 1;
          ctx.strokeRect(x, yTop, width, height);
          ctx.restore();
        }
      }
    });
    
    // Render current annotation being drawn on this page
    if (currentAnnotation && isDrawing && currentAnnotation.pageNumber === targetPage) {
      ctx.strokeStyle = currentAnnotation.color;
      ctx.fillStyle = currentAnnotation.color;
      ctx.lineWidth = currentAnnotation.size;
      ctx.globalAlpha = currentAnnotation.opacity || 1;
      
      if (currentAnnotation.type === 'pencil') {
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
  }, [annotations, scale, currentAnnotation, isDrawing, selectedAnnotationId]);

  // Ensure overlay canvas matches underlying PDF page canvas size
  const syncCanvasSizeForPage = useCallback((targetPage) => {
    const pageEl = pageRefs.current[targetPage];
    const canvas = canvasRefs.current[targetPage];
    if (!pageEl || !canvas) return;

    const pdfCanvas = pageEl.querySelector('.react-pdf__Page__canvas');
    if (!pdfCanvas) return;

    canvas.width = pdfCanvas.width;
    canvas.height = pdfCanvas.height;
    renderCanvasForPage(targetPage);
  }, [renderCanvasForPage]);

  // Update all canvases when annotations change
  useEffect(() => {
    // Sync canvas sizes and render for all pages
    for (let i = 1; i <= (numPages || 0); i++) {
      syncCanvasSizeForPage(i);
    }
  }, [annotations, numPages, scale, currentAnnotation, isDrawing, syncCanvasSizeForPage]);

  // History management (supports both annotations and highlights)
  const saveToHistory = (newAnnotations, newHighlights) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ annotations: newAnnotations, highlights: newHighlights });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setAnnotations(prevState.annotations);
      setHighlights(prevState.highlights);
    } else if (historyIndex === 0) {
      setAnnotations([]);
      setHighlights([]);
      setHistoryIndex(-1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setAnnotations(nextState.annotations);
      setHighlights(nextState.highlights);
    }
  };

  const clearAllForPage = () => {
    const pageAnnotations = annotations.filter(a => a.pageNumber !== pageNumber);
    const pageHighlights = highlights.filter(h => h.pageNumber !== pageNumber);
    setAnnotations(pageAnnotations);
    setHighlights(pageHighlights);
    saveToHistory(pageAnnotations, pageHighlights);
    toast.success('All edits cleared for this page');
  };

  // Save complete edited PDF with both annotations and highlights
  const saveEditedPDF = async () => {
    if (!pdfBytes) {
      toast.error('No PDF loaded');
      return;
    }

    try {
      toast.info('Generating edited PDF...');
      
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Process each page
      for (let i = 0; i < numPages; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const pageAnnots = annotations.filter(a => a.pageNumber === i + 1);
        const pageHighlights = highlights.filter(h => h.pageNumber === i + 1);
        
        // Create canvas for drawing highlights and annotations in page coordinates
        if (pageAnnots.length > 0 || pageHighlights.length > 0) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const ctx = tempCanvas.getContext('2d');

          // Draw text highlights first so ink sits above them
          pageHighlights.forEach(highlight => {
            ctx.fillStyle = hexToRgba(highlight.color, 0.35);
            ctx.fillRect(
              highlight.position.x,
              highlight.position.y,
              highlight.position.width,
              highlight.position.height
            );
          });

          // Draw annotations in creation order so eraser works as expected
          pageAnnots.forEach(annotation => {
            ctx.save();
            ctx.strokeStyle = annotation.color;
            ctx.fillStyle = annotation.color;
            ctx.lineWidth = annotation.size;
            ctx.globalAlpha = annotation.opacity || 1;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (annotation.type === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out';
              ctx.lineWidth = (annotation.size || 3) * 2;
            }
            
            if (annotation.type === 'pencil' || annotation.type === 'eraser') {
              if (annotation.points.length < 2) {
                ctx.restore();
                return;
              }
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

            ctx.restore();
          });

          // Convert canvas to image and embed in PDF respecting page coordinates
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
      }
      
      const editedPdfBytes = await pdfDoc.save();
      
      // Download the edited PDF
      const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName ? fileName.replace(/\.pdf$/i, '_edited.pdf') : 'edited_document.pdf';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast.error('Failed to save PDF: ' + error.message);
    }
  };

  const hasEdits = annotations.length > 0 || highlights.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b p-3 flex items-center gap-2 flex-wrap shadow-sm">
        {/* File Upload */}
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
        
        {(file || pdfBytes) && (
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {fileName || (file ? file.name : 'PDF document')}
          </span>
        )}
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Tools */}
        <Button
          variant={activeTool === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('select');
            setIsHighlightMode(false);
          }}
          title="Select mode"
        >
          <MousePointer className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'highlight' && isHighlightMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleHighlightMode}
          title="Highlight text"
        >
          <Highlighter className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <Button
          variant={activeTool === 'pencil' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('pencil');
            setIsHighlightMode(false);
          }}
          title="Pencil"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('eraser');
            setIsHighlightMode(false);
          }}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('rectangle');
            setIsHighlightMode(false);
          }}
          title="Rectangle"
        >
          <Square className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('circle');
            setIsHighlightMode(false);
          }}
          title="Circle"
        >
          <Circle className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setActiveTool('text');
            setIsHighlightMode(false);
          }}
          title="Add text"
        >
          <Type className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Colors */}
        {isHighlightMode ? (
          <Input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="w-10 h-10 p-1 cursor-pointer rounded border"
            title="Highlight color"
          />
        ) : (
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            className="w-10 h-10 rounded border cursor-pointer"
            title="Drawing color"
          />
        )}
        
        {!isHighlightMode && (
          <Input
            type="number"
            min="1"
            max="20"
            value={drawSize}
            onChange={(e) => setDrawSize(parseInt(e.target.value))}
            className="w-16"
            title="Brush size"
          />
        )}

        {/* Text size control */}
        {!isHighlightMode && (
          <Input
            type="number"
            min="8"
            max="96"
            value={selectedAnnotationId ? (annotations.find(a => a.id === selectedAnnotationId)?.size || textSize) : textSize}
            onChange={(e) => {
              const val = Number(e.target.value) || 12;
              if (selectedAnnotationId) {
                setAnnotations(prev => prev.map(a => (
                  a.id === selectedAnnotationId ? { ...a, size: val } : a
                )));
                if (selectedAnnotationPage) renderCanvasForPage(selectedAnnotationPage);
              } else {
                setTextSize(val);
              }
            }}
            className="w-20"
            title="Text size (px)"
          />
        )}
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* History */}
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex < 0}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllForPage}
          title="Clear page"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Zoom */}
        <Button variant="outline" size="sm" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Save */}
        <Button
          variant="default"
          size="sm"
          onClick={saveEditedPDF}
          disabled={!file || !hasEdits}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Edited PDF
        </Button>
      </div>
      
      {/* Text Input Dialog */}
      {textPosition && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-xl z-50 border">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text..."
            className="mb-2 min-w-[250px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTextAnnotation();
              if (e.key === 'Escape') setTextPosition(null);
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addTextAnnotation}>
              Add Text
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
        <ScrollArea className="flex-1">
          <div 
            ref={containerRef}
            className="flex flex-col items-center p-8 gap-8"
            onMouseUp={handleTextSelect}
          >
            {file ? (
              <div className="relative" ref={pageWrapperRef}>
                <Document
                  file={file ? file : (pdfBytes ? { data: pdfBytes } : null)}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error('PDF load error:', error);
                    toast.error('Failed to load PDF');
                  }}
                  loading={<div className="p-8 text-center">Loading PDF...</div>}
                  error={<div className="p-8 text-center text-red-500">Failed to load PDF</div>}
                >
                  {/* Render ALL pages for scrolling */}
                  {Array.from({ length: numPages || 0 }, (_, idx) => {
                    const currentPageNum = idx + 1;
                    return (
                      <div 
                        key={currentPageNum}
                        ref={el => pageRefs.current[currentPageNum] = el}
                        style={{ position: 'relative', marginBottom: '2rem' }} 
                        className="shadow-2xl"
                      >
                        <Page
                          pageNumber={currentPageNum}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => syncCanvasSizeForPage(currentPageNum)}
                          onLoadError={error => console.error('Page load error:', error)}
                        />
                        
                        {/* Canvas overlay for drawing on this page */}
                        <canvas
                          ref={el => canvasRefs.current[currentPageNum] = el}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: isHighlightMode ? 1 : 10,
                            cursor: activeTool === 'select' || isHighlightMode ? 'default' : 
                                   activeTool === 'text' ? 'text' : 'crosshair',
                            pointerEvents: isHighlightMode ? 'none' : 'auto',
                            touchAction: 'none'
                          }}
                          onMouseDown={
                            isHighlightMode
                              ? undefined
                              : (e) => (
                                  activeTool === 'text'
                                    ? setTextPositionForPage(e, currentPageNum)
                                    : startDrawingOnPage(e, currentPageNum)
                                )
                          }
                          onMouseMove={
                            isHighlightMode
                              ? undefined
                              : (e) => {
                                  if (isDraggingText && selectedAnnotationPage === currentPageNum) {
                                    const rect = canvasRefs.current[currentPageNum].getBoundingClientRect();
                                    const x = (e.clientX - rect.left) / scale;
                                    const y = (e.clientY - rect.top) / scale;
                                    setAnnotations(prev => prev.map(a => (
                                      a.id === selectedAnnotationId
                                        ? { ...a, position: { x: x - dragOffset.x, y: y - dragOffset.y, pageNumber: a.position.pageNumber } }
                                        : a
                                    )));
                                    renderCanvasForPage(currentPageNum);
                                  } else if (isDrawing || activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'rectangle' || activeTool === 'circle') {
                                    drawOnPage(e, currentPageNum);
                                  }
                                }
                          }
                          onMouseUp={
                            isHighlightMode
                              ? undefined
                              : (e) => {
                                  if (isDraggingText) {
                                    setIsDraggingText(false);
                                    saveToHistory(annotations, highlights);
                                  } else if (isDrawing) {
                                    stopDrawing();
                                  }
                                }
                          }
                          onMouseLeave={
                            isHighlightMode
                              ? undefined
                              : (e) => {
                                  if (isDraggingText) {
                                    setIsDraggingText(false);
                                  } else if (isDrawing) {
                                    stopDrawing();
                                  }
                                }
                          }
                        />
                        
                        {/* Text highlights overlay for this page */}
                        {highlights
                          .filter(h => h.pageNumber === currentPageNum)
                          .map(highlight => (
                            <div
                              key={highlight.id}
                              className="absolute cursor-pointer hover:opacity-60 transition-opacity"
                              style={{
                                top: `${highlight.position.y * scale}px`,
                                left: `${highlight.position.x * scale}px`,
                                width: `${highlight.position.width * scale}px`,
                                height: `${highlight.position.height * scale}px`,
                                backgroundColor: highlight.color,
                                opacity: 0.4,
                                zIndex: 5,
                                pointerEvents: 'auto',
                              }}
                              onClick={() => removeHighlight(highlight.id)}
                              title="Click to remove highlight"
                            />
                          ))}
                        
                        {/* Page number indicator */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          Page {currentPageNum}
                        </div>
                      </div>
                    );
                  })}
                </Document>
                
                {/* Floating Page Navigation */}
                {numPages && (
                  <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white p-2 rounded-lg shadow-lg z-50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const el = pageRefs.current[Math.max(1, pageNumber - 1)];
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setPageNumber(Math.max(1, pageNumber - 1));
                        }
                      }}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm min-w-[100px] text-center">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const el = pageRefs.current[Math.min(numPages, pageNumber + 1)];
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setPageNumber(Math.min(numPages, pageNumber + 1));
                        }
                      }}
                      disabled={pageNumber >= numPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium">No PDF loaded</p>
                  <p className="text-sm mt-2">Click "Open PDF" to get started</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PDFMerged;
