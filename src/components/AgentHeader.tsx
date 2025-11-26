import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Bot } from 'lucide-react';
import { MODELS } from '@/lib/chat';
import { SessionInfo } from '~/worker/types';
interface AgentHeaderProps {
  session: SessionInfo | null;
  currentModel: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
  onClearChat: () => void;
}
export function AgentHeader({
  session,
  currentModel,
  onModelChange,
  onNewChat,
  onClearChat,
}: AgentHeaderProps) {
  return (
    <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card">
      <div className="flex items-center gap-3 flex-grow">
        <div className="w-10 h-10 rounded-lg bg-gradient-primary center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-foreground truncate" title={session?.title}>
            {session?.title || 'New Conversation'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {session ? `Last active: ${new Date(session.lastActive).toLocaleString()}` : 'Start typing to begin'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select value={currentModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onNewChat} title="New Chat">
          <PlusCircle className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onClearChat} title="Clear Conversation">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}