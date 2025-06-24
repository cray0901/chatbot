import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/chat/sidebar";
import MessageContainer from "@/components/chat/message-container";
import ChatInput from "@/components/chat/chat-input";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const { id } = useParams<{ id?: string }>();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    id ? parseInt(id) : null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  // Fetch current conversation messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      console.log("Creating conversation with title:", title);
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      console.log("Conversation created:", newConversation);
      // Force refetch conversations to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.refetchQueries({ queryKey: ["/api/conversations"] });
      setCurrentConversationId(newConversation.id);
      window.history.pushState({}, "", `/chat/${newConversation.id}`);
      setIsSidebarOpen(false);
      
      // Show success message
      toast({
        title: "Success",
        description: "New conversation created",
      });
    },
    onError: (error) => {
      console.error("Conversation creation error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to create conversation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, files, imageData }: { 
      conversationId: number; 
      content: string; 
      files?: FileList; 
      imageData?: Array<{filename: string, base64: string, mimeType: string}>
    }) => {
      const formData = new FormData();
      formData.append("content", content);
      
      if (files) {
        Array.from(files).forEach(file => {
          formData.append("files", file);
        });
      }

      if (imageData && imageData.length > 0) {
        formData.append("imageData", JSON.stringify(imageData));
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        if (errorData.quotaExceeded) {
          throw new Error(`QUOTA_EXCEEDED: ${errorData.message}`);
        }
        throw new Error(`${response.status}: ${errorData.message || "Unknown error"}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message.startsWith("QUOTA_EXCEEDED:")) {
        toast({
          title: "Token Quota Exceeded",
          description: error.message.replace("QUOTA_EXCEEDED: ", ""),
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error", 
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        window.history.pushState({}, "", "/");
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleNewConversation = () => {
    createConversationMutation.mutate("New Conversation");
  };

  const handleSelectConversation = (conversationId: number) => {
    setCurrentConversationId(conversationId);
    setIsSidebarOpen(false);
    window.history.pushState({}, "", `/chat/${conversationId}`);
  };

  // Function to handle message sending with image processing
  const handleMessageWithImages = async (conversationId: number, content: string, files?: FileList) => {
    // Extract image data from files for AI processing
    let imageData: Array<{filename: string, base64: string, mimeType: string}> = [];
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          // Check if the file already has base64 data from clipboard processing
          const base64Data = (file as any).base64Data;
          if (base64Data) {
            imageData.push({
              filename: file.name,
              base64: base64Data.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: file.type
            });
          } else {
            // Read the file as base64
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.replace(/^data:image\/\w+;base64,/, ''));
              };
              reader.readAsDataURL(file);
            });
            
            imageData.push({
              filename: file.name,
              base64,
              mimeType: file.type
            });
          }
        }
      }
    }

    // Send message with image data
    sendMessageMutation.mutate({ 
      conversationId, 
      content, 
      files,
      imageData: imageData.length > 0 ? imageData : undefined
    } as any);
  };

  const handleSendMessage = (content: string, files?: FileList) => {
    if (!currentConversationId) {
      // Create new conversation first with message as title
      const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
      
      // First create conversation, then send message
      apiRequest("POST", "/api/conversations", { title })
        .then(response => response.json())
        .then((newConversation: Conversation) => {
          setCurrentConversationId(newConversation.id);
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          window.history.pushState({}, "", `/chat/${newConversation.id}`);
          
          // Now send the message with image processing
          handleMessageWithImages(newConversation.id, content, files);
        })
        .catch(error => {
          console.error("Failed to create conversation:", error);
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
        });
    } else {
      handleMessageWithImages(currentConversationId, content, files);
    }
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate(conversationId);
  };

  const handleLogout = () => {
    // Simple redirect to logout endpoint
    window.location.href = "/api/logout";
  };

  // Update conversation ID when URL params change
  useEffect(() => {
    if (id) {
      setCurrentConversationId(parseInt(id));
    }
  }, [id]);

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        user={user!}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
        isLoading={conversationsLoading}
      />

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden p-2 hover:bg-accent rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-medium text-foreground">AI Assistant</h2>
                  <p className="text-xs text-muted-foreground">Online • Powered by Claude</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <MessageContainer
          messages={messages}
          isLoading={messagesLoading}
          isTyping={sendMessageMutation.isPending}
        />

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
