import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Download, 
  Settings, 
  LogOut,
  X
} from "lucide-react";
import { Link } from "wouter";
import type { User, Conversation } from "@shared/schema";

interface SidebarProps {
  user: User;
  conversations: Conversation[];
  currentConversationId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onLogout: () => void;
  isLoading: boolean;
}

export default function Sidebar({
  user,
  conversations,
  currentConversationId,
  isOpen,
  onClose,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onLogout,
  isLoading,
}: SidebarProps) {
  const [hoveredConversation, setHoveredConversation] = useState<number | null>(null);

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const formatTimestamp = (dateString: string | Date | null) => {
    if (!dateString) return "Unknown";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return "Today";
    } else if (diffDays === 2) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={`
      w-80 bg-card border-r border-border flex flex-col transition-transform duration-300 
      lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      fixed lg:relative z-30 h-full
    `}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
          <button 
            className="lg:hidden p-2 hover:bg-accent rounded-lg"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* User Profile */}
        <div className="flex items-center mt-4 p-3 bg-muted rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profileImageUrl || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-accent rounded-lg">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {user.isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          className="w-full" 
          onClick={() => onNewConversation()}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Conversations</h3>
        </div>
        
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    group p-3 rounded-lg cursor-pointer transition-colors
                    ${currentConversationId === conversation.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted'
                    }
                  `}
                  onMouseEnter={() => setHoveredConversation(conversation.id)}
                  onMouseLeave={() => setHoveredConversation(null)}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(conversation.updatedAt || conversation.createdAt || new Date())}
                      </p>
                    </div>
                    {(hoveredConversation === conversation.id || currentConversationId === conversation.id) && (
                      <button
                        className="opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
