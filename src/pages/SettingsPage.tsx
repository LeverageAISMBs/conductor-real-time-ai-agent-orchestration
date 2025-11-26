import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { Copy, KeyRound, ShieldCheck } from 'lucide-react';
// Mock JWT generation for demo purposes
const generateDemoJWT = () => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: 'user-123', name: 'Demo User', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (15 * 60) }; // 15 min expiry
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signature = 'demo-signature-for-ui-only'; // This is NOT a real signature
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};
export function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('demo-api-key') || 'conductor_demo_sk_...');
  const [jwt, setJwt] = useState(localStorage.getItem('demo-jwt') || generateDemoJWT());
  const [activeTab, setActiveTab] = useState('api-key');
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    localStorage.setItem('demo-api-key', e.target.value);
  };
  const handleJwtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJwt(e.target.value);
    localStorage.setItem('demo-jwt', e.target.value);
  };
  const handleGenerateJwt = () => {
    const newJwt = generateDemoJWT();
    setJwt(newJwt);
    localStorage.setItem('demo-jwt', newJwt);
    toast.success('New demo JWT generated!');
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  const handleTestAuth = async () => {
    const token = activeTab === 'api-key' ? apiKey : jwt;
    try {
      const response = await fetch('/api/echo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Authentication successful!', { description: data.message });
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error('Authentication failed', { description: message });
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-display">Settings & Authentication</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage and test authentication methods for your agents.
          </p>
        </header>
        <div className="grid gap-12 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Tokens</CardTitle>
              <CardDescription>
                Use these demo tokens to test authenticated endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="api-key">API Key</TabsTrigger>
                  <TabsTrigger value="jwt">JWT</TabsTrigger>
                </TabsList>
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <TabsContent value="api-key" className="mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="api-key">Demo API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input id="api-key" type="text" value={apiKey} onChange={handleApiKeyChange} />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)}><Copy className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="jwt" className="mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="jwt">Demo JWT</Label>
                        <div className="flex items-center gap-2">
                          <Input id="jwt" type="text" value={jwt} onChange={handleJwtChange} />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(jwt)}><Copy className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <Button onClick={handleGenerateJwt}>Generate New Demo JWT</Button>
                    </div>
                  </TabsContent>
                </motion.div>
              </Tabs>
              <div className="mt-6 border-t pt-6">
                <Button onClick={handleTestAuth} className="w-full btn-gradient">Test Authentication</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
              <CardDescription>Recommendations for securing your agent system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="p-3 bg-primary/10 rounded-lg text-primary flex-shrink-0"><KeyRound /></div>
                <div>
                  <h3 className="font-semibold">API Keys for Server-to-Server</h3>
                  <p className="text-sm text-muted-foreground">
                    API Keys are simple, stateless, and ideal for agent-to-agent or backend service communication. Store them securely as secrets in your Worker environment.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="p-3 bg-accent/10 rounded-lg text-accent-foreground"><ShieldCheck /></div>
                <div>
                  <h3 className="font-semibold">JWT for User Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    JWTs are perfect for user-facing applications. They are stateful, can carry user-specific claims, and have a built-in expiration.
                  </p>
                  <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Use short-lived tokens (e.g., 15 minutes).</li>
                    <li>Implement a refresh token flow to maintain sessions securely.</li>
                    <li>Store JWTs in secure, HTTP-only cookies on the client.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
}