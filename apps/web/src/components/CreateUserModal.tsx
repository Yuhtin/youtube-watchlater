import { useState } from "react";
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-paper border-2 border-ink shadow-brutal-red w-full max-w-md">
                <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                    <span>▶ NEW_COLLECTION</span>
                    <button onClick={onClose}>[x]</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-4">
                        <label className="block text-[10px] font-bold mb-2">USERNAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            placeholder="Enter a username"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-[10px] font-bold mb-2">PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            placeholder="Create a password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-[10px] font-bold mb-2">CONFIRM PASSWORD</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            placeholder="Confirm password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-[10px] font-bold mb-2">PROFILE IMAGE URL (OPTIONAL)</label>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            placeholder="https://example.com/image.jpg"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex gap-1.5 mt-3">
                        <button
                            type="submit"
                            className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "CREATING..." : "▶ CREATE"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="border-2 border-ink px-3 py-2 text-[11px] font-bold"
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
