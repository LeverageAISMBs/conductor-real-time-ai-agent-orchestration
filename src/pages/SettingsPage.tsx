import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { Copy } from 'lucide-react';
// Mock JWT generation for demo purposes
const generateDemoJWT = () => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: 'user-123', name: 'Demo User', iat: Math.floor(Date.now() / 1000) };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signature = 'demo-signature-for-ui-only'; // This is NOT a real signature
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};
export function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('demo-api-key') || 'conductor_demo_sk_...');
  const [jwt, setJwt] = useState(localStorage.getItem('demo-jwt') || generateDemoJWT());
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
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-display">Settings & Authentication</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage authentication methods for your agents.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Authentication Examples</CardTitle>
            <CardDescription>
              Use API Keys for server-to-server communication and JWT for user-facing applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="api-key">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="api-key">API Key</TabsTrigger>
                <TabsTrigger value="jwt">JWT</TabsTrigger>
              </TabsList>
              <TabsContent value="api-key" className="mt-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Simple, stateless, and ideal for server-to-server communication between your agents and the Conductor API.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Demo API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input id="api-key" type="text" value={apiKey} onChange={handleApiKeyChange} />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <Label className="text-xs font-mono">Example cURL</Label>
                    <pre className="text-sm overflow-x-auto mt-2">
                      <code>
                        {`curl -X POST https://your-worker/api/chat/... \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, agent!"}'`}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="jwt" className="mt-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    More secure and flexible, ideal for user-specific sessions or microservices. Can carry user context and has an expiration.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="jwt">Demo JWT</Label>
                    <div className="flex items-center gap-2">
                      <Input id="jwt" type="text" value={jwt} onChange={handleJwtChange} />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(jwt)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleGenerateJwt}>Generate New Demo JWT</Button>
                  <div className="p-4 bg-muted rounded-md">
                    <Label className="text-xs font-mono">Example cURL</Label>
                    <pre className="text-sm overflow-x-auto mt-2">
                      <code>
                        {`curl -X POST https://your-worker/api/chat/... \\
  -H "Authorization: Bearer ${jwt}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, agent!"}'`}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Toaster richColors />
    </div>
  );
}