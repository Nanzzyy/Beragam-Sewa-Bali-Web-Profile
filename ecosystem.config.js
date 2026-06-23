module.exports = {
  apps: [
    {
      name: "bsb-api",
      script: "api/index.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3005
      }
    },
    {
      name: "bsb-web",
      script: "npm",
      args: "run start --workspace=apps/web",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "bsb-dashboard",
      script: "npm",
      args: "run start --workspace=apps/dashboard",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3002
      }
    },
    {
      name: "bsb-cashflow",
      script: "npm",
      args: "run start --workspace=apps/cashflow",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3003
      }
    }
  ]
};
