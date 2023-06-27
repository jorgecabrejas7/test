export const getWindowDimensions = window => {
    if(typeof window !== "undefined") {
        const { innerWidth: width, innerHeight: height } = window;
        return {
            width,
            height
        };
    }
    else return null;
}

export const getTicketStatusColor = status => {
    switch(status) {
        case 'WAITING_RESPONSE': return '#d17d08';
        case 'ANSWERED': return '#73d108';
        default: return '#1e1e1e';
    }
}

export const getSimulationStatus = simulation => {
    let statusText = "";
    let submitData = null;

    if(typeof simulation.submit_data === 'string') submitData = JSON.parse(simulation.submit_data);
    else submitData = simulation.submit_data;
    
    if(simulation.load_data_status != 'finished') statusText = "COMMON." + simulation.load_data_status.toUpperCase();
    else if(simulation.bmp_status != 'finished') statusText = "COMMON." + simulation.bmp_status.toUpperCase();
    else if(submitData.type === 'plant_operation' && simulation.cstr_status != 'finished') statusText = "COMMON." + simulation.cstr_status.toUpperCase();
    else statusText = "COMMON.FINISHED";
    return statusText;
}

export const getSimulationStatusColor = simulation => {
    const status = getSimulationStatus(simulation);
    switch(status) {
        case 'COMMON.PENDING': return '#d17d08';
        case 'COMMON.RUNNING': return '#d17d08';
        case 'COMMON.FINISHED': return '#73d108';
        case 'COMMON.FAILED': return '#d10808';
        default: return '#1e1e1e';
    }
}

export const isStringJSON = str => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}