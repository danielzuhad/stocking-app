import { Boxes } from "lucide-react";
import LoginClient from "./client";

const LoginPage = () => {
  return (
    <div className="bg-background flex h-full min-h-screen w-full items-center justify-center">
      <div className="mx-2 flex w-full max-w-md flex-col items-center justify-center rounded-xl border bg-white px-5 py-7 sm:p-7">
        {/* HEADER */}
        <div className="mb-7 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center space-x-1">
            <Boxes className="text-primary h-8 w-8" />
            <h1 className="text-2xl font-semibold">Stocking App</h1>
          </div>
          <p className="text-muted-foreground text-center text-sm">
            Manage and track your inventory effortlessly.
          </p>
        </div>
        <LoginClient />
      </div>
    </div>
  );
};

export default LoginPage;
