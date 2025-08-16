import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Boxes } from "lucide-react";
import { getServerSession, Session } from "next-auth";
import Container from "./container";
import NavLink from "./link";
import MobileSheet from "./mobile-sheet";
import NavProfile from "./nav-profile";

const LINKS = [
  {
    name: "Dashboard",
    href: "/",
  },
  {
    name: "Inventory",
    href: "/inventory",
  },
  {
    name: "Activity",
    href: "/activity",
  },
];

const Topbar = async () => {
  const session = await getServerSession(authOptions);

  return (
    <nav className="flex h-14 w-full justify-center border-b border-white/20 bg-white/40 backdrop-blur-md sm:h-16 lg:h-20">
      <Container className="flex items-center justify-between">
        {/* ICON */}
        <NavLink href="/" className="flex items-center space-x-1">
          <Boxes className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-lg font-semibold">Stocking App</h1>
        </NavLink>

        {/* LINKS */}
        <div className="gap-10 space-x-5 max-lg:hidden lg:block">
          {LINKS.map((link, i) => (
            <NavLink href={link.href} key={i}>
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* PROFILE  */}
        <div className="hidden items-center lg:flex">
          <div className="flex flex-col items-end text-sm leading-tight text-gray-700">
            <span
              className="block max-w-[120px] truncate text-[17px] font-medium lg:max-w-[250px]"
              title={session?.user?.username ?? ""}
            >
              {session?.user?.username}
            </span>
            <span
              className="block max-w-[120px] truncate text-xs text-gray-500 lg:max-w-[250px]"
              title={session?.user?.email ?? ""}
            >
              {session?.user?.email}
            </span>
          </div>

          <NavProfile session={session} />
        </div>

        {/* MOBILE */}
        <div className="lg:hidden">
          <MobileSheet links={LINKS} session={session as Session} />
        </div>
      </Container>
    </nav>
  );
};

export default Topbar;
