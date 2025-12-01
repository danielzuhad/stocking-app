import { authOptions } from "@/lib/auth";
import { NavItem } from "@/types/navigation";
import { Boxes } from "lucide-react";
import { getServerSession, Session } from "next-auth";
import Container from "./container";
import DesktopNavLinks from "./desktop-nav-links";
import NavLink from "./link";
import MobileSheet from "./mobile-sheet";
import NavProfile from "./nav-profile";

const Topbar = async () => {
  const session = await getServerSession(authOptions);
  const links: NavItem[] = [
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

  if (session?.user?.role === "super_admin") {
    links.push({
      name: "S-Admin",
      href: "/s-admin",
      children: [{ name: "Company", href: "/s-admin/company" }],
    });
  } else if (session?.user?.role === "admin") {
    links.push({ name: "Members", href: "/members" });
  }

  return (
    <nav className="fixed top-0 flex h-14 w-full justify-center border-b border-white/20 bg-white/40 backdrop-blur-md sm:h-16 lg:h-20">
      <Container className="flex items-center justify-between">
        {/* ICON */}
        <NavLink href="/" className="flex items-center space-x-1 pl-0">
          <Boxes className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-foreground text-lg font-semibold">Stocking App</h1>
        </NavLink>

        {/* LINKS */}
        <DesktopNavLinks items={links} />

        {/* PROFILE  */}
        <div className="hidden items-center lg:flex">
          <NavProfile session={session} />
        </div>

        {/* MOBILE */}
        <div className="lg:hidden">
          <MobileSheet links={links} session={session as Session | null} />
        </div>
      </Container>
    </nav>
  );
};

export default Topbar;
