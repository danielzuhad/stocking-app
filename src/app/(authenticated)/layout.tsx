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
      <Container className="mt-[60px] pt-5 sm:mt-[80px]">{children}</Container>
    </>
  );
};

export default Layout;
