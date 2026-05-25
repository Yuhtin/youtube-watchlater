import { useState } from "react";
import { X, Upload, User } from "lucide-react";
import { toast } from "sonner";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error("Username is required");
            return;
        }

        if (!password.trim()) {
            toast.error("Password is required");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        try {
            setIsLoading(true);
            const loadingToast = toast.loading("Creating collection...");

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    imageUrl: imageUrl || undefined,
                }),
            });

            toast.dismiss(loadingToast);

            if (response.ok) {
                toast.success("Collection created successfully");
                onSuccess();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "Failed to create collection");
            }
        } catch (error) {
            console.error("Error creating user:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create New Collection</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter a username"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Create a password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Confirm password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Profile Image URL (optional)
                        </label>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/image.jpg"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating..." : "Create Collection"}
                    </button>
                </form>
            </div>
        </div>
    );
}