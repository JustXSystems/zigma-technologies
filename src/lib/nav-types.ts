export type NavItem = {
  label: string;
  href?: string;
  megaClass?: string;
  className?: string;
  mega?: Array<{
    heading: string;
    /** When set, mega column title becomes a link (category landing). */
    headingHref?: string;
    links: Array<{ label: string; href?: string; className?: string }>;
  }>;
};
