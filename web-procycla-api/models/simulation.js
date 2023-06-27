const moment = require('moment'); 
require("dotenv").config();

/**
 * @openapi
 * components:
 *   schemas:
 *     Simulation:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - bmp_status
 *         - cstr_status
 *       properties:
 *         id:
 *           type: integer
 *           example: null
 *           description: auto generated
 *         name:
 *           type: string
 *           example: 'Simulation name'
 *         description:
 *           type: string
 *           example: 'Simulation description'
 *         load_data_status:
 *           type: string
 *           example: 'pending'
 *           description: cannot be set by user
 *         load_data_result:
 *           type: string
 *         bmp_status:
 *           type: string
 *           example: 'pending'
 *           description: cannot be set by user
 *         bmp_result:
 *           type: string
 *         cstr_status:
 *           type: string
 *           example: 'pending'
 *           description: cannot be set by user
 *         cstr_progress:
 *           type: float
 *         cstr_result:
 *           type: string
 *         upload_input_file:
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
    return sequelize.define("simulation",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING(256),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            submit_data: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            load_data_status: {
                type: DataTypes.STRING(24),
                allowNull: false,
                defaultValue: 'pending'
            },
            load_data_result: {
                type: DataTypes.TEXT('long'),
                allowNull: true
            },
            bmp_status: {
                type: DataTypes.STRING(24),
                allowNull: false,
                defaultValue: 'pending'
            },
            bmp_result: {
                type: DataTypes.TEXT('long'),
                allowNull: true
            },
            cstr_status: {
                type: DataTypes.STRING(24),
                allowNull: false,
                defaultValue: 'pending'
            },
            cstr_progress: {
                type: DataTypes.FLOAT,
                allowNull: true
            },
            cstr_result: {
                type: DataTypes.TEXT('long'),
                allowNull: true
            },
            upload_input_file: {
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