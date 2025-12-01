export type NavChildItem = {
  name: string;
  href: string;
};

export type NavItem = {
  name: string;
  href?: string;
  children?: NavChildItem[];
};
