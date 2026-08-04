export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500 text-xl font-bold text-white">
            D
          </div>
          <h1 className="text-2xl font-bold text-primary-900">Didactis</h1>
          <p className="text-sm text-gray-500">L&apos;allié de votre pédagogie</p>
        </div>
        {children}
      </div>
    </div>
  );
}
