import { useEffect } from "react";
import { useLocation } from "wouter";


export default function Universe() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocation('/')
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation])
  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-hidden bg-black">
      <iframe
        src="universe-embed/index.html"
        title="Embedded Universe Project"
        className="w-full h-full border-0"
        allow="fullscreen; accelerometer; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
      />
    </div>
  );
}