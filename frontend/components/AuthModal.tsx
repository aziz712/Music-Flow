"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(mode === 'login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const { setUser, setToken } = useAuthStore();

    // Sync internal state when opened from different triggers
    useState(() => {
        setIsLogin(mode === 'login');
    });

    // We use a separate effect to update isLogin if the prop changes while the modal is open (unlikely but safer)
    useEffect(() => {
        if (isOpen) {
            setIsLogin(mode === 'login');
        }
    }, [isOpen, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
            const body = isLogin ? { email, password } : { name, email, password };

            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                setUser(data);
                setToken(data.token);
                onClose();
            } else {
                alert(data.message || "Something went wrong");
            }
        } catch (error) {
            console.error(error);
            alert("Connection error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-card border border-border w-full max-w-md rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-8 relative overflow-hidden my-auto"
                >
                    <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-8 relative z-10">
                        <img
                            src="/logo.png?v=2"
                            alt="Music Flow Logo"
                            className="h-16 w-auto mx-auto mb-6 drop-shadow-2xl hover:scale-110 transition-transform duration-500"
                        />
                        <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isLogin ? "Enter your details to access your music" : "Join the modern music community"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                                <Input
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border/50 text-center">
                        <p className="text-sm text-muted-foreground mb-4">Or continue with</p>
                        <Button
                            variant="outline"
                            className="w-full h-11 gap-2 border-border/50 hover:bg-muted/50"
                            onClick={() => alert("Google login clicked")}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </Button>

                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm font-medium text-primary hover:underline mt-6"
                        >
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
