import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { companiesTable } from "@/schema";
import { asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import MembersClient from "./client";

const MembersPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    redirect("/");
  }

  const companies =
    session.user.role === "super_admin"
      ? await db.select().from(companiesTable).orderBy(asc(companiesTable.name))
      : [];

  return (
    <section>
      <MembersClient
        userRole={session.user.role}
        companyId={session.user.companyId}
        companyName={session.user.companyName}
        companies={companies}
      />
    </section>
  );
};

export default MembersPage;
