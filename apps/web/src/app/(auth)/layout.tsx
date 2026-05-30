export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">ForensiQ Lite</h1>
          <p className="text-muted-foreground mt-2">Forensic Audit Intelligence Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}