"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, Mail, UserX, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { deleteAccount, updateSettings } from "@/services/api";
import { toast } from "sonner";

export default function GeneralSettings() {
    const { user, setUser, logout } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [password, setPassword] = useState("");

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        setLoading(true);
        try {
            const updated = await updateSettings(Object.fromEntries(formData));
            setUser(updated);
            toast.success("Profile updated");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!password) return toast.error("Password required");
        try {
            await deleteAccount(password);
            toast.success("Account scheduled for deletion (7-day grace period)");
            setTimeout(logout, 2000);
        } catch (error) {
            toast.error("Verification failed");
        }
    };

    return (
        <div className="space-y-12">
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Account Profile</h2>
                </div>
                <form onSubmit={handleUpdate} className="max-w-md space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Display Name</label>
                        <Input name="name" defaultValue={user?.name} required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <Input name="email" defaultValue={user?.email} required type="email" />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </section>

            <section className="space-y-6 pt-12 border-t border-border/50">
                <div className="flex items-center gap-3">
                    <UserX className="w-6 h-6 text-destructive" />
                    <h2 className="text-2xl font-bold text-destructive">Danger Zone</h2>
                </div>
                <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-3xl space-y-4">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
                        <div className="space-y-1">
                            <p className="font-bold">Delete Account</p>
                            <p className="text-sm text-muted-foreground">This will schedule your account for permanent deletion in 7 days. You can cancel this by logging back in before then.</p>
                        </div>
                    </div>

                    {!isDeleting ? (
                        <Button onClick={() => setIsDeleting(true)}>Delete My Account</Button>
                    ) : (
                        <div className="space-y-4 max-w-sm">
                            <Input
                                type="password"
                                placeholder="Enter password to confirm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleDelete}>Confirm Deletion</Button>
                                <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
