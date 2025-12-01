import ErrorPage from "@/components/shared/error-page";
import LoadingPage from "@/components/shared/loading-page";
import { HttpError } from "@/lib/axios";
import { api } from "@/lib/axios-client";
import { CompanyType } from "@/schema";
import { Suspense } from "react";

const Company = async ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  const { page, pageSize, search } = await searchParams;

  const params = {
    page: typeof page === "string" ? page : null,
    pageSize: typeof pageSize === "string" ? pageSize : null,
    search: typeof search === "string" ? search : null,
  };

  try {
    const { data: companies } = await api<CompanyType[], typeof params>("/master/companies", {
      method: "GET",
      params,
    });

    return (
      <div className="space-y-6">
        <p>normal render companies di sini</p>
      </div>
    );
  } catch (error) {
    console.log({ error });
    const err = error as HttpError;

    return (
      <ErrorPage statusCode={err.status} title="Something went wrong" description={err.message} />
    );
  }
};

const CompanyPage = ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Company searchParams={searchParams} />
    </Suspense>
  );
};

export default CompanyPage;
