import Container from "@/components/container";
import Topbar from "@/components/topbar";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Topbar />
      <Container className="pt-5">{children}</Container>
    </>
  );
};

export default Layout;
