module.exports = {
  apps: [
    {
      name: "web",
      script: "server.js",
      interpreterArgs: "--experimental-modules --es-module-specifier-resolution=node",
      env: {
        PORT: 8080
      }
    },
    {
      name: "worker",
      script: "workers/imageProcessor.js",
      interpreterArgs: "--experimental-modules --es-module-specifier-resolution=node",
      env: {
        PORT: 8081
      },
      autorestart: true,
      max_restarts: 3,
      restart_delay: 10000
    }
  ]
};