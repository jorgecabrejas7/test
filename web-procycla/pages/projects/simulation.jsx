import { useState, useEffect, useRef } from "react";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { loader } from "@/components/loader/loader";
import { useSession } from "next-auth/react";
import TextField from '@mui/material/TextField';
import { protectedFetch } from "@/lib/apifetch";
import Icon from '@mui/material/Icon';
import Container from "@/components/container";
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";
import { useReactToPrint } from 'react-to-print';
import Menu from "@/components/menu";
import Image from "next/image";
import { getSimulationStatus, isStringJSON } from "@/lib/functions";
import { Rings } from 'react-loader-spinner';

export default () => {
    const { t } = useTranslation('common');
    
    const router = useRouter();
    const [id, setId] = useState(parseInt(router.query.id || 0));
    const [simulation, setSimulation] = useState(null);
    const session = useSession();
    const [isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef();
    const promiseResolveRef = useRef(null);
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(menu_page === 0 || menu_page === 1) return;
        
        if(page != menu_page)
        setPage(menu_page);

        let { id: id_query } = router.query;
        if(id_query) id_query = parseInt(id_query);
        if(id != id_query) setId(id_query);
    }, [router.query]);
    
    const startSimulation = async () => {
        loader(true);
        await protectedFetch(session, process.env.BACK_API_URL + "simulation/start?" + new URLSearchParams({ simulation_id: id }), "get", null, t);
        loadSimulation();
    };

    const loadSimulation = async (silent = false) => {
        if(!silent)
        loader(true);

        //get simulation
        const res = await protectedFetch(session, process.env.BACK_API_URL + "simulation?" + new URLSearchParams({ id_simulation: id }), "get", null, t);
        
        if(res.status === 200) {
            let data = await res.json();
            data.submit_data = JSON.parse(data.submit_data);
            setSimulation(data);

            const isFinished = getSimulationStatus(data) === 'COMMON.FINISHED' || getSimulationStatus(data) === 'COMMON.FAILED';
            if(!isFinished) setTimeout(() => loadSimulation(true), 5000);
        }
        loader(false);
    };

    const downloadInputFile = async () => {
        const res = await protectedFetch(session, process.env.BACK_API_URL + "simulation/download_input?" + new URLSearchParams({ simulation_id: id }), "get", null, t);
        res.blob().then(blob => {
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = simulation.upload_input_file;
            a.click();
        });
    };

    useEffect(() => {
        if(isPrinting && promiseResolveRef.current) {
            promiseResolveRef.current();
        }
    }, [isPrinting]);

    const generateResultFile = useReactToPrint({
        content: () => printRef.current,
        onBeforeGetContent: () => {
            return new Promise((resolve) => {
                promiseResolveRef.current = resolve;
                loader(true);
                setIsPrinting(true);
            });
        },
        onAfterPrint: () => {
            setIsPrinting(false);
            loader(false);
        }
    });

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        if(id > 0 && session.status === "authenticated") {
            loadSimulation();
        }
    }, [session.status, id]);

    useEffect(() => {
        let { id: id_query } = router.query;
        if(id_query) id_query = parseInt(id_query);
        if(id != id_query) setId(id_query);
    }, [router.query]);

    const renderErrors = (type, error) => {
        const errorList = [];
        switch(type) {
            case 'parameters':
                error.params.forEach(param => {
                    const codes = param.status_codes;
                    codes.forEach(code => {
                        switch(code) {
                            case 1:
                                const min = param.name === 'a' ? 10 : 0.001;
                                const max = param.name === 'a' ? 1000 : 10;
                                errorList.push(t('PAGES.SIMULATION.ERRORS.PARAM_SC_1', { name: param.name, min: min, max: max }));
                                break;
                            case 2:
                                errorList.push(t('PAGES.SIMULATION.ERRORS.PARAM_SC_2', { name: param.name, min: 0 }));
                                break;
                            case 3:
                                const equation = param.name === 'a' ? 'Bo - ICinf < 0.2*Bo' : 'Kh - ICinf < 0.2*Kh';
                                errorList.push(t('PAGES.SIMULATION.ERRORS.PARAM_SC_3', { name: param.name, equation: equation }));
                                break;
                        }
                    });
                });
                return (
                    <ul className="border-box m-10" style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}>
                        {
                            errorList.map((error, index) => (
                                <li key={ index } className='m-10'><span className="text-small">{ error }</span></li>
                            ))
                        }
                    </ul>
                )
            case 'metrics':
                error.metrics.forEach(metric => {
                    const code = metric.status_code;
                    if(code != 0) {
                        if(metric.name === 'r2') errorList.push(t('PAGES.SIMULATION.ERRORS.METRIC_GT_ERROR', { name: metric.name, value: 0.7 }));
                        else if(metric.name === 'rmse') errorList.push(t('PAGES.SIMULATION.ERRORS.METRIC_LT_ERROR', { name: metric.name, value: 0.2 }));
                        else if(metric.name === 'fb') errorList.push(t('PAGES.SIMULATION.ERRORS.METRIC_LT_ERROR', { name: metric.name, value: 0.3 }));
                    }
                });
                return (
                    <ul className="border-box m-10" style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}>
                        {
                            errorList.map((error, index) => (
                                <li key={ index } className='m-10'><span className="text-small">{ error }</span></li>
                            ))
                        }
                    </ul>
                )
        }
    };

    const LoadDataInfo = () => {
        if(simulation.load_data_status.toUpperCase() === 'RUNNING' || simulation.load_data_status.toUpperCase() === 'PENDING') {
            return (
                <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                    <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='primary-color'>refresh</Icon>
                    <span className="text-small fw-bold primary-color text-uppercase" >{ t('COMMON.RELOAD') }</span>
                </div>
            );
        }
        else if(simulation.load_data_status.toUpperCase() === 'FAILED') {
            return (
                <div className="d-flex flex-column">
                    <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                        <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='text-danger'>refresh</Icon>
                        <span className="text-small fw-bold text-danger text-uppercase" >{ t('COMMON.TRY_AGAIN') }</span>
                    </div>
                    <TextField value={ simulation?.load_data_result || "" } className="mb-20" multiline rows={ 4 }/>
                </div>
            );
        }
        else if(simulation.load_data_status.toUpperCase() === 'FINISHED') {
            const processedData = JSON.parse(simulation.load_data_result);
            const columns = [t('COMMON.TIME') + ' (' + t('COMMON.DAYS').toLowerCase() + ')', ...processedData.substrates.map(substrate => (substrate.name + ' (mL/g)'))];
            //graph chart data and options
            const chartData = {
                labels: processedData.time.map(time => time.toFixed(2).replace(/\.00$/, '')),
                datasets: processedData.substrates.map(substrate => ({
                    label: substrate.name,
                    data: substrate.values.map(value => value.toFixed(2).replace(/\.00$/, '')),
                    fill: false,
                    //borderColor with random color
                    borderColor: 'rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ')'
                }))
            };
            const chartOptions = {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t('COMMON.TIME') + ' (' + t('COMMON.DAYS').toLowerCase() + ')'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t('COMMON.VALUES')
                    }
                }
            };
            
            return (
                <div className="d-flex flex-column">
                    <Line data={ chartData } options={ chartOptions } className="mb-30"/>
                    <div className="d-flex flex-column" style={{ height: 500, overflow: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    {
                                        columns.map((column, index) => (
                                            <th key={ index } scope="col">{ column }</th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    processedData.time.map((time, index) => (
                                        <tr key={ index }>
                                            <th scope="row">{ time.toFixed(2).replace(/\.00$/, '') }</th>
                                            {
                                                columns.slice(1).map((column, colIndex) => {
                                                    const value = processedData.substrates.filter(i => (i.name + ' (mL/g)') === column)[0].values[index];
                                                    return (
                                                        <td key={ colIndex }>{ value === undefined ? '-' : value.toFixed(2).replace(/\.00$/, '') }</td>
                                                    )
                                                })
                                            }
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        else return <></>;
    };

    const BmpDataInfo = () => {
        if(simulation.bmp_status.toUpperCase() === 'RUNNING' || simulation.bmp_status.toUpperCase() === 'PENDING') {
            return (
                <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                    <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='primary-color'>refresh</Icon>
                    <span className="text-small fw-bold primary-color text-uppercase" >{ t('COMMON.RELOAD') }</span>
                </div>
            );
        }
        else if(simulation.bmp_status.toUpperCase() === 'FAILED' && !isStringJSON(simulation.bmp_result)) {
            return (
                <div className="d-flex flex-column">
                    <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                        <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='text-danger'>refresh</Icon>
                        <span className="text-small fw-bold text-danger text-uppercase" >{ t('COMMON.TRY_AGAIN') }</span>
                    </div>
                    <TextField value={ simulation?.bmp_result || "" } className="mb-20" multiline rows={ 4 }/>
                </div>
            );
        }
        else if(simulation.bmp_status.toUpperCase() === 'FINISHED' || isStringJSON(simulation.bmp_result)) {
            const data = JSON.parse(simulation.bmp_result);
            const substrates = data.substrates;
            const bmpValuesColumns = [t('COMMON.TIME') + ' (' + t('COMMON.DAYS').toLowerCase() + ')', t('COMMON.VALUES') + ' (mL/g)', t('COMMON.PREDICTED_VALUES') + ' (mL/g)'];

            const predictionsChartData = substrate => ({
                labels: data.time.map(time => time.toFixed(2).replace(/\.00$/, '')),
                datasets: [
                    {
                        label: t('COMMON.VALUES') + ' (mL/g)',
                        data: substrate.values.map(value => value.toFixed(2).replace(/\.00$/, '')),
                        fill: false,
                        borderColor: "#565a5c"
                    },
                    {
                        label: t('COMMON.PREDICTED_VALUES') + ' (mL/g)',
                        data: substrate.predicted_values.map(value => value.toFixed(2).replace(/\.00$/, '')),
                        fill: false,
                        borderColor: "#61c250"
                    }
                ]
            });
            const predictionsChartOptions = {
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.TIME') + ' (' + t('COMMON.DAYS').toLowerCase() + ')'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.VALUES') + ' (mL/g)'
                        }
                    }
                }
            };

            return (
                <div className="d-flex flex-column">
                    {
                        substrates.map((substrate, index) => {
                            return (
                                <div key={ index } className="d-flex flex-column m-10">
                                    <Container style={{ marginTop: isPrinting ? 60 : null, marginBottom: isPrinting ? 60 : null }} icon={ !isPrinting } title={ <span className="text-medium primary-color fw-bold text-uppercase">{ substrate.name.replace('; ', '') }</span> }>
                                        <span className="text-small fw-bold secondary-color text-uppercase mt-10">{ t('PAGES.SIMULATION.PREDICTIONS') } <span className="text-danger">{ substrate.status_code != 0 && '(' + t('COMMON.FAILED') + ')' }</span></span>
                                        <Line data={ predictionsChartData(substrate) } options={ predictionsChartOptions } className='mb-30'/>
                                        <div className="d-flex flex-column" style={{ height: 500, overflow: 'auto' }}>
                                        {
                                            /* Values Table */
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        {
                                                            bmpValuesColumns.map((column, colIndex) => (
                                                                <th key={ colIndex } scope="col">{ column }</th>
                                                            ))
                                                        }
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        substrate.values.map((value, valIndex) => (
                                                            <tr key={ valIndex }>
                                                                <th scope="row">{ data.time[valIndex].toFixed(2).replace(/\.00$/, '') }</th>
                                                                <td>{ value === undefined ? '-' : value.toFixed(2).replace(/\.00$/, '') }</td>
                                                                <td>{ substrate?.predicted_values[valIndex] === undefined ? '-' : substrate?.predicted_values[valIndex].toFixed(2).replace(/\.00$/, '') }</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        }
                                        </div>
                                        <div className="d-flex mt-10 flex-column">
                                            <span className="text-small fw-bold secondary-color text-uppercase">{ t('PAGES.SIMULATION.PARAMETERS') } <span className="text-danger">{ substrate.params.status_code != 0 && '(' + t('COMMON.FAILED') + ')' }</span></span>
                                            { substrate.params.status_code != 0 && renderErrors('parameters', substrate.params) }
                                        </div>
                                        {
                                            /* Parameters Table */
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th scope="col">{ t('COMMON.NAME') }</th>
                                                        <th scope="col">{ t('COMMON.UNIT') }</th>
                                                        <th scope="col">{ t('COMMON.VALUE') }</th>
                                                        <th scope="col">{ 'ci_inf' }</th>
                                                        <th scope="col">{ 'ci_sup' }</th>
                                                        <th scope="col">{ 'se' }</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        substrate.params.params.map((param, paramIndex) => (
                                                            <tr key={ paramIndex }>
                                                                <th scope="row">{ param?.name + ' (' + (paramIndex === 0 ? 'Bo' : 'kh') + ')' }</th>
                                                                <td>{ (paramIndex === 0 ? 'mL CH4' : 'd^-1') }</td>
                                                                <td>{ param?.value.toFixed(2).replace(/\.00$/, '') }</td>
                                                                <td>{ param?.ci_inf.toFixed(2).replace(/\.00$/, '') }</td>
                                                                <td>{ param?.ci_sup.toFixed(2).replace(/\.00$/, '') }</td>
                                                                <td>{ param?.se.toFixed(2).replace(/\.00$/, '') }</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        }

                                        <div className="d-flex mt-10 flex-column">
                                            <span className="text-small fw-bold secondary-color text-uppercase">{ t('PAGES.SIMULATION.METRICS') } <span className="text-danger">{ substrate.metrics.status_code != 0 && '(' + t('COMMON.FAILED') + ')' }</span></span>
                                            { substrate.metrics.status_code != 0 && renderErrors('metrics', substrate.metrics) }
                                        </div>
                                        {
                                            /* Metrics Table */
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th scope="col">{ t('COMMON.NAME') }</th>
                                                        <th scope="col">{ t('COMMON.VALUE') }</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        substrate.metrics.metrics.map((metric, metricIndex) => (
                                                            <tr key={ metricIndex }>
                                                                <th scope="row">{ metric?.name }</th>
                                                                <td>{ metric?.value.toExponential(2) }</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        }
                                    </Container>
                                </div>
                            );
                        })
                    }
                </div>
            );
        }
        else return <></>;
    };

    const CstrDataInfo = () => {
        if(simulation.cstr_status.toUpperCase() === 'RUNNING' || simulation.cstr_status.toUpperCase() === 'PENDING') {
            return (
                <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                    <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='primary-color'>refresh</Icon>
                    <span className="text-small fw-bold primary-color text-uppercase" >{ t('COMMON.RELOAD') }</span>
                </div>
            );
        }
        else if(simulation.cstr_status.toUpperCase() === 'FAILED') {
            return (
                <div className="d-flex flex-column">
                    <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                        <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='text-danger'>refresh</Icon>
                        <span className="text-small fw-bold text-danger text-uppercase" >{ t('COMMON.TRY_AGAIN') }</span>
                    </div>
                    <TextField value={ simulation?.cstr_result || "" } className="mb-20" multiline rows={ 4 }/>
                </div>
            );
        }
        else if(simulation.cstr_status.toUpperCase() === 'FINISHED') {
            const bmpData = JSON.parse(simulation.bmp_result);
            const data = JSON.parse(simulation.cstr_result);
            const substrates = bmpData.substrates;

            const chartData = (result, index) => {
                return {
                    labels: new Array(result.value.length).fill(0).map((_, i) => i),
                    datasets: [
                        {
                            label: t('COMMON.VALUES') + ' (' + (index === 0 ? 'm3/d' : 'Efluent pH') + ')',
                            data: result.value.map(value => value.toFixed(2).replace(/\.00$/, '')),
                            fill: false,
                            borderColor: "#565a5c"
                        },
                        {
                            label: t('COMMON.MIN_VALUES') + ' (' + (index === 0 ? 'm3/d' : 'Efluent pH') + ')',
                            data: result.min.map(value => value.toFixed(2).replace(/\.00$/, '')),
                            fill: false,
                            borderColor: "#61c250"
                        },
                        {
                            label: t('COMMON.MAX_VALUES') + ' (' + (index === 0 ? 'm3/d' : 'Efluent pH') + ')',
                            data: result.max.map(value => value.toFixed(2).replace(/\.00$/, '')),
                            fill: false,
                            borderColor: "#81e070"
                        }
                    ]
                };
            };
            const gasChartOptions = {
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.TIME') + ' (' + t('COMMON.DAYS') + ')'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.VALUES') + ' (m3/d)'
                        }
                    }
                }
            };
            const phChartOptions = {
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.TIME') + ' (' + t('COMMON.DAYS') + ')'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t('COMMON.VALUES') + ' (Efluent pH)'
                        }
                    }
                }
            };
            return (
                <div className="d-flex flex-column">
                    {
                        substrates.map((substrate, index) => {
                            const results = data[index];
                            const totalSubstrateDays = substrate.values.length;
                            const totalResultDays = results ? results[0].value.length : 0;
                            let error = false;

                            if(totalResultDays < totalSubstrateDays)
                            error = true;

                            if(!results) return <div key={ index }/>;
                            return (
                                <div key={ index } className="d-flex flex-column m-10">
                                    <Container style={{ marginTop: isPrinting ? 60 : null, marginBottom: isPrinting ? 60 : null }} icon={ !isPrinting } title={ <span className="text-medium primary-color fw-bold text-uppercase">{ substrate.name.replace('; ', '') }</span> }>
                                        {
                                            error &&
                                            <ul className="border-box m-10" style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}>
                                                <li className='m-10'><span className="text-small">{ t('PAGES.SIMULATION.ERRORS.CSTR_ERROR') }</span></li>
                                            </ul>
                                        }
                                        {
                                            results.map((result, resultIndex) => {
                                                if(result.name == 'energy') return <div key={ resultIndex }/>;
                                                return (
                                                    <div key={ resultIndex } className="d-flex flex-column m-10">
                                                        <span className="text-small fw-bold secondary-color text-uppercase">{ result.name }</span>
                                                        <Line data={ chartData(result, resultIndex) } options={ resultIndex === 0 ? gasChartOptions : phChartOptions } className='mb-30' width={ 500 }/>
                                                        {/*
                                                            <table className="table">
                                                                <thead>
                                                                    <tr>
                                                                        {
                                                                            columns.map((column, colIndex) => (
                                                                                <th key={ colIndex } scope="col">{ column }</th>
                                                                            ))
                                                                        }
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {
                                                                        result.value.map((value, valIndex) => (
                                                                            <tr key={ valIndex }>
                                                                                <th scope="row">{ valIndex }</th>
                                                                                <td>{ value }</td>
                                                                                <td>{ result.min[valIndex] }</td>
                                                                                <td>{ result.max[valIndex] }</td>
                                                                            </tr>
                                                                        ))
                                                                    }
                                                                </tbody>
                                                            </table>
                                                        */}
                                                    </div>
                                                )
                                            })
                                        }
                                    </Container>
                                </div>
                            );
                        })
                    }
                </div>
            );
        }
        else return <></>;
    };

    const EnergyDataInfo = () => {
        const energyStatus =
            (simulation.submit_data.type === 'plant_operation' ?
                simulation.cstr_status.toUpperCase() :
                simulation.bmp_status.toUpperCase()) === 'FINISHED' ? 'FINISHED' : 'PENDING';
                
        if(energyStatus === 'RUNNING' || energyStatus === 'PENDING') {
            return (
                <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                    <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='primary-color'>refresh</Icon>
                    <span className="text-small fw-bold primary-color text-uppercase" >{ t('COMMON.RELOAD') }</span>
                </div>
            );
        }
        else if(energyStatus === 'FAILED') {
            return (
                <div className="d-flex flex-column">
                    <div className="d-flex flex-row align-items-center cursor-pointer" onClick={ () => startSimulation() }>
                        <Icon sx={{ fontSize: 15, marginRight: '5px' }} className='text-danger'>refresh</Icon>
                        <span className="text-small fw-bold text-danger text-uppercase" >{ t('COMMON.TRY_AGAIN') }</span>
                    </div>
                    <TextField value={ simulation?.bmp_result || "" } className="mb-20" multiline rows={ 4 }/>
                </div>
            );
        }
        else if(energyStatus === 'FINISHED') {
            if(simulation.submit_data.type === 'plant_operation') {
                const data = JSON.parse(simulation.cstr_result);
                const bmpData = JSON.parse(simulation.bmp_result);
                const substrates = bmpData.substrates;
                
                const getEnergyColor = (name) => {
                    switch(name) {
                        case 'EBG': return '#565a5c';
                        case 'ETG': return '#61c250';
                        case 'EEG': return '#81e070';
                        default: return '#cccccc';
                    }
                };

                const chartData = (energy) => {
                    let length = 0;
                    Object.keys(energy).forEach(key => {
                        if(length < Object.values(energy[key]).length)
                        length = Object.values(energy[key]).length;
                    });

                    const datasets = [];
                    Object.keys(energy).forEach(key => {
                        datasets.push({
                            label: key,
                            data: Object.values(energy[key]).map(value => value.toFixed(2).replace(/\.00$/, '')),
                            fill: false,
                            borderColor: getEnergyColor(key)
                        });
                    });

                    return {
                        labels: new Array(length).fill(0).map((_, i) => i),
                        datasets: datasets
                    };
                };
                const chartOptions = {
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: t('COMMON.TIME') + ' (' + t('COMMON.DAYS') + ')'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: t('COMMON.VALUES') + ' (MWh/' + t('COMMON.YEAR') + ')'
                            }
                        }
                    }
                };

                return (
                    <div className="d-flex flex-column">
                        {
                            substrates.map((substrate, index) => {
                                try {
                                    const energy = data[index].filter(r => r.name === 'energy')[0].value;
                                    return (
                                        <div key={ index } className="d-flex flex-column m-10">
                                            <Container style={{ marginTop: isPrinting ? 60 : null, marginBottom: isPrinting ? 60 : null }} icon={ !isPrinting } title={ <span className="text-medium primary-color fw-bold text-uppercase">{ substrate.name.replace('; ', '') }</span> }>
                                                <span className="text-small fw-bold secondary-color text-uppercase mt-10">{ t('PAGES.SIMULATION.ENERGY') }</span>
                                                <Line data={ chartData(energy) } options={ chartOptions } className='mb-30' width={ 500 }/>
                                            </Container>
                                        </div>
                                    );
                                }
                                catch(e) {
                                    return <></>;
                                }
                            })
                        }
                    </div>
                );
            }
            else {
                const data = JSON.parse(simulation.bmp_result);
                const substrates = data.substrates;

                return (
                    <div className="d-flex flex-column">
                        {
                            substrates.map((substrate, index) => {
                                return (
                                    <div key={ index } className="d-flex flex-column m-10">
                                        <Container style={{ marginTop: isPrinting ? 60 : null, marginBottom: isPrinting ? 60 : null }} icon={ !isPrinting } title={ <span className="text-medium primary-color fw-bold text-uppercase">{ substrate.name.replace('; ', '') }</span> }>
                                            <span className="text-small fw-bold secondary-color text-uppercase mt-10">{ t('PAGES.SIMULATION.ENERGY') }</span>
                                            {
                                                /* Energy Table */
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col">{ t('COMMON.NAME') }</th>
                                                            <th scope="col">{ t('COMMON.VALUE') + ' (MWh/' + t('COMMON.YEAR') + ')' }</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            substrate.energy.map((energy, energyIndex) => (
                                                                <tr key={ energyIndex }>
                                                                    <th scope="row">{ energy?.name }</th>
                                                                    <td>{ energy?.value.toFixed(2).replace(/\.00$/, '') }</td>
                                                                </tr>
                                                            ))
                                                        }
                                                    </tbody>
                                                </table>
                                            }
                                        </Container>
                                    </div>
                                );
                            })
                        }
                    </div>
                );
            }
        }
        else return <></>;
    };

    const renderPage = () => {
        switch(page) {
            case 0: return <></>;
            case 1: return <></>;
            case 2:
                const energyStatus =
                    (simulation.submit_data.type === 'plant_operation' ?
                        simulation.cstr_status.toUpperCase() :
                        simulation.bmp_status.toUpperCase()) === 'FINISHED' ? 'FINISHED' : 'PENDING';

                let simulationProgress = 0;
                const steps = simulation.submit_data.type === 'plant_operation' ? 4 : 3;
                const currentStep = simulation.submit_data.type === 'plant_operation' ?
                    (simulation.cstr_status.toUpperCase() === 'FINISHED' ? 4 : simulation.cstr_status.toUpperCase() === 'RUNNING' ? 3 : simulation.cstr_status.toUpperCase() === 'PENDING' ? 2 : 1) :
                    (simulation.bmp_status.toUpperCase() === 'FINISHED' ? 3 : simulation.bmp_status.toUpperCase() === 'RUNNING' ? 2 : simulation.bmp_status.toUpperCase() === 'PENDING' ? 1 : 0);
                
                const isFinished = getSimulationStatus(simulation) === 'COMMON.FINISHED' || getSimulationStatus(simulation) === 'COMMON.FAILED';
                simulationProgress = (currentStep / steps) * 100;

                if(simulation.submit_data.type === 'plant_operation' && simulation.cstr_status.toUpperCase() === 'RUNNING')
                simulationProgress = simulationProgress + (simulation.cstr_progress / steps);

                return (
                    <div className="d-flex flex-column">
                        <Box
                            component="form"
                            sx={{ '& > :not(style)': { m: 1, width: '150ch', maxWidth: '100%' } }}
                            autoComplete="off"
                        >
                            <div className="d-flex flex-column">
                                <span className="text-medium mb-30">{ t('PAGES.SIMULATION.DESCRIPTION') }</span>
                                {
                                    !isFinished &&
                                    <div className="d-flex flex-row">
                                        <Rings
                                            height="30"
                                            width="30"
                                            color="#DC3545"
                                            radius="6"
                                            wrapperStyle={{}}
                                            wrapperClass=""
                                            visible={true}
                                            ariaLabel="rings-loading"
                                        />
                                        <span className="text-medium fw-bold text-danger ml-10 mb-30">{ t('PAGES.SIMULATION.PROGRESS', { progress: simulationProgress.toFixed(2).replace(/\.00$/, '') }) }</span>
                                    </div>
                                }
                                
                                {
                                    isPrinting ?
                                        <>
                                            <div style={{ position: 'absolute', backgroundColor: 'white', width: '100%', height: '100%', zIndex: 10 }}/>
                                            <div className="d-flex flex-column" style={{ margin: 50 }} ref={ printRef }>
                                                <div className="d-flex flex-row m-50">
                                                    <div style={{ position: 'relative', width: '400px', height: '100px' }}>
                                                        <Image src="/img/logo.png" alt="logo" fill style={{ objectFit: 'contain' }}/>
                                                    </div>
                                                    <div style={{ borderLeft: '2px solid grey', width: '20px', height: '100px' }}/>
                                                    <div style={{ position: 'relative', width: '200px', height: '100px' }}>
                                                        <Image src="/img/modsim.png" alt="modsim" fill style={{ objectFit: 'contain' }}/>
                                                    </div>
                                                </div>
                                                <span className="title-medium primary-color fw-bold mt-10">{ t("PAGES.SIMULATION.PRINT_TITLE", { id: simulation.id, name: simulation.name }) }</span>
                                                <span className="text-medium">{ t("PAGES.SIMULATION.PRINT_SUBTITLE", { projectId: simulation.id_project, projectName: simulation.project_name }) }</span>
                                                <span className="text-medium mb-10">{ t("PAGES.SIMULATION.PRINT_GENERATED", { date: new Date().toLocaleString() + "" }) }</span>
                                                <Container style={{ margin: 50 }} icon={ false } expanded={ true } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '1. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_ONE') + ' (' + t('COMMON.' + simulation.load_data_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                    <LoadDataInfo/>
                                                </Container>
                                                
                                                <Container style={{ margin: 50 }} icon={ false } expanded={ true } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '2. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_TWO') + ' (' + t('COMMON.' + simulation.bmp_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                    <BmpDataInfo/>
                                                </Container>
            
                                                {
                                                    simulation.submit_data.type === 'plant_operation' &&
                                                    <Container style={{ margin: 50 }} icon={ false } expanded={ true } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '3. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_THREE') + ' (' + t('COMMON.' + simulation.cstr_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                        <CstrDataInfo/>
                                                    </Container>
                                                }

                                                <Container style={{ margin: 50 }} icon={ false } expanded={ true } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '' + (simulation.submit_data.type === 'plant_operation' ? '4' : '3') + '. ' + (simulation.submit_data.type === 'plant_operation' ? t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_FOURTH_TITLE') : t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_THREE_TITLE')) + ' - ' + t('PAGES.SIMULATION.ENERGY') + ' (' + t('COMMON.' + energyStatus).toUpperCase() + ')' }</span> }>
                                                    <EnergyDataInfo/>
                                                </Container>
                                            </div>
                                        </>
                                    :
                                        <>
                                            <Container expanded={ false } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '1. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_ONE') + ' (' + t('COMMON.' + simulation.load_data_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                <LoadDataInfo/>
                                            </Container>
                                            
                                            <Container expanded={ false } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '2. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_TWO') + ' (' + t('COMMON.' + simulation.bmp_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                <BmpDataInfo/>
                                            </Container>
            
                                            {
                                                simulation.submit_data.type === 'plant_operation' &&
                                                <Container expanded={ false } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '3. ' + t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_THREE') + ' (' + t('COMMON.' + simulation.cstr_status.toUpperCase()).toUpperCase() + ')' }</span> }>
                                                    <CstrDataInfo/>
                                                </Container>
                                            }

                                            <Container expanded={ false } title={ <span className="text-medium fw-bold mt-10 mb-10">{ '' + (simulation.submit_data.type === 'plant_operation' ? '4' : '3') + '. ' + (simulation.submit_data.type === 'plant_operation' ? t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_FOURTH_TITLE') : t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.RESULT_STEP_THREE_TITLE')) + ' - ' + t('PAGES.SIMULATION.ENERGY') + ' (' + t('COMMON.' + energyStatus).toUpperCase() + ')' }</span> }>
                                                <EnergyDataInfo/>
                                            </Container>
                                        </>
                                }
            
                                <div className="d-flex w-100 justify-content-center mt-20">
                                    <Button variant="contained" size="large" type="button" className="mr-10 w-100" onClick={ () => downloadInputFile() }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.DOWNLOAD_INPUT_FILE') }</Button>
                                    <Button variant="contained" size="large" type="button" className="w-100" color="success" onClick={ () => generateResultFile() }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.DOWNLOAD_RESULTS') }</Button>
                                </div>
                            </div>
                        </Box>
                    </div>
                );
        }
    };

    if(!id || !simulation) return <></>;
    return (
        <div className="d-flex flex-column">
            <Menu options={ [
                { title: t("ROUTES.PROJECTS.MY_PROJECTS"), link: '/projects' },
                { title: t("PAGES.PROJECTS.EDIT.SIMULATIONS") + ' | ' + (simulation?.project_name || '-'), link: "/projects/simulations?menu_page=1&id=" + simulation.id_project },
                t("PAGES.PROJECTS.EDIT.RESULTS") + ' | ' + (simulation?.name || '-')
            ] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
            { id > 0 && renderPage() }
        </div>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}