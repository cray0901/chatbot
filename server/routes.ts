import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes, isAuthenticated, isAdmin } from "./auth";
import { insertConversationSchema, insertMessageSchema, insertAdminConfigSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
// Dynamic imports will be used for document processing modules

// Qwen API client using OpenAI-compatible interface  
const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || "",
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
});

// DeepSeek API client as fallback
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com/v1",
});

// OpenAI API client as secondary fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Document processing function with dynamic imports
async function processDocument(filePath: string, mimeType: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    
    switch (mimeType) {
      case 'application/pdf':
        const pdfParse = await import('pdf-parse');
        const pdfData = await pdfParse.default(buffer);
        return pdfData.text;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const mammoth = await import('mammoth');
        const docxResult = await mammoth.extractRawText({ buffer });
        return docxResult.value;
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let excelText = '';
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(sheet);
          excelText += `Sheet: ${sheetName}\n${csvData}\n\n`;
        });
        return excelText;
        
      case 'text/plain':
        return buffer.toString('utf-8');
        
      default:
        return `[File: ${mimeType}]`;
    }
  } catch (error) {
    console.error(`Error processing document:`, error);
    return `[Error processing file: ${error}]`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes and middleware
  setupAuthRoutes(app);

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        userId,
      });
      
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      const conversation = await storage.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      await storage.deleteConversation(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      // Verify user owns the conversation
      const conversation = await storage.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, upload.array('files'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      // Verify user owns the conversation
      const conversation = await storage.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const { content, imageData } = req.body;
      const files = req.files as Express.Multer.File[];
      
      // Process attachments and image data
      let attachments = null;
      let processedImages: Array<{filename: string, base64: string, mimeType: string}> = [];
      let documentContent = '';
      
      // Handle uploaded files
      if (files && files.length > 0) {
        attachments = files.map(file => ({
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        }));

        // Process files for AI analysis
        for (const file of files) {
          if (file.mimetype.startsWith('image/')) {
            try {
              const imageBuffer = fs.readFileSync(file.path);
              const base64Image = imageBuffer.toString('base64');
              processedImages.push({
                filename: file.originalname,
                base64: base64Image,
                mimeType: file.mimetype
              });
            } catch (error) {
              console.error(`Error processing image ${file.originalname}:`, error);
            }
          } else {
            // Process documents (PDF, Word, Excel, Text)
            try {
              const extractedText = await processDocument(file.path, file.mimetype);
              if (extractedText && extractedText.trim()) {
                documentContent += `\n\n--- Content from ${file.originalname} ---\n${extractedText}\n`;
              }
            } catch (error) {
              console.error(`Error processing document ${file.originalname}:`, error);
              documentContent += `\n\n--- Error processing ${file.originalname}: ${error} ---\n`;
            }
          }
        }
      }

      // Handle base64 image data from clipboard/paste
      if (imageData && Array.isArray(imageData)) {
        for (const imgData of imageData) {
          if (imgData.base64 && imgData.mimeType) {
            processedImages.push({
              filename: imgData.filename || 'pasted-image.png',
              base64: imgData.base64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: imgData.mimeType
            });
          }
        }
      }

      // Save user message
      const userMessage = await storage.addMessage({
        conversationId,
        content,
        role: 'user',
        attachments,
      });

      // Get conversation history for context
      const allMessages = await storage.getConversationMessages(conversationId);
      
      // Prepare messages for AI API with multimodal support
      const chatMessages: Array<{role: "user" | "assistant", content: any}> = [];
      
      for (const msg of allMessages) {
        if (msg.role === 'user') {
          let messageContent: any = msg.content;
          
          // Check if this is the current message with images or documents
          if (msg.id === userMessage.id && (processedImages.length > 0 || documentContent)) {
            if (processedImages.length > 0) {
              // Create multimodal content for vision-capable models
              const contentParts: any[] = [
                {
                  type: "text",
                  text: (msg.content || "Please analyze these images:") + documentContent
                }
              ];
              
              // Add images for vision analysis
              for (const image of processedImages) {
                contentParts.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mimeType};base64,${image.base64}`
                  }
                });
              }
              
              messageContent = contentParts;
            } else if (documentContent) {
              // Text-only message with document content
              messageContent = (msg.content || "Please analyze this document:") + documentContent;
            }
          } else if (msg.attachments) {
            // Handle file attachments by adding context to message
            const attachmentArray = Array.isArray(msg.attachments) ? msg.attachments : [msg.attachments];
            const attachmentInfo = attachmentArray.map(att => 
              `[Attached file: ${att.filename} (${att.mimetype})]`
            ).join(' ');
            messageContent = `${msg.content} ${attachmentInfo}`;
          }
          
          chatMessages.push({
            role: "user" as const,
            content: messageContent
          });
        } else if (msg.role === 'assistant') {
          chatMessages.push({
            role: "assistant" as const,
            content: msg.content
          });
        }
      }

      // Get AI response - try Qwen first, then fallback to DeepSeek and OpenAI
      let aiContent = "I apologize, but I couldn't generate a response at the moment.";
      let aiProvider = "none";

      try {
        // Try Qwen first with vision support
        if (process.env.QWEN_API_KEY) {
          // Use vision-capable model if images are present
          const modelToUse = processedImages.length > 0 ? 'qwen-vl-plus' : 'qwen-plus';
          
          const response = await qwen.chat.completions.create({
            model: modelToUse,
            max_tokens: 2048,
            messages: [
              {
                role: "system" as const,
                content: "You are a helpful AI assistant with vision capabilities. When analyzing images, provide detailed descriptions including objects, text, colors, composition, and any relevant insights. For documents, extract and summarize key information. Be thorough and specific in your analysis."
              },
              ...chatMessages
            ],
            temperature: 0.7,
          });

          aiContent = response.choices[0]?.message?.content || aiContent;
          aiProvider = "qwen";
        }
      } catch (qwenError: any) {
        console.error("Qwen API error:", qwenError.message);
        
        // Try DeepSeek as first fallback
        if (process.env.DEEPSEEK_API_KEY) {
          try {
            const response = await deepseek.chat.completions.create({
              model: 'deepseek-chat',
              max_tokens: 2048,
              messages: [
                {
                  role: "system" as const,
                  content: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses. When analyzing files, be thorough and specific in your analysis."
                },
                ...chatMessages
              ] as Array<{role: "system" | "user" | "assistant", content: string}>,
              temperature: 0.7,
            });

            aiContent = response.choices[0]?.message?.content || aiContent;
            aiProvider = "deepseek";
          } catch (deepseekError: any) {
            console.error("DeepSeek API error:", deepseekError.message);
            
            // Try OpenAI as final fallback
            if (process.env.OPENAI_API_KEY) {
              try {
                const response = await openai.chat.completions.create({
                  model: 'gpt-4o',
                  max_tokens: 2048,
                  messages: [
                    {
                      role: "system" as const,
                      content: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses. When analyzing files, be thorough and specific in your analysis."
                    },
                    ...chatMessages
                  ],
                  temperature: 0.7,
                });

                aiContent = response.choices[0]?.message?.content || aiContent;
                aiProvider = "openai";
              } catch (openaiError: any) {
                console.error("OpenAI API error:", openaiError.message);
                aiContent = "All AI services are currently unavailable. Please check your API key configurations.";
              }
            } else {
              aiContent = "Qwen and DeepSeek APIs failed. Please check your API keys or try again later.";
            }
          }
        } else {
          // Try OpenAI directly if DeepSeek not available
          if (process.env.OPENAI_API_KEY) {
            try {
              const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                max_tokens: 2048,
                messages: [
                  {
                    role: "system" as const,
                    content: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses. When analyzing files, be thorough and specific in your analysis."
                  },
                  ...chatMessages
                ],
                temperature: 0.7,
              });

              aiContent = response.choices[0]?.message?.content || aiContent;
              aiProvider = "openai";
            } catch (openaiError: any) {
              console.error("OpenAI API error:", openaiError.message);
              aiContent = "Qwen API failed and no valid fallback available. Please check your API keys.";
            }
          } else {
            aiContent = "Qwen API failed and no fallback API keys are configured.";
          }
        }
      }

      // Save AI response
      const aiMessage = await storage.addMessage({
        conversationId,
        content: aiContent,
        role: 'assistant',
        attachments: null,
      });

      // Update user token usage (estimate based on response length)
      try {
        const user = req.user as any;
        if (user && user.id) {
          // Rough token estimation: ~4 chars per token for English text
          const estimatedTokens = Math.ceil((content.length + aiContent.length) / 4);
          await storage.updateUserTokenUsage(user.id, estimatedTokens);
        }
      } catch (error) {
        console.error("Error updating token usage:", error);
      }

      // Auto-generate conversation title from first message if needed
      if (conversation.title === 'New Conversation' || conversation.title === 'New Chat') {
        try {
          // Use the first few words of the user's message as title
          const words = content.split(' ').slice(0, 6).join(' ');
          const newTitle = words.length > 50 ? words.substring(0, 47) + '...' : words;
          await storage.updateConversation(conversationId, { title: newTitle });
        } catch (error) {
          console.error("Error updating conversation title:", error);
        }
      }

      // Update conversation timestamp
      await storage.updateConversation(conversationId, {});

      // Clean up uploaded files
      if (files) {
        files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error("Error cleaning up file:", error);
          }
        });
      }

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Admin routes
  app.get('/api/admin/config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const config = await storage.getAdminConfig();
      if (!config) {
        return res.json({
          id: null,
          apiProvider: 'openai',
          apiKey: '',
          apiEndpoint: '',
          modelName: 'gpt-4',
          defaultTokenQuota: 10000,
          isActive: false,
        });
      }
      
      // Don't expose the actual API key
      res.json({
        ...config,
        apiKey: config.apiKey ? '***hidden***' : '',
      });
    } catch (error) {
      console.error("Error fetching admin config:", error);
      res.status(500).json({ message: "Failed to fetch admin configuration" });
    }
  });

  app.post('/api/admin/config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertAdminConfigSchema.parse(req.body);
      const config = await storage.updateAdminConfig(validatedData);
      
      // Don't expose the actual API key in response
      res.json({
        ...config,
        apiKey: config.apiKey ? '***hidden***' : '',
      });
    } catch (error) {
      console.error("Error updating admin config:", error);
      res.status(400).json({ message: "Failed to update admin configuration" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't expose passwords or sensitive tokens
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        tokenQuota: user.tokenQuota,
        tokenUsed: user.tokenUsed,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const user = await storage.toggleUserStatus(userId, isActive);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        tokenQuota: user.tokenQuota,
        tokenUsed: user.tokenUsed,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.patch('/api/admin/users/:id/quota', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { tokenQuota } = req.body;
      
      if (!Number.isInteger(tokenQuota) || tokenQuota < 0) {
        return res.status(400).json({ message: "tokenQuota must be a non-negative integer" });
      }
      
      const user = await storage.updateUserQuota(userId, tokenQuota);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        tokenQuota: user.tokenQuota,
        tokenUsed: user.tokenUsed,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      console.error("Error updating user quota:", error);
      res.status(500).json({ message: "Failed to update user quota" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
