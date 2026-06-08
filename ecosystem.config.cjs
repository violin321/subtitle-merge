module.exports = {
  apps: [
    {
      name: 'subtitle-merge',
      cwd: __dirname,
      script: 'npm',
      args: 'start -- -p 3018',
      env: {
        PORT: '3018',
        NODE_ENV: 'production',
      },
    },
  ],
};
