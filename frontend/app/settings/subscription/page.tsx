"use client";

import { Button } from "@/components/ui/Button";
import { CreditCard, Check, Zap, Crown, Star } from "lucide-react";
import { createSubscriptionCheckout } from "@/services/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

const plans = [
    {
        id: "free",
        name: "Free",
        price: "$0",
        features: ["Standard streaming", "5 bulk downloads/day", "Basic recommendations"],
        icon: Star,
        color: "text-muted-foreground"
    },
    {
        id: "pro_monthly",
        name: "Pro",
        price: "$9.99",
        features: ["High-quality streaming", "50 bulk downloads/day", "Smart recommendations", "Ad-free experience"],
        icon: Zap,
        color: "text-primary",
        recommended: true
    },
    {
        id: "premium_monthly",
        name: "Premium",
        price: "$19.99",
        features: ["Ultra-quality streaming", "Unlimited downloads", "Early access features", "Priority support"],
        icon: Crown,
        color: "text-yellow-500"
    }
];

export default function SubscriptionPage() {
    const { user } = useAuthStore();
    const currentTier = user?.subscription?.tier || 'free';

    const handleSubscribe = async (planId: string) => {
        if (planId === 'free') return;
        try {
            const { message } = await createSubscriptionCheckout(planId);
            toast.success(message || "Successfully upgraded!");
            // Refresh user data if needed, or rely on state
        } catch (error) {
            toast.error("Upgrade failed. Please try again.");
        }
    };

    return (
        <div className="space-y-12">
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Billing & Plans</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`p-6 rounded-3xl border flex flex-col transition-all hover:scale-[1.02] ${plan.recommended
                                ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-xl shadow-primary/10'
                                : 'bg-muted/10 border-border/40'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-xl bg-background ${plan.color}`}>
                                    <plan.icon className="w-6 h-6" />
                                </div>
                                {plan.recommended && (
                                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Recommended</span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold">{plan.name}</h3>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-black">{plan.price}</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <ul className="mt-6 space-y-3 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="w-4 h-4 text-primary" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                className="mt-8 w-full font-bold"
                                variant={plan.recommended ? "default" : "outline"}
                                disabled={currentTier === plan.id || (plan.id === 'free' && currentTier !== 'free')}
                                onClick={() => handleSubscribe(plan.id)}
                            >
                                {currentTier === plan.id ? "Current Plan" : "Upgrade Now"}
                            </Button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
