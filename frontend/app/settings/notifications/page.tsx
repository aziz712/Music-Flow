"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Bell, Mail, ShieldAlert, Sparkles, Check } from "lucide-react";
import { getNotifications, markNotificationRead, updateNotificationPreferences } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types";
import { toast } from "sonner";

export default function NotificationsPage() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [prefs, setPrefs] = useState<User['notificationPreferences']>(user?.notificationPreferences || {
        email: true,
        productUpdates: true,
        weeklyDigest: false,
        securityAlerts: true
    });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleTogglePref = async (key: string) => {
        const k = key as keyof User['notificationPreferences'];
        const newPrefs = { ...prefs, [k]: !prefs[k] };
        setPrefs(newPrefs);
        try {
            await updateNotificationPreferences(newPrefs);
            toast.success("Preferences saved");
        } catch (error) {
            toast.error("Failed to save preferences");
        }
    };

    return (
        <div className="space-y-12">
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Preferences</h2>
                </div>
                <div className="space-y-4 max-w-md">
                    <PreferenceToggle
                        icon={Mail}
                        label="Email Notifications"
                        description="Receive recap emails and updates."
                        isEnabled={prefs.email}
                        onToggle={() => handleTogglePref('email')}
                    />
                    <PreferenceToggle
                        icon={Sparkles}
                        label="Product Updates"
                        description="New features and recommendations."
                        isEnabled={prefs.productUpdates}
                        onToggle={() => handleTogglePref('productUpdates')}
                    />
                    <PreferenceToggle
                        icon={ShieldAlert}
                        label="Security Alerts"
                        description="Critical account security alerts."
                        isEnabled={true}
                        disabled={true}
                        onToggle={() => { }}
                    />
                </div>
            </section>

            <section className="space-y-6 pt-12 border-t border-border/50">
                <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Recent Notifications</h2>
                </div>
                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <p className="text-muted-foreground italic">No recent notifications.</p>
                    ) : (
                        notifications.map((n: any) => (
                            <div key={n._id} className={`p-4 rounded-2xl border transition-all ${n.isRead ? 'bg-muted/10 border-border/20' : 'bg-primary/5 border-primary/20 shadow-sm'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="font-bold">{n.title}</p>
                                        <p className="text-sm text-muted-foreground">{n.message}</p>
                                        <p className="text-xs text-muted-foreground pt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    {!n.isRead && (
                                        <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n._id)}>
                                            <Check className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

function PreferenceToggle({ icon: Icon, label, description, isEnabled, onToggle, disabled = false }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/30">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-full">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p className="font-bold">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={disabled}
                className={`w-12 h-6 rounded-full transition-all relative ${isEnabled ? 'bg-primary' : 'bg-muted'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
}
