const swaggerOptions = {
    definition: {
        openapi: "3.0.1",
        info: {
            title: "API Documentation",
            version: "1.0.0",
            contact: {
                name: "In2Ai",
                url: "https://in2ai.com/",
                email: "info@in2ai.com",
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [ {
                bearerAuth: []
        } ]
    },
    apis: ["./routes/*.js", "./routes/*/*.js", "./models/*.js"]
};

module.exports = swaggerOptions;