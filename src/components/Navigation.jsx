import { Link, useLocation } from 'react-router-dom';
import { FileText, PaintBucket } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-4 right-4 z-50 flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
      <Link to="/">
        <Button
          variant={location.pathname === '/' ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <PaintBucket className="h-4 w-4" />
          Paint
        </Button>
      </Link>
      <Link to="/pdf">
        <Button
          variant={location.pathname === '/pdf' ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          PDF Editor
        </Button>
      </Link>
    </nav>
  );
};

export default Navigation;
