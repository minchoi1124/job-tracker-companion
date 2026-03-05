"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ name: "", email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to register");
            } else {
                router.push("/login");
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
                <h1 style={{ marginBottom: "24px", textAlign: "center" }} className="text-gradient">Register</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
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
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
                    </button>
                </form>
                <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem" }} className="text-muted">
                    Already have an account? <Link href="/login" style={{ color: "var(--info)", textDecoration: "none" }}>Log in here</Link>
                </div>
            </div>
        </div>
    );
}
