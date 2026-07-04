export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-rose-800">Something went wrong</h3>
      <p className="mt-2 max-w-sm text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md bg-rose-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-900"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
      {message}
    </p>
  );
}
