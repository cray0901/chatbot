import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Paperclip, Send, X, FileText, Image as ImageIcon, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (content: string, files?: FileList) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Process files function for validation and image stream reading
  const processFiles = useCallback(async (files: File[]) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    // Process images to generate preview and prepare for LLM
    const processedFiles = await Promise.all(validFiles.map(async (file) => {
      if (file.type.startsWith('image/')) {
        // Create image preview and prepare for LLM processing
        const reader = new FileReader();
        return new Promise<File>((resolve) => {
          reader.onload = () => {
            // Store the base64 data for LLM processing
            (file as any).base64Data = reader.result;
            resolve(file);
          };
          reader.readAsDataURL(file);
        });
      }
      return file;
    }));

    setSelectedFiles(prev => [...prev, ...processedFiles]);
  }, [toast]);

  // Paste event handler for copy-paste functionality
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Handle image paste from clipboard
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
        
        // Handle file paste from file explorer
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && !file.type.startsWith('image/')) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        await processFiles(files);
        setShowFileUpload(true);
        toast({
          title: "Files pasted",
          description: `${files.length} file(s) added from clipboard`,
        });
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        await processFiles(files);
        setShowFileUpload(true);
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [processFiles, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage && selectedFiles.length === 0) return;
    
    if (selectedFiles.length > 0) {
      const fileList = new DataTransfer();
      selectedFiles.forEach(file => fileList.items.add(file));
      onSendMessage(trimmedMessage || "Please analyze these files", fileList.files);
    } else {
      onSendMessage(trimmedMessage);
    }
    
    setMessage("");
    setSelectedFiles([]);
    setShowFileUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const insertQuickAction = (action: string) => {
    setMessage(action);
    textareaRef.current?.focus();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getImagePreview = (file: File) => {
    if (file.type.startsWith('image/') && (file as any).base64Data) {
      return (
        <img 
          src={(file as any).base64Data} 
          alt={file.name}
          className="w-12 h-12 object-cover rounded border"
        />
      );
    }
    return getFileIcon(file);
  };

  return (
    <div 
      ref={dropZoneRef}
      className={`border-t border-border bg-card p-4 transition-colors ${
        isDragOver ? 'bg-muted/50 border-primary' : ''
      }`}
    >
      {/* Global drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8">
            <Copy className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-center">Drop files here to upload</p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Images will be processed for AI analysis
            </p>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      {showFileUpload && (
        <Card className="mb-4 p-4 border-2 border-dashed border-muted-foreground/25">
          <div className="text-center">
            <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drop files here, paste from clipboard (Ctrl+V), or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Supports: Images (JPEG, PNG, GIF, WebP), PDF, Word, Excel, Text files
              <br />
              <strong>Documents will be read and analyzed by AI</strong>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
          </div>
        </Card>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                {getImagePreview(file)}
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {file.type.startsWith('image/') ? 'Ready for AI analysis' : 'Document'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Shift+Enter for new line, Ctrl+V to paste files)"
              className="min-h-[44px] resize-none pr-12"
              rows={1}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || (!message.trim() && selectedFiles.length === 0)}
          className="h-11"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-muted-foreground">Quick actions:</span>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => insertQuickAction("Analyze this image in detail")}
        >
          Analyze image
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => insertQuickAction("Summarize document")}
        >
          Summarize document
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => insertQuickAction("Extract text from image")}
        >
          Extract text
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => insertQuickAction("Generate report")}
        >
          Generate report
        </Button>
      </div>
    </div>
  );
}