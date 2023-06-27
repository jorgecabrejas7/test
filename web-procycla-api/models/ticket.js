const moment = require('moment'); 
require("dotenv").config();

/**
 * @openapi
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       required:
 *         - id
 *         - type
 *         - status
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           example: null
 *           description: auto generated
 *         type:
 *           type: string
 *           enum: [ticket, monthly_digest, product_updates, discount_and_promotions]
 *         status:
 *           type: string
 *           enum: [waiting_response, answered, finished]
 *         title:
 *           type: string
 *           example: 'title'
 *         id_user:
 *           type: integer
 *           example: null
 *         createdAt:
 *           type: string
 *           description: auto generated
 *           example: null
 *         updatedAt:
 *           type: string
 *           description: auto generated
 *           example: null
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define("ticket",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            type: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'ticket'
            },
            status: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            title: {
                type: DataTypes.STRING(256),
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,                
                get() {
                    return moment(this.getDataValue('createdAt')).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss');
                }
            },
            updatedAt: {
                type: DataTypes.DATE,
                get() {
                    return moment(this.getDataValue('updatedAt')).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss');
                }
            }
        },
        {
            freezeTableName: true,
            timestamps: true
        }
    );
};