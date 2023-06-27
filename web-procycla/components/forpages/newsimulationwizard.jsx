import Wizard from "@/components/wizard";
import { useState } from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Icon from '@mui/material/Icon';
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { useSession } from "next-auth/react";
import { toast } from 'react-toastify';
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";

const NewSimulationWizard = ({ project, t, onCreated }) => {
    const session = useSession();
    const [step, setStep] = useState(0);
    const [data, setData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [sampleClusterMoving, setSampleClusterMoving] = useState(null);
    
    const initFormValues = {
        working_volume: 1000,
        headspace_volume: 100,
        flow: 50,
        total_cod: 100,
        soluble_cod: 10,
        volatile_solids: 8,
        ammonia_nitrogen: 0.5,
        total_nitrogen: 2,
        ph: 7,
        total_alkalinity: 2,
        partial_alkalinity: 0.5,
        file_type: "bpc"
    };
    const [formValues, setFormValues] = useState(initFormValues);

    const createSimulation = async () => {
        const response = await protectedFetch(session, process.env.BACK_API_URL + "simulation", "post", JSON.stringify({ name: formValues.name, description: formValues.description, submit_data: JSON.stringify(formValues), id_project: project }), t);
        if(response.status === 200) {
            const simulation = await response.json();
            const simulationId = simulation.id;
            
            const file = formValues.file;
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await protectedFetch(session, process.env.BACK_API_URL + "simulation/upload_input?" + new URLSearchParams({ simulation_id: simulationId }), "post", formData, t, true);
            if(uploadResponse.status === 200) {
                return simulation;
            }
            else {
                await protectedFetch(session, process.env.BACK_API_URL + "simulation?" + new URLSearchParams({ simulation_id: simulationId }), "put", JSON.stringify({ load_data_status: 'failed' }), t);
            }
        }
        return null;
    };

    const handleSubmit = async e => {
        e.preventDefault();

        if(step === 1) {
            loader(true);
            
            const file = formValues.file;
            const formData = new FormData();
            formData.append('file', file);

            if(formValues.file_type === "bpc") {
                const response = await protectedFetch(session, process.env.BACK_API_URL + "simulation/wrangling/BPC/load_file", "post", formData, t, true);
                if(response.status === 200) {
                    const data = await response.json();
                    const samples = data.samples;
                    const totalClusters = Math.max(...samples.map(sample => sample.cluster)) + 1;
                    const newClusters = [];
                    for(let i = 0; i < totalClusters; i++) {
                        const sample = samples.find(sample => sample.cluster === i);
                        
                        let type = 'control';
                        if(sample.name.toLowerCase().includes('blank')) type = 'blank';
                        else if(sample.substrate > 0.0) type = 'substrate';

                        let substrate = 0.0;
                        let blank_cluster = 'none';
                        if(type === 'substrate') {
                            substrate = sample.substrate;
                            blank_cluster = newClusters.findIndex(cluster => cluster.type === 'blank');
                            
                        }

                        newClusters.push({
                            type: type,
                            blank_cluster: blank_cluster,
                            substrate: substrate
                        });
                    }
                    
                    setClusters(newClusters);
                    setData(data);
                    setStep(step + 1);
                }
            }
            else if(formValues.file_type === "procycla") {
                const response = await protectedFetch(session, process.env.BACK_API_URL + "simulation/wrangling/procycla/load_file", "post", formData, t, true);
                if(response.status === 200) {
                    const data = await response.json();
                    setData(data);
                    setProcessedData(data);
                    setStep(step + 1);
                }
            }
            
            loader(false);
        }
        else if(step === 2 && formValues.file_type === "bpc") {
            loader(true);

            let newSamples = [];
            for(let i = 0; i < clusters.length; i++) {
                const cluster = clusters[i];
                const samplesInCluster = data.samples.filter(sample => sample.cluster === i);
                for(let j = 0; j < samplesInCluster.length; j++) {
                    const sample = samplesInCluster[j];
                    newSamples.push({
                        ...sample,
                        type: cluster.type,
                        blank: parseInt(cluster.blank_cluster),
                        substrate: parseFloat(cluster.substrate || 0.0)
                    });
                }
            }

            const submitData = { ...data, samples: newSamples };
            setData(submitData);
            const response = await protectedFetch(session, process.env.BACK_API_URL + "simulation/wrangling/BPC/process_data", "post", JSON.stringify(submitData), t);
            if(response.status === 200) {
                const responseJson = await response.json();
                setProcessedData(responseJson);
                setStep(step + 1);
            }

            loader(false);
        }
        else if((step === 2 && formValues.file_type === "procycla") || (step === 3 && formValues.file_type === "bpc")) {
            loader(true);
            
            const simulation = await createSimulation();
            if(simulation) {
                let response = await protectedFetch(session, process.env.BACK_API_URL + "simulation?" + new URLSearchParams({ simulation_id: simulation.id }), "put", JSON.stringify({ load_data_status: 'finished', load_data_result: JSON.stringify(processedData) }), t);
                if(response.status === 200) {
                    await protectedFetch(session, process.env.BACK_API_URL + "simulation/start?" + new URLSearchParams({ simulation_id: simulation.id }), "get", null, t);
                    
                    setFormValues(initFormValues);
                    setData(null);
                    setProcessedData(null);
                    setClusters(null);
                    setSampleClusterMoving(null);
                    setStep(0);
                    toast.success(t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SIMULATION_CREATED"));
                    onCreated();
                }
            }

            loader(false);
        }
        else setStep(step + 1);
    };

    const renderResume = () => {
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
                <span className='text-medium mb-10'>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_FINAL.DESCRIPTION') }</span>
                <Line data={ chartData } options={ chartOptions } className="mb-30"/>
                <div className="d-flex flex-column" style={{ height: 500, overflow: 'auto' }}>
                <table class="table">
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
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                    autoComplete="off"
                    onSubmit={ handleSubmit }
                >
                    <Button variant="contained" size="large" type="submit" className="w-100" color="success">{ t('COMMON.SIMULATE') }</Button>
                </Box>
            </div>
        );
    };

    const renderStep = () => {
        switch(step) {
            case 0:
                return (
                    <div className="d-flex flex-column align-items-center">
                        <span className='text-medium mb-10'>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_' + step + '.DESCRIPTION') }</span>
                        <Box
                            component="form"
                            sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                            autoComplete="off"
                            onSubmit={ handleSubmit }
                        >
                            <div className="d-flex flex-column">
                                <span className="text-medium fw-bold mt-20 mb-10">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.BASIC_INFORMATION") }</span>
                                <TextField required id="name" type={ "text" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SIMULATION_NAME") } variant="outlined" className="mb-10"
                                    value={ formValues?.name || "" } onChange={({ target }) => setFormValues({ ...formValues, name: target.value })}/>
                                <TextField id="description" type={ "text" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SIMULATION_DESCRIPTION") } variant="outlined" className="mb-10" multiline rows={ 4 }
                                    value={ formValues?.description || "" } onChange={({ target }) => setFormValues({ ...formValues, description: target.value })}/>
                                <InputLabel id="type">{ t("COMMON.TYPE") }</InputLabel>
                                <Select
                                    required
                                    labelId="type"
                                    id="type"
                                    value={ formValues?.type || "" }
                                    label={ t("COMMON.TYPE") }
                                    className="mb-10"
                                    onChange={({ target }) => setFormValues({ ...formValues, type: target.value })}
                                >
                                    <MenuItem value={ "plant_operation" }>{ t("PROJECTS.SIMULATION_TYPES.PLANT_OPERATION") }</MenuItem>
                                    <MenuItem value={ "prefeasibility" }>{ t("PROJECTS.SIMULATION_TYPES.PREFEASIBILITY") }</MenuItem>
                                </Select>

                                {
                                    formValues.type === "plant_operation" &&
                                        <>
                                            <span className="text-medium fw-bold mt-20 mb-10">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.REACTOR_PARAMS") }</span>
                                            <TextField required id="working_volume" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.WORKING_VOLUME") } variant="outlined" className="mb-10"
                                                value={ formValues?.working_volume || "" } onChange={({ target }) => setFormValues({ ...formValues, working_volume: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">m3</span> }}/>
                                            <TextField id="headspace_volume" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.HEADSPACE_VOLUME") } variant="outlined" className="mb-10"
                                                value={ formValues?.headspace_volume || "" } onChange={({ target }) => setFormValues({ ...formValues, headspace_volume: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">m3</span> }}/>
                                        
                                            <span className="text-medium fw-bold mt-20 mb-10">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SUBSTRATE_PARAMS") }</span>
                                            <TextField id="flow" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.FLOW") } variant="outlined" className="mb-10"
                                                value={ formValues?.flow || "" } onChange={({ target }) => setFormValues({ ...formValues, flow: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">m3/d</span> }}/>
                                            <TextField id="total_cod" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.TOTAL_COD") } variant="outlined" className="mb-10"
                                                value={ formValues?.total_cod || "" } onChange={({ target }) => setFormValues({ ...formValues, total_cod: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kgCOD/m3</span> }}/>
                                            <TextField id="soluble_cod" type={ "soluble_cod" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SOLUBLE_COD") } variant="outlined" className="mb-10"
                                                value={ formValues?.soluble_cod || "" } onChange={({ target }) => setFormValues({ ...formValues, soluble_cod: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kgCOD/m3</span> }}/>
                                            <TextField id="volatile_solids" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.VOLATILE_SOLIDS") } variant="outlined" className="mb-10"
                                                value={ formValues?.volatile_solids || "" } onChange={({ target }) => setFormValues({ ...formValues, volatile_solids: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">%</span> }}/>
                                            <TextField id="ammonia_nitrogen" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.AMMONIA_NITROGEN") } variant="outlined" className="mb-10"
                                                value={ formValues?.ammonia_nitrogen || "" } onChange={({ target }) => setFormValues({ ...formValues, ammonia_nitrogen: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kg/m3</span> }}/>
                                            <TextField id="total_nitrogen" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.TOTAL_NITROGEN") } variant="outlined" className="mb-10"
                                                value={ formValues?.total_nitrogen || "" } onChange={({ target }) => setFormValues({ ...formValues, total_nitrogen: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kg/m3</span> }}/>
                                            <TextField id="ph" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.PH") } variant="outlined" className="mb-10"
                                                value={ formValues?.ph || "" } onChange={({ target }) => setFormValues({ ...formValues, ph: target.value })}/>
                                            <TextField id="total_alkalinity" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.TOTAL_ALKALINITY") } variant="outlined" className="mb-10"
                                                value={ formValues?.total_alkalinity || "" } onChange={({ target }) => setFormValues({ ...formValues, total_alkalinity: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kgCaCO3/m3</span> }}/>
                                            <TextField id="partial_alkalinity" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.PARTIAL_ALKALINITY") } variant="outlined" className="mb-10"
                                                value={ formValues?.partial_alkalinity || "" } onChange={({ target }) => setFormValues({ ...formValues, partial_alkalinity: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">kgCaCO3/m3</span> }}/>
                                        </>
                                }
                                {
                                    formValues.type === "prefeasibility" &&
                                        <>
                                            <span className="text-medium fw-bold mt-20 mb-10">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.SUBSTRATE_PARAMS") }</span>
                                            <TextField id="flow" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.FLOW") } variant="outlined" className="mb-10"
                                                value={ formValues?.flow || "" } onChange={({ target }) => setFormValues({ ...formValues, flow: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">m3/d</span> }}/>
                                            <TextField id="volatile_solids" type={ "number" } label={ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.VOLATILE_SOLIDS") } variant="outlined" className="mb-10"
                                                value={ formValues?.volatile_solids || "" } onChange={({ target }) => setFormValues({ ...formValues, volatile_solids: target.value })}
                                                InputProps={{ endAdornment: <span className="m-10 text-smal fw-bold">%</span> }}/>
                                        </>
                                }
                                <Button variant="contained" size="large" type="submit" className="w-100" color="success">{ t("COMMON.NEXT") }</Button>
                            </div>
                        </Box>
                    </div>
                );
            case 1:
                return (
                    <div className="d-flex flex-column align-items-center">
                        <span className='text-medium mb-10'>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_' + step + '.DESCRIPTION') }</span>
                        <Box
                            component="form"
                            sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                            autoComplete="off"
                            onSubmit={ handleSubmit }
                        >
                            <div className="d-flex flex-column">
                                <InputLabel id="file_type">{ t("COMMON.TYPE") }</InputLabel>
                                <Select
                                    required
                                    labelId="file_type"
                                    id="file_type"
                                    value={ formValues?.file_type || "" }
                                    label={ t("COMMON.TYPE") }
                                    className="mb-10"
                                    onChange={({ target }) => setFormValues({ ...formValues, file_type: target.value })}
                                >
                                    <MenuItem value={ "procycla" }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.FORMAT_FILES.PROCYCLA') }</MenuItem>
                                    <MenuItem value={ "bpc" }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.FORMAT_FILES.BPC') }</MenuItem>
                                </Select>
                                <TextField
                                    id="file"
                                    label={ t('COMMON.FILE') }
                                    required
                                    value={ formValues?.file?.name || "" }
                                    variant="outlined"
                                    className="mb-10"
                                    disabled
                                    InputProps={{ endAdornment: <Button variant="contained" size="large" type="button" color="success" component="label"><Icon className="text-light">upload_file</Icon><input hidden accept="*/*" type="file" onChange={({ target }) => setFormValues({ ...formValues, file: target.files[0] })}/></Button> }}
                                />
                                <div className="d-flex flex-row">
                                    <Button variant="contained" size="large" type="button" className="w-100 mr-10" onClick={ () => setStep(step - 1) }>{ t('COMMON.PREV') }</Button>
                                    <Button variant="contained" size="large" type="submit" className="w-100" color="success">{ t('COMMON.NEXT') }</Button>
                                </div>
                            </div>
                        </Box>
                    </div>
                );
            case 2:
                if(formValues.file_type === 'procycla') {
                    return renderResume();
                }
                else if(formValues.file_type === 'bpc' && clusters && clusters.length > 0 && data.samples && data.samples.length > 0) {
                    const setSampleCluster = (sample, clusterIndex) => {
                        if(clusterIndex >= 0 && clusterIndex < clusters.length) {
                            const newSamples = data.samples.map(s => s.id === sample.id ? { ...s, cluster: clusterIndex } : s);
                            setData({ ...data, samples: newSamples });
                        }
                    };

                    return (
                        <div className="d-flex flex-column align-items-center">
                            <span className='text-medium mb-10'>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_' + step + '.DESCRIPTION') }</span>
                            <div className="d-flex flex-wrap justify-content-center">
                                {
                                    clusters.map((cluster, index) => (
                                        <div key={ index } className="d-flex flex-column m-50 border-box p-10" style={{ width: 300, backgroundColor: '#e0e1dd', zIndex: 1, position: 'relative' }}>
                                            <span className="text-medium fw-bold m-10">{ t('COMMON.CLUSTER') + ' ' + (index + 1) }</span>
                                            <hr/>
                                            <div className="d-flex flex-column">
                                                {
                                                    data.samples.filter(sample => sample.cluster === index).map(sample => (
                                                        <div key={ sample.id }>
                                                            <div className="d-flex flex-row justify-content-between align-items-center m-10 cursor-pointer" onClick={ () => sampleClusterMoving?.id === sample.id ? setSampleClusterMoving(null) : setSampleClusterMoving(sample) }>
                                                                <span className="text-medium">{ sample.name }</span>
                                                                <Icon>{ sampleClusterMoving?.id === sample.id ? 'arrow_drop_down' : 'arrow_left' }</Icon>
                                                            </div>
                                                            {
                                                                sampleClusterMoving?.id === sample.id && 
                                                                <div className="d-flex flex-column border-box p-10" style={{ backgroundColor: '#c0c2bc', zIndex: 10, position: 'absolute', width: 'calc(100% - 20px)' }}>
                                                                    <span className="text-medium fw-bold">{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.SEND_TO') }</span>
                                                                    <hr/>
                                                                    {
                                                                        clusters.map((c, i) => (
                                                                            i !== index &&
                                                                            <span key={ i } className="text-medium cursor-pointer m-10" onClick={ () => { setSampleClusterMoving(null); setSampleCluster(sample, i) } }>{ t('COMMON.CLUSTER') + ' ' + (i + 1) }</span>
                                                                        ))
                                                                    }
                                                                </div>
                                                            }
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                            <span className="mb-20"/>
                                            <InputLabel id="type">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.CLUSTER_TYPE") }</InputLabel>
                                            <Select
                                                id="type"
                                                value={ cluster.type }
                                                onChange={({ target }) => setClusters(clusters.map((c, i) => i === index ? { ...c, type: target.value } : c)) }
                                                className="mb-10"
                                            >
                                                <MenuItem value={ "blank" }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.BLANK') }</MenuItem>
                                                <MenuItem value={ "substrate" }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.SUBSTRATE') }</MenuItem>
                                                <MenuItem value={ "control" }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.CONTROL') }</MenuItem>
                                            </Select>
                                            {
                                                cluster.type === 'substrate' && <>
                                                    <InputLabel id="blank_cluster">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.BLANK_CLUSTER") }</InputLabel>
                                                    <Select
                                                        type="blank_cluster"
                                                        value={ cluster.blank_cluster }
                                                        onChange={({ target }) => setClusters(clusters.map((c, i) => i === index ? { ...c, blank_cluster: target.value } : c)) }
                                                        className="mb-10"
                                                    >
                                                        <MenuItem value={ "none" }>{ t('COMMON.NONE') }</MenuItem>
                                                        {
                                                            clusters.map((c, i) => (
                                                                <MenuItem key={ i } value={ i }>{ t('COMMON.CLUSTER') + ' ' + (i + 1) }</MenuItem>
                                                            ))
                                                        }
                                                    </Select>
                                                    <InputLabel id="cluster_value">{ t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.CLUSTER_VALUE") }</InputLabel>
                                                    <TextField id="cluster_value" type={ "number" } value={ cluster.substrate } variant="outlined" className="mb-10"
                                                        onChange={({ target }) => setClusters(clusters.map((c, i) => i === index ? { ...c, substrate: target.value } : c)) }/>
                                                </>
                                            }
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="d-flex flex-row m-30">
                                <Button className="mb-10 mr-10" onClick={ () => setClusters([ ...clusters, { type: 'blank', blank_cluster: 'none', substrate: 0.0 } ]) }>{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.ADD_CLUSTER') }</Button>
                                <Button className="mb-10" onClick={ () => clusters.length > 1 && setClusters(clusters.slice(0, -1)) } color="error">{ t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.REMOVE_CLUSTER') }</Button>
                            </div>
                            <Box
                                component="form"
                                sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                                autoComplete="off"
                                onSubmit={ handleSubmit }
                            >
                                <div className="d-flex flex-row">
                                    <Button variant="contained" size="large" type="button" className="w-100 mr-10" onClick={ () => setStep(step - 1) }>{ t('COMMON.PREV') }</Button>
                                    <Button variant="contained" size="large" type="submit" className="w-100" color="success">{ t('COMMON.NEXT') }</Button>
                                </div>
                            </Box>
                        </div>
                    );
                }
                else return <></>;
            case 3:
                return renderResume();
        }
    }

    const steps = [];
    steps.push(t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_0.TITLE'));
    steps.push(t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_1.TITLE'));
    if (formValues.file_type === 'procycla') {
        steps.push(t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_FINAL.TITLE'));
    } else {
        steps.push(t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_2.TITLE'));
        steps.push(t('PAGES.PROJECTS.EDIT.NEW_SIMULATION.STEP_FINAL.TITLE'));
    }

    return (
        <div className="d-flex flex-column w-100">
            <Wizard steps={ steps } wizardStepChanged={ selectedStep => setStep(selectedStep) } selectedStep={ step }/>
            <div className={ "d-flex w-100 justify-content-center" }>
                <div className={ "d-flex flex-column justify-content-between align-items-left" } style={{ width: '90%' }}>
                    { renderStep() }
                </div>
            </div>
        </div>
    );
};

export default NewSimulationWizard;