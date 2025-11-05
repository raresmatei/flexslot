import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@flexslot/types", "@flexslot/db"],
};

export default config;
