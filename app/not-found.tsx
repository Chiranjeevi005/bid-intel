import Link from 'next/link';

export default function NotFoundState() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <h2 className="mb-2 text-3xl font-bold text-gray-900">404</h2>
        <p className="mb-6 text-base text-gray-500">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
