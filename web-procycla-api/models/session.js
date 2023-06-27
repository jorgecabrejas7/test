const moment = require('moment'); 
require("dotenv").config();

/**
 * @openapi
 * components:
 *   schemas:
 *     Session:
 *       type: object
 *       required:
 *         - id
 *         - valid
 *         - expires_in
 *         - ip
 *       properties:
 *         id:
 *           type: integer
 *           example: null
 *           description: auto generated
 *         valid:
 *           type: boolean
 *           example: true
 *           description: if the session is valid or not
 *         expires_in:
 *           type: string
 *           example: '30d'
 *           description: cannot be set by user
 *         ip:
 *           type: string
 *           example: 'localhost'
 *         device:
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
    return sequelize.define("session",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            valid: {
                type: DataTypes.BOOLEAN,
                allowNull: false
            },
            expires_in: {
                type: DataTypes.STRING(24),
                allowNull: false
            },
            ip: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            device: {
                type: DataTypes.STRING(256),
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