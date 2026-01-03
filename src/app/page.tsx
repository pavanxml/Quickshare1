"use client";

import { useState, useRef } from "react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-2xl ${className}`}>
        {children}
    </div>
);

export default function Home() {
    const [mode, setMode] = useState<'text' | 'video' | 'url'>('text');
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [ttl, setTtl] = useState<string>("");
    const [maxViews, setMaxViews] = useState<string>("");
    const [result, setResult] = useState<{ id: string; url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        setProgress(0);

        try {
            if (mode === 'video') {
                if (!file) throw new Error("Please select a file.");

                // XMLHttpRequest for Progress & Streaming
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/pastes");

                    // Metadata Header
                    const meta = {
                        content: content || "Video Share",
                        ttl_seconds: ttl ? parseInt(ttl) : undefined,
                        max_views: maxViews ? parseInt(maxViews) : undefined,
                        extension: file.name.substring(file.name.lastIndexOf('.')),
                        mime_type: file.type
                    };
                    xhr.setRequestHeader("x-paste-meta", JSON.stringify(meta));
                    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            setProgress(Math.round(percentComplete));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                setResult(data);
                                resolve(data);
                            } catch (e) {
                                reject(new Error("Invalid server response"));
                            }
                        } else {
                            try {
                                const err = JSON.parse(xhr.responseText);
                                reject(new Error(err.error || "Upload failed"));
                            } catch (e) {
                                reject(new Error("Upload failed with status " + xhr.status));
                            }
                        }
                    };

                    xhr.onerror = () => reject(new Error("Network error"));

                    // Send raw file
                    xhr.send(file);
                });

            } else {
                // Text or URL
                const body: any = {
                    content,
                    type: mode,
                    ttl_seconds: ttl ? parseInt(ttl) : undefined,
                    max_views: maxViews ? parseInt(maxViews) : undefined
                };

                const res = await fetch("/api/pastes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Something went wrong");
                setResult(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            if (mode !== 'video') setProgress(0);
        }
    };

    const handleCopy = () => {
        if (result?.url) {
            navigator.clipboard.writeText(result.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-neutral-900 z-0">
                <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-2xl z-10">
                <header className="mb-12 text-center">
                    <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent drop-shadow-sm">
                        QuickShare
                    </h1>
                    <p className="text-lg text-white/60 font-light tracking-wide">
                        Securely share Text, Videos, or Websites.
                    </p>
                </header>

                {result ? (
                    <GlassCard className="p-8 animate-in fade-in zoom-in duration-300 border-green-500/30">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4 ring-1 ring-green-500/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Share</h2>
                            <p className="text-white/50 text-sm">Your secure link has been generated.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-black/30 p-2 rounded-xl flex items-center gap-2 border border-white/5 group transition-all hover:border-white/20">
                                <input
                                    readOnly
                                    value={result.url}
                                    className="flex-1 bg-transparent border-none text-white/90 text-sm font-mono px-4 focus:ring-0 outline-none"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                                >
                                    {copied ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    )}
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <a
                                    href={result.url}
                                    target="_blank"
                                    className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
                                >
                                    Visit Link
                                </a>
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        setContent("");
                                        setFile(null);
                                        setTtl("");
                                        setMaxViews("");
                                        setProgress(0);
                                    }}
                                    className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white/80 py-3 rounded-xl font-medium transition-all border border-white/5"
                                >
                                    Create Another
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard className="p-1">
                        <div className="flex p-1 bg-black/20 rounded-xl mb-6 backdrop-blur-md overflow-x-auto">
                            <button
                                onClick={() => setMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${mode === 'text'
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Text Note
                            </button>
                            <button
                                onClick={() => setMode('video')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${mode === 'video'
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                File Upload
                            </button>
                            <button
                                onClick={() => setMode('url')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${mode === 'url'
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                Website
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 pb-6">
                            {mode === 'text' && (
                                <div className="mb-6 group">
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        rows={8}
                                        placeholder="Type your secure message here..."
                                        className="w-full bg-black/20 border-2 border-transparent focus:border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:bg-black/30 transition-all resize-none font-mono text-sm leading-relaxed"
                                    />
                                </div>
                            )}

                            {mode === 'url' && (
                                <div className="mb-6 group">
                                    <input
                                        type="url"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        placeholder="https://example.com"
                                        className="w-full bg-black/20 border-2 border-transparent focus:border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:bg-black/30 transition-all text-sm leading-relaxed"
                                    />
                                </div>
                            )}

                            {mode === 'video' && (
                                <div className="mb-6 space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed border-white/10 hover:border-white/30 rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer bg-black/10 hover:bg-black/20 ${file ? 'border-green-500/30 bg-green-500/5' : ''}`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                        {file ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                </div>
                                                <p className="font-medium text-white">{file.name}</p>
                                                <p className="text-sm text-white/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-white/5 text-white/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                </div>
                                                <p className="font-medium text-white">Upload File</p>
                                                <p className="text-sm text-white/40">Any format (Large files supported)</p>
                                            </>
                                        )}
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        rows={2}
                                        placeholder="Add a caption (optional)..."
                                        className="w-full bg-black/20 border-2 border-transparent focus:border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:bg-black/30 transition-all resize-none font-sans text-sm"
                                    />
                                    {loading && progress > 0 && (
                                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full transition-all duration-300 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 pl-1">
                                        Expires in
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={ttl}
                                            onChange={(e) => setTtl(e.target.value)}
                                            className="w-full bg-black/20 text-white rounded-xl p-3 text-sm border border-transparent focus:border-white/10 outline-none appearance-none cursor-pointer hover:bg-black/30 transition-colors"
                                        >
                                            <option value="" className="bg-neutral-800">Never</option>
                                            <option value="60" className="bg-neutral-800">1 Minute</option>
                                            <option value="300" className="bg-neutral-800">5 Minutes</option>
                                            <option value="3600" className="bg-neutral-800">1 Hour</option>
                                            <option value="86400" className="bg-neutral-800">1 Day</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 pl-1">
                                        View Limit
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={maxViews}
                                        onChange={(e) => setMaxViews(e.target.value)}
                                        placeholder="No Limit"
                                        className="w-full bg-black/20 text-white rounded-xl p-3 text-sm border border-transparent focus:border-white/10 outline-none placeholder-white/20"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (progress > 0 ? `Uploading ${progress}%` : "Creating...") : "Create Secure Link"}
                            </button>
                        </form>
                    </GlassCard>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-white/20 text-xs font-light">
                Secure. Private. Ephemeral.
            </div>
        </main>
    );
}
