"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Bell, CreditCard, UserX, Settings } from "lucide-react";

const sidebarItems = [
    { icon: Settings, label: "General", href: "/settings" },
    { icon: Shield, label: "Security", href: "/settings/security" },
    { icon: Bell, label: "Notifications", href: "/settings/notifications" },
    { icon: CreditCard, label: "Subscription", href: "/settings/subscription" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[70vh]">
            <aside className="w-full md:w-64 space-y-2">
                <div className="px-4 py-2 border-b border-border mb-4">
                    <h1 className="text-xl font-bold">Settings</h1>
                </div>
                {sidebarItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </aside>
            <div className="flex-1 bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 md:p-8 shadow-2xl">
                {children}
            </div>
        </div>
    );
}
