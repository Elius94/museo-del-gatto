module.exports = {
    apps: [{
        name: "museo-del-gatto",
        script: "serve",
        env: {
            PM2_SERVE_PATH: '/opt/web/srv.eliusoutdoor.com/museo-del-gatto/public',
            PM2_SERVE_PORT: 3003,
            PM2_SERVE_SPA: 'true'
        }
    }],
}