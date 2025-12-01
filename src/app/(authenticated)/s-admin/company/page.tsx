import ErrorPage from "@/components/shared/error-page";
import LoadingPage from "@/components/shared/loading-page";
import { HttpError } from "@/lib/axios";
import { QUERY_PARAM_KEY, decryptQueryParams } from "@/lib/query-crypto";
import { getFirstParam, toNumberParam } from "@/lib/utils";
import { getCompanies } from "@/server/companies";
import { Suspense } from "react";
import CompanyClient from "./client";

const Company = async ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  const encryptedToken = getFirstParam(searchParams[QUERY_PARAM_KEY]);
  const decrypted = await decryptQueryParams(encryptedToken);
  const params = {
    page: decrypted.page ?? toNumberParam(searchParams.page),
    pageSize: decrypted.pageSize ?? toNumberParam(searchParams.pageSize),
    search: decrypted.search ?? getFirstParam(searchParams.search) ?? undefined,
  };

  try {
    const data = await getCompanies(params);

    return <CompanyClient data={data} />;
  } catch (error) {
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
