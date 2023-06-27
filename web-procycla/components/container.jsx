import Icon from '@mui/material/Icon';
import { useState } from 'react';

const Container = ({ title, children, expanded = true, icon = true, margin = null, style = null }) => {
    const [isExpanded, setIsExpanded] = useState(expanded);

    return (
        <div className='d-flex flex-column' style={ style }>
            <div className='d-flex flex-row align-items-center'>
                { icon && <Icon onClick={ () => setIsExpanded(!isExpanded) } style={{ fontSize: "10pt", marginRight: '5px' }} className='cursor-pointer'>{ isExpanded ? 'remove_circle' : 'add_circle' }</Icon> }
                { title }
            </div>
            <div style={{ display: isExpanded ? 'unset' : 'none' }}>
                { children }
            </div>
        </div>
    );
};

export default Container;