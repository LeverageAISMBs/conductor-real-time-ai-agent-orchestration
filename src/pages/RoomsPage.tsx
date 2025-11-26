import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Search } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '~/worker/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export function RoomsPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const loadSessions = async () => {
    setIsLoading(true);
    const res = await chatService.listSessions();
    if (res.success && res.data) {
      setSessions(res.data);
    } else {
      toast.error('Failed to load sessions.');
    }
    setIsLoading(false);
  };
  useEffect(() => {
    loadSessions();
  }, []);
  const handleNewRoom = async () => {
    const res = await chatService.createSession();
    if (res.success && res.data) {
      navigate(`/rooms/${res.data.sessionId}`);
    } else {
      toast.error('Failed to create a new room.');
    }
  };
  const handleDelete = async (sessionId: string) => {
    const res = await chatService.deleteSession(sessionId);
    if (res.success) {
      toast.success('Session deleted.');
      loadSessions();
    } else {
      toast.error('Failed to delete session.');
    }
  };
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold font-display">Rooms</h1>
            <p className="text-lg text-muted-foreground mt-2">Manage all your agent conversations.</p>
          </div>
          <Button onClick={handleNewRoom} className="btn-gradient">
            <PlusCircle className="mr-2 h-5 w-5" /> New Room
          </Button>
        </header>
        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <Card key={session.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="truncate cursor-pointer" onClick={() => navigate(`/rooms/${session.id}`)}>
                    {session.title}
                  </CardTitle>
                  <CardDescription>
                    Last active: {new Date(session.lastActive).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/rooms/${session.id}`)}>
                    Open
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this session and its messages.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(session.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <p className="text-muted-foreground">No rooms found. Create one to get started!</p>
            </div>
          )}
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
}