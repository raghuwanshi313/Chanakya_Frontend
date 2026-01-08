import PDFEditor from '@/components/pdf/PDFEditor';

/**
 * PDF Editor Page - Full-featured PDF editing with drawing tools
 * 
 * Features:
 * - Upload and view PDF files
 * - Draw annotations (pencil, shapes, highlighter)
 * - Add text annotations
 * - Eraser tool
 * - Color and size controls
 * - Undo/redo functionality
 * - Save edited PDF with all annotations
 * - Page navigation and zoom
 */
const PDFEditorPage = () => {
  return (
    <div className="w-full h-screen">
      <PDFEditor />
    </div>
  );
};

export default PDFEditorPage;
