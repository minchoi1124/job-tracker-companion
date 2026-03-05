"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
    return (
        <button
            onClick={() => signOut()}
            className="btn-text"
            style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                color: 'var(--danger)',
                opacity: 0.8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500'
            }}
        >
            <LogOut size={14} />
            Sign Out
        </button>
    );
}
