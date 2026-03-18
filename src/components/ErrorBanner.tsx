interface ErrorBannerProps {
  message: string | null;
  variant?: "error" | "success";
  onDismiss?: () => void;
}

const VARIANT_CLASSES: Record<NonNullable<ErrorBannerProps["variant"]>, string> = {
  error: "bg-red-50 border-red-200 text-red-700",
  success: "bg-green-50 border-green-200 text-green-700",
};

export default function ErrorBanner({
  message,
  variant = "error",
  onDismiss,
}: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      className={`mb-4 p-3 border rounded-lg text-sm flex items-center justify-between ${VARIANT_CLASSES[variant]}`}
      aria-live="assertive"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 text-current opacity-60 hover:opacity-100"
          aria-label="닫기"
        >
          ✕
        </button>
      )}
    </div>
  );
}
