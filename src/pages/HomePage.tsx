import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  PlusCircle,
  MessageSquare,
  LayoutGrid,
  Settings,
  GitBranch,
  BarChart,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '../../worker/types';
import { Skeleton } from '@/components/ui/skeleton';
export function HomePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0 });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [sessionsRes, statsRes] = await Promise.all([
          chatService.listSessions(),
          fetch('/api/sessions/stats').then(res => res.json())
        ]);
        if (sessionsRes.success && sessionsRes.data) {
          setSessions(sessionsRes.data);
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        toast.error('Failed to load dashboard data.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  const handleNewRoom = async () => {
    const res = await chatService.createSession();
    if (res.success && res.data) {
      navigate(`/rooms/${res.data.sessionId}`);
    } else {
      toast.error('Failed to create a new room.');
    }
  };
  const StatCard = ({ icon, title, value, isLoading }: { icon: React.ReactNode, title: string, value: string | number, isLoading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-block p-4 bg-gradient-primary rounded-2xl mb-6 floating">
              <Bot className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-balance">
              Conductor
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Orchestrate, monitor, and manage real-time multi-agent conversations on Cloudflare's edge.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" className="btn-gradient" onClick={handleNewRoom}>
                <PlusCircle className="mr-2 h-5 w-5" /> New Room
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/rooms"><LayoutGrid className="mr-2 h-5 w-5" /> View All Rooms</Link>
              </Button>
            </div>
          </motion.div>
          <div className="mt-16 md:mt-24">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <StatCard icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />} title="Active Rooms" value={stats.totalSessions} isLoading={isLoading} />
              <StatCard icon={<BarChart className="h-4 w-4 text-muted-foreground" />} title="Agents Online" value="1" isLoading={isLoading} />
              <StatCard icon={<Clock className="h-4 w-4 text-muted-foreground" />} title="Avg. Response Time" value="~0.5s" isLoading={isLoading} />
            </div>
          </div>
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-6">Quick Access</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <QuickAccessCard title="Integrations" icon={<GitBranch />} to="/integrations" description="Connect Vectorize & R2" />
              <QuickAccessCard title="Settings" icon={<Settings />} to="/settings" description="Configure auth & preferences" />
            </div>
          </div>
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-6">Recent Activity</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)
              ) : sessions.length > 0 ? (
                sessions.slice(0, 3).map(session => (
                  <Link to={`/rooms/${session.id}`} key={session.id} className="block">
                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                      <CardHeader>
                        <CardTitle className="truncate">{session.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center">No recent sessions found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center py-8 border-t">
        <p className="text-sm text-muted-foreground">
          AI usage has a cross-app rate limit; request volume may be limited. See docs or quota in Settings.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Built with ❤️ at Cloudflare
        </p>
      </footer>
      <Toaster richColors />
    </div>
  );
}
const QuickAccessCard = ({ title, icon, to, description }: { title: string, icon: React.ReactNode, to: string, description: string }) => (
  <Link to={to}>
    <Card className="p-6 flex items-center gap-4 hover:bg-accent transition-colors">
      <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  </Link>
);