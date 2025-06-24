import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Settings, User as UserIcon, Zap } from "lucide-react";
import type { User } from "@shared/schema";

interface ProfileModalProps {
  user: User;
  children: React.ReactNode;
}

export default function ProfileModal({ user, children }: ProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getTokenUsagePercentage = () => {
    if (user.tokenQuota === 0) return 0;
    return Math.min((user.tokenUsed / user.tokenQuota) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getTokenUsagePercentage();
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "warning";
    return "default";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            View your account information and token usage
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Avatar and Basic Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profileImageUrl || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.email}
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
                {user.isAdmin && (
                  <Badge variant="destructive">Admin</Badge>
                )}
                {user.emailVerified && (
                  <Badge variant="outline">Verified</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Token Usage Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Token Usage</h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {user.tokenUsed.toLocaleString()}</span>
                <span>Quota: {user.tokenQuota.toLocaleString()}</span>
              </div>
              
              <Progress 
                value={getTokenUsagePercentage()} 
                className="h-2"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{getTokenUsagePercentage().toFixed(1)}% used</span>
                <span>
                  {user.tokenQuota > user.tokenUsed 
                    ? `${(user.tokenQuota - user.tokenUsed).toLocaleString()} remaining`
                    : "Quota exceeded"
                  }
                </span>
              </div>
              
              {user.tokenUsed >= user.tokenQuota && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    You have exceeded your token quota. Contact an administrator to increase your limit.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3">
            <h4 className="font-medium">Account Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{new Date(user.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}