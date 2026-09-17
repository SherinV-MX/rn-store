const config = {
  plugins: {
    // Inject the shared @custom-media definitions (breakpoints) into every file,
    // then resolve @media (--alias) usages — must run before Tailwind.
    "@csstools/postcss-global-data": {
      files: ["./src/styles/custom-media.css"],
    },
    "postcss-custom-media": {},
    "@tailwindcss/postcss": {},
  },
};

export default config;
