"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email: form.email,
                password: form.password,
            });

            if (res?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/");
                router.refresh(); // Crucial to refresh session state across app
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "100px auto", padding: "0 20px" }}>
            <div className="glass-panel">
                <h1 style={{ marginBottom: "24px", textAlign: "center" }} className="text-gradient">Login</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-control"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-control"
                            required
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                    {error && <p className="mb-4" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
                    <button type="submit" className="btn" style={{ width: "100%" }} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
                    </button>
                </form>
                <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem" }} className="text-muted">
                    Don't have an account? <Link href="/register" style={{ color: "var(--info)", textDecoration: "none" }}>Register here</Link>
                </div>
            </div>
        </div>
    );
}
