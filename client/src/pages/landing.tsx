import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Upload, Brain, History } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
          </div>
          <Button onClick={handleLogin}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Your Intelligent AI Assistant
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Chat with AI, upload documents and images for analysis, and keep track of your conversation history - all in one powerful interface.
          </p>
          <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-3">
            Get Started
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mx-auto" />
              <CardTitle className="text-center">Smart Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Engage in natural conversations with our advanced AI assistant powered by Claude.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Upload className="h-12 w-12 text-primary mx-auto" />
              <CardTitle className="text-center">File Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Upload documents, spreadsheets, and images for AI analysis and insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-12 w-12 text-primary mx-auto" />
              <CardTitle className="text-center">Context Awareness</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                AI remembers your conversation history to provide contextual responses.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <History className="h-12 w-12 text-primary mx-auto" />
              <CardTitle className="text-center">Conversation History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Access and manage all your past conversations in one organized place.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 AI Assistant. Powered by Claude AI.</p>
        </div>
      </footer>
    </div>
  );
}
