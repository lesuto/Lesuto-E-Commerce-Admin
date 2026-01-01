import { defineDashboardExtension } from '@vendure/dashboard';
import React, { useState } from 'react';
import './login-theme.css'; // Imports the CSS for rainbow effects, logo, and background

const ChameleonLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation Login($username: String!, $password: String!) {
                            login(username: $username, password: $password) {
                                ... on CurrentUser { id }
                                ... on InvalidCredentialsError { message }
                                ... on NativeAuthStrategyError { message }
                            }
                        }
                    `,
                    variables: { username, password },
                }),
            });

            const { data } = await res.json();

            if (data?.login?.message) {
                setError(data.login.message);
                setLoading(false);
            } else if (data?.login?.id) {
                window.location.href = '/dashboard/';
            } else {
                setError('Login failed');
                setLoading(false);
            }
        } catch (err) {
            setError('Connection error');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen items-center justify-center bg-black relative overflow-hidden text-white">
            {/* Ambient Background: Teal radial gradient for subtle glow */}
            <div className="ambient absolute inset-0 pointer-events-none"></div>

            {/* Login Card: Your liked structure with dark semi-transparent bg */}
            <div className="max-w-md p-8 bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-800 relative z-10 mx-auto">
                <div className="text-center mb-8">
                    {/* Logo: Rainbow masked animation on your image URL */}
                    <div className="logo-wrapper mx-auto">
                        <div className="logo-mask"></div>
                    </div>
                    {/* Title: Rainbow text animation */}
                    <h1 className="chameleon-text text-center">Lesuto Chameleon</h1>
                    {/* Subtitle: Light gray with clamp sizing */}
                    <p className="subtitle text-center mt-2">E-Commerce For All</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <input 
                            type="text" required placeholder="Username"
                            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white transition-all"
                            value={username} onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <input 
                            type="password" required placeholder="Password"
                            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white transition-all"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <div className="text-red-400 text-sm text-center">{error}</div>}

                    <button 
                        type="submit" disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transition-all"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                {/* Tagline: Uppercase with letter-spacing */}
                <p className="chameleon-text tagline text-center mt-8">Let’s Succeed Together</p>
            </div>
        </div>
    );
};

// Export for Vendure extension (change path to '/' if overriding root login)
export default defineDashboardExtension({
    routes: [
        {
            path: '/login/', // Test path; change to '/' for full override
            component: ChameleonLogin,
            authenticated: false,
        },
    ],
});

