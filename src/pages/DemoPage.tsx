import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export function DemoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <h1 className="text-4xl font-bold mb-4">Legacy Demo Page</h1>
      <p className="text-muted-foreground mb-8">
        This page is kept for reference. The main application is now the Conductor dashboard.
      </p>
      <Button asChild>
        <Link to="/">Go to Conductor Dashboard</Link>
      </Button>
    </div>
  );
}