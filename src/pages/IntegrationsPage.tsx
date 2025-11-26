import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { queryVectorize, VectorizeQueryResult } from '@/lib/vectorize-proxy';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Database, Search, BarChart3 } from 'lucide-react';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '../../worker/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
interface R2Object {
  key: string;
  size: number;
  uploaded: string;
}
interface MetricsData {
  totalSessions: number;
  timestamp: number;
}
export function IntegrationsPage() {
  const [vectorizeQuery, setVectorizeQuery] = useState('');
  const [vectorizeInsertContent, setVectorizeInsertContent] = useState('');
  const [topK, setTopK] = useState(5);
  const [vectorizeResults, setVectorizeResults] = useState<VectorizeQueryResult | null>(null);
  const [isVectorizeLoading, setIsVectorizeLoading] = useState(false);
  const [isVectorizeInserting, setIsVectorizeInserting] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [r2Objects, setR2Objects] = useState<R2Object[]>([]);
  const [isR2Loading, setIsR2Loading] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await chatService.listSessions();
        if (res.success && res.data) {
          setSessions(res.data);
          if (res.data.length > 0) {
            setSelectedSession(res.data[0].id);
          }
        } else {
          throw new Error(res.error || 'Failed to fetch sessions');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
    };
    fetchInitialData();
  }, []);
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        if (data.success) {
          setMetrics(prev => [...prev.slice(-9), data.data]); // Keep last 10 data points
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // Fetch every 15 seconds
    return () => clearInterval(interval);
  }, []);
  const handleVectorizeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vectorizeQuery.trim()) {
      toast.warning('Please enter a query.');
      return;
    }
    setIsVectorizeLoading(true);
    setVectorizeResults(null);
    try {
      const res = await queryVectorize(vectorizeQuery, topK);
      if (res.success && res.data) {
        setVectorizeResults(res.data);
        toast.success('Query successful!');
      } else {
        throw new Error(res.error || 'Failed to query Vectorize index.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsVectorizeLoading(false);
    }
  };
  const handleListR2Objects = async () => {
    if (!selectedSession) {
      toast.warning('Please select a session.');
      return;
    }
    setIsR2Loading(true);
    setR2Objects([]);
    try {
      const response = await fetch(`/api/r2-list?sessionId=${selectedSession}`);
      const data = await response.json();
      if (data.success) {
        setR2Objects(data.data.files);
        toast.success(`Found ${data.data.files.length} objects.`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to list R2 objects.');
    } finally {
      setIsR2Loading(false);
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold font-display">Integrations</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Configure, test, and monitor your Vectorize and R2 integrations.
          </p>
        </motion.header>
        <div className="space-y-12">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><BarChart3 /></div>
                <div>
                  <CardTitle>Live System Metrics</CardTitle>
                  <CardDescription>Real-time session count from the App Controller.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalSessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-12 lg:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary"><GitBranch /></div>
                  <div>
                    <CardTitle>Vectorize Semantic Search</CardTitle>
                    <CardDescription>Query your index for semantic matches.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-6">
                <form onSubmit={handleVectorizeQuery} className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Query Index</h3>
                  <div className="space-y-2">
                    <Label htmlFor="vectorize-query">Query</Label>
                    <Input id="vectorize-query" placeholder="e.g., What are durable objects?" value={vectorizeQuery} onChange={(e) => setVectorizeQuery(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="top-k">Top K Results: {topK}</Label>
                    <Slider id="top-k" min={1} max={10} step={1} value={[topK]} onValueChange={(value) => setTopK(value[0])} />
                  </div>
                  <Button type="submit" disabled={isVectorizeLoading}>
                    {isVectorizeLoading ? 'Querying...' : 'Query'}
                  </Button>
                </form>
                <div className="mt-2 flex-1">
                  <h4 className="font-semibold mb-2">Query Results:</h4>
                  <div className="p-4 border rounded-md min-h-[200px] bg-muted/50 overflow-auto">
                    {isVectorizeLoading ? (
                      <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                    ) : vectorizeResults ? (
                      vectorizeResults.matches.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          <AnimatePresence>
                            {vectorizeResults.matches.map((match, i) => (
                              <motion.li
                                key={match.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className="p-2 border-b"
                              >
                                <p><strong>ID:</strong> {match.id}</p>
                                <p><strong>Score:</strong> {match.score.toFixed(4)}</p>
                                {match.metadata && <pre className="mt-1 text-xs bg-background p-2 rounded"><code>{JSON.stringify(match.metadata, null, 2)}</code></pre>}
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      ) : <p className="text-muted-foreground">No matches found.</p>
                    ) : <p className="text-muted-foreground">Results will appear here.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary"><Database /></div>
                  <div>
                    <CardTitle>R2 Message History</CardTitle>
                    <CardDescription>Browse messages stored in your R2 bucket.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleListR2Objects} disabled={isR2Loading || !selectedSession}>
                    <Search className="h-4 w-4 mr-2" /> List Files
                  </Button>
                </div>
                <div className="border rounded-md flex-1 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead className="w-[100px]">Size</TableHead>
                        <TableHead className="w-[180px]">Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isR2Loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          </TableRow>
                        ))
                      ) : r2Objects.length > 0 ? (
                        r2Objects.map(obj => (
                          <TableRow key={obj.key}>
                            <TableCell className="font-medium truncate" title={obj.key}>{obj.key.replace(`messages/${selectedSession}/`, '')}</TableCell>
                            <TableCell>{(obj.size / 1024).toFixed(2)} KB</TableCell>
                            <TableCell>{new Date(obj.uploaded).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No objects found for this session.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
}