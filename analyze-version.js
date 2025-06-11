(async () => {
  const r = (await import("semantic-release")).default;

  console.log(r);

  r(
    {
      ci: false,
      dryRun: true,
      plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
      ],
    },
    {
      cwd: process.cwd(),
      env: process.env,
    }
  );
})();
