import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-6xl font-black text-neutral-800 mb-4 select-none">404</h1>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-4">
                    Paste Not Found
                </h2>
                <p className="text-neutral-400 max-w-md mb-8">
                    The paste you are looking for does not exist, has expired, or has reached its view limit.
                </p>
                <Link
                    href="/"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-lg font-medium transition-all inline-block border border-neutral-700"
                >
                    Create New Paste
                </Link>
            </div>
        </main>
    );
}
