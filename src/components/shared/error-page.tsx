import { AlertTriangle, Boxes } from "lucide-react";

export interface ErrorPageProps {
  statusCode?: number;
  title?: string;
  description?: string;
  /**
   * Custom handler kalau mau override aksi retry.
   * Kalau nggak dikasih, default-nya pakai router.refresh()
   */
}

const ErrorPage = ({ statusCode = 404, title, description }: ErrorPageProps) => {
  const resolvedTitle =
    title ?? (statusCode === 404 ? "Oops, page not found" : "Something went wrong");

  const resolvedDescription =
    description ??
    (statusCode === 404
      ? "We couldn’t find the page or data you’re looking for. It might have been moved or deleted."
      : "An unexpected error occurred. Please try again in a moment.");

  return (
    <div className="mx-auto flex flex-col items-center justify-center px-4 pt-20 pb-20">
      {/* Logo + App Name (mirip LoadingPage) */}
      <div className="mb-6 flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center space-x-2">
          <Boxes className="text-primary h-10 w-10" />
          <h1 className="text-primary text-2xl font-semibold">Stocking App</h1>
        </div>
      </div>

      {/* Error Card */}
      <div className="border-border flex w-full max-w-md flex-col items-center rounded-2xl border bg-red-50/40 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center space-x-3">
          <div className="bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Error
              {statusCode ? ` · ${statusCode}` : null}
            </p>
            <h2 className="text-lg font-semibold">{resolvedTitle}</h2>
          </div>
        </div>

        <p className="text-muted-foreground mb-6 text-center text-sm">{resolvedDescription}</p>
      </div>
    </div>
  );
};

export default ErrorPage;
