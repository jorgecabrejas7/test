const moment = require('moment'); 
require("dotenv").config();

/**
 * @openapi
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - id
 *         - name
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
    return sequelize.define("project",
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