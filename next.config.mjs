/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  // Do not advertise the framework in responses.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
