import { getAdapter } from "@/lib/factory";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
    return {
        title: `Shared ${params.id} - QuickShare`,
    };
}

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-2xl ${className}`}>
        {children}
    </div>
);

export default async function ViewPaste(props: Props) {
    const params = await props.params;
    const { id } = params;

    const { headers } = await import("next/headers");
    const headerList = await headers();
    const testNow = headerList.get("x-test-now-ms");

    let now = Date.now();
    if (process.env.TEST_MODE === "1" && testNow) {
        const parsed = parseInt(testNow, 10);
        if (!isNaN(parsed)) now = parsed;
    }

    const adapter = getAdapter();
    const paste = await adapter.fetchPaste(id, now);

    if (!paste) {
        notFound();
    }

    // Redirect if it's a shortened URL
    if (paste.type === 'url') {
        // Validate it looks like a URL/Path
        try {
            const dest = paste.content.startsWith('http') ? paste.content : `http://${paste.content}`;
            // We must import redirect from next/navigation
            const { redirect } = await import("next/navigation");
            redirect(dest);
        } catch (e) {
            // If invalid URL, fall through to show it as text
        }
    }

    const isFile = paste.type === 'video' || paste.type === 'mixed';
    const hasText = paste.type === 'text' || paste.type === 'mixed';

    return (
        <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-neutral-900 z-0">
                <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-4xl z-10">
                <header className="mb-8 flex items-center justify-between px-4">
                    <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent opacity-80 hover:opacity-100 transition-opacity cursor-default">
                        QuickShare
                    </h1>
                    <a
                        href="/"
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-md border border-white/5 hover:border-white/20"
                    >
                        + Create New
                    </a>
                </header>

                <GlassCard className="overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex flex-wrap gap-4 items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isFile ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                {isFile ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">Shared Content</span>
                                <span className="text-white/40 text-xs font-mono">{new Date(paste.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {paste.views_left !== null && (
                            <div className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                {paste.views_left} views left
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        {/* File Content */}
                        {paste.file_url ? (
                            <div className="bg-black/50 border-b border-white/10 flex flex-col items-center justify-center">
                                {paste.mime_type?.startsWith('video/') ? (
                                    <div className="w-full aspect-video bg-black flex items-center justify-center">
                                        <video
                                            src={paste.file_url}
                                            controls
                                            className="w-full h-full max-h-[70vh]"
                                            poster="/video-placeholder.png"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                ) : paste.mime_type?.startsWith('image/') ? (
                                    <div className="w-full max-h-[70vh] overflow-auto flex items-center justify-center p-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={paste.file_url}
                                            alt="Shared Content"
                                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full p-12 flex flex-col items-center justify-center gap-6 text-center">
                                        <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium text-lg mb-1">File Attached</h3>
                                            <p className="text-white/40 text-sm font-mono mb-6">{paste.mime_type || 'Unknown Type'}</p>

                                            <a
                                                href={paste.file_url}
                                                download
                                                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                Download File
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Text Content */}
                        {hasText && paste.content && paste.content !== "File Share" && (
                            <div className={`p-6 md:p-8 ${paste.file_url ? 'border-t border-white/10 bg-black/20' : ''}`}>
                                {paste.file_url && <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Description</h3>}
                                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-neutral-200 selection:bg-indigo-500/40 selection:text-white">
                                    {paste.content}
                                </pre>
                            </div>
                        )}
                    </div>

                    {paste.expires_at && (
                        <div className="bg-white/5 border-t border-white/10 px-6 py-3 text-center">
                            <p className="text-white/30 text-xs flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Auto-deletes at {new Date(paste.expires_at).toLocaleString()}
                            </p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </main>
    );
}
