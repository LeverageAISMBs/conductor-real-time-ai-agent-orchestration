import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Toaster, toast } from 'sonner';
import { queryVectorize, VectorizeQueryResult } from '@/lib/vectorize-proxy';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Database } from 'lucide-react';
export function IntegrationsPage() {
  const [vectorizeQuery, setVectorizeQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [vectorizeResults, setVectorizeResults] = useState<VectorizeQueryResult | null>(null);
  const [isVectorizeLoading, setIsVectorizeLoading] = useState(false);
  const handleVectorizeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vectorizeQuery.trim()) {
      toast.warning('Please enter a query.');
      return;
    }
    setIsVectorizeLoading(true);
    setVectorizeResults(null);
    const res = await queryVectorize(vectorizeQuery, topK);
    if (res.success && res.data) {
      setVectorizeResults(res.data);
      toast.success('Query successful!');
    } else {
      toast.error(res.error || 'Failed to query Vectorize index.');
    }
    setIsVectorizeLoading(false);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-display">Integrations</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Configure and test your Vectorize and R2 integrations.
          </p>
        </header>
        <div className="grid gap-12 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><GitBranch /></div>
                <div>
                  <CardTitle>Vectorize Semantic Search</CardTitle>
                  <CardDescription>Test querying your Vectorize index.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVectorizeQuery} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="vectorize-query">Query</Label>
                  <Input
                    id="vectorize-query"
                    placeholder="e.g., What are durable objects?"
                    value={vectorizeQuery}
                    onChange={(e) => setVectorizeQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="top-k">Top K Results: {topK}</Label>
                  <Slider
                    id="top-k"
                    min={1}
                    max={10}
                    step={1}
                    value={[topK]}
                    onValueChange={(value) => setTopK(value[0])}
                  />
                </div>
                <Button type="submit" disabled={isVectorizeLoading}>
                  {isVectorizeLoading ? 'Querying...' : 'Query Index'}
                </Button>
              </form>
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Results:</h4>
                <div className="p-4 border rounded-md min-h-[150px] bg-muted/50">
                  {isVectorizeLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : vectorizeResults ? (
                    vectorizeResults.matches.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {vectorizeResults.matches.map((match) => (
                          <li key={match.id} className="p-2 border-b">
                            <p><strong>ID:</strong> {match.id}</p>
                            <p><strong>Score:</strong> {match.score.toFixed(4)}</p>
                            {match.metadata && <pre className="mt-1 text-xs bg-background p-2 rounded"><code>{JSON.stringify(match.metadata, null, 2)}</code></pre>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No matches found.</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Results will appear here.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><Database /></div>
                <div>
                  <CardTitle>R2 Message History</CardTitle>
                  <CardDescription>Browse messages stored in your R2 bucket (coming soon).</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center center-col h-64">
              <p className="text-muted-foreground">R2 browser functionality is planned for a future phase.</p>
              <Button disabled className="mt-4">Browse R2 Bucket</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
}