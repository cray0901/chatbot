import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CheckCheck, FileText, Image as ImageIcon, Bot, Copy, Download } from "lucide-react";
import TypingIndicator from "./typing-indicator";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MessageContainerProps {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
}

export default function MessageContainer({ messages, isLoading, isTyping }: MessageContainerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadAsText = (text: string, filename: string = "ai-response.txt") => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Response saved as text file",
    });
  };

  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderAttachment = (attachment: any) => {
    if (attachment.mimetype?.startsWith('image/')) {
      return (
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{attachment.filename}</p>
              <p className="text-xs opacity-80">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{attachment.filename}</p>
            <p className="text-xs opacity-80">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="flex justify-center py-12">
            <div className="max-w-md text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to AI Assistant</h3>
              <p className="text-muted-foreground text-sm">
                I'm here to help you with questions, analysis, and problem-solving. 
                You can also upload documents and images for me to analyze.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[70%]">
              <div
                className={`
                  p-4 rounded-2xl 
                  ${message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted border rounded-bl-md'
                  }
                `}
              >
                {/* Attachments */}
                {message.attachments && (
                  <div className="mb-2">
                    {Array.isArray(message.attachments) 
                      ? message.attachments.map((attachment: any, index: number) => (
                          <div key={index}>
                            {renderAttachment(attachment)}
                          </div>
                        ))
                      : renderAttachment(message.attachments)
                    }
                  </div>
                )}
                
                {/* Message Content */}
                <p className={`text-sm whitespace-pre-wrap ${
                  message.role === 'user' ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                  {message.content}
                </p>

                {/* Copy and Download buttons for AI responses */}
                {message.role === 'assistant' && message.content && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.content)}
                      className="h-8 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadAsText(message.content, `ai-response-${Date.now()}.txt`)}
                      className="h-8 px-2 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Message Footer */}
              <div className={`flex items-center gap-2 mt-1 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(message.createdAt?.toString() || new Date().toISOString())}
                </span>
                {message.role === 'user' && (
                  <CheckCheck className="h-3 w-3 text-green-500" />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
