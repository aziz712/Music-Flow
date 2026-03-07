"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, Key, Smartphone, LogOut, Clock, Globe } from "lucide-react";
import { changePassword, setup2FA, verify2FA, getSecuritySessions, logoutSession } from "@/services/api";
import { toast } from "sonner";

export default function SecurityPage() {
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [qrCode, setQrCode] = useState("");
    const [totpToken, setTotpToken] = useState("");
    const [is2FASetup, setIs2FASetup] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await getSecuritySessions();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        setLoading(true);
        try {
            await changePassword(Object.fromEntries(formData));
            toast.success("Password updated successfully");
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleStart2FA = async () => {
        try {
            const data = await setup2FA();
            setQrCode(data.qrCodeUrl);
            setIs2FASetup(true);
        } catch (error) {
            toast.error("Failed to start 2FA setup");
        }
    };

    const handleVerify2FA = async () => {
        try {
            await verify2FA(totpToken);
            toast.success("2FA Enabled successfully");
            setIs2FASetup(false);
            setQrCode("");
        } catch (error) {
            toast.error("Invalid token");
        }
    };

    return (
        <div className="space-y-12">
            {/* Password Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Key className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Change Password</h2>
                </div>
                <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Current Password</label>
                        <Input type="password" name="currentPassword" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input type="password" name="newPassword" required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </section>

            {/* 2FA Section */}
            <section className="space-y-6 pt-12 border-t border-border/50">
                <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
                </div>
                {!is2FASetup ? (
                    <div className="space-y-4">
                        <p className="text-muted-foreground">Add an extra layer of security to your account.</p>
                        <Button variant="outline" onClick={handleStart2FA}>Enable 2FA</Button>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-sm">
                        <div className="bg-white p-4 rounded-xl inline-block">
                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Enter 6-digit Code</label>
                            <Input
                                placeholder="000000"
                                value={totpToken}
                                onChange={(e) => setTotpToken(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleVerify2FA} className="w-full">Verify & Enable</Button>
                    </div>
                )}
            </section>

            {/* Sessions Section */}
            <section className="space-y-6 pt-12 border-t border-border/50">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Active Sessions</h2>
                </div>
                <div className="space-y-4">
                    {sessions.map((session: any) => (
                        <div key={session.sessionId} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/30">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Globe className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold">{session.device || "Unknown Device"}</p>
                                    <p className="text-sm text-muted-foreground">{session.ip} • Last active {new Date(session.lastActivity).toLocaleString()}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => logoutSession(session.sessionId)}>
                                <LogOut className="w-4 h-4 mr-2" /> Revoke
                            </Button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
