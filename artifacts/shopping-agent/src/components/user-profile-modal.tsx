import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, MapPin, Save } from "lucide-react";

export interface UserProfile {
  name: string;
  email: string;
  city: string;
}

const STORAGE_KEY = "goval_user_profile";

export function loadUserProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as UserProfile;
  } catch {}
  return { name: "", email: "", city: "" };
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getUserInitials(name: string): string {
  if (!name.trim()) return "U";
  return name
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (profile: UserProfile) => void;
}

export function UserProfileModal({ open, onOpenChange, onSave }: UserProfileModalProps) {
  const [form, setForm] = useState<UserProfile>({ name: "", email: "", city: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(loadUserProfile());
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    saveUserProfile(form);
    setSaved(true);
    onSave?.(form);
    setTimeout(() => {
      onOpenChange(false);
      setSaved(false);
    }, 800);
  };

  const initials = getUserInitials(form.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Your Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
            {initials}
          </div>
          <p className="text-sm text-muted-foreground -mt-1">
            {form.name ? `Hi, ${form.name.split(" ")[0]}!` : "Set up your profile"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="flex items-center gap-1.5 text-sm">
              <User className="h-3.5 w-3.5" /> Name
            </Label>
            <Input
              id="profile-name"
              placeholder="Your full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input
              id="profile-email"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              disabled
              className="bg-muted text-muted-foreground select-none cursor-not-allowed opacity-80"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-city" className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5" /> City
            </Label>
            <Input
              id="profile-city"
              placeholder="e.g. Mumbai, Delhi, Bangalore"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            {saved ? "Saved!" : <><Save className="h-3.5 w-3.5" /> Save Profile</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
