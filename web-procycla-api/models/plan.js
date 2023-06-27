const moment = require('moment'); 
require("dotenv").config();

/**
 * @openapi
 * components:
 *   schemas:
 *     Plan:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - price
 *         - currency
 *         - duration_days
 *         - invoice_name
 *         - invoice_description
 *       properties:
 *         id:
 *           type: integer
 *           example: null
 *           description: auto generated
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           example: null
 *         benefits:
 *           type: string
 *           example: null
 *         price:
 *           type: number
 *           example: 10.00
 *         currency:
 *           type: string
 *           example: '€'
 *         duration_days:
 *           type: integer
 *           example: 30
 *         invoice_name:
 *           type: string
 *         invoice_description:
 *           type: string
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
    return sequelize.define("plan",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            benefits: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            price: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            currency: {
                type: DataTypes.STRING(16),
                allowNull: false,
                defaultValue: '€'
            },
            duration_days: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 30
            },
            invoice_name: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            invoice_description: {
                type: DataTypes.TEXT,
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