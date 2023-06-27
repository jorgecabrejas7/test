import styles from "@/styles/wizard.module.css";
import { useState, useEffect } from "react";
import Icon from '@mui/material/Icon';

const Wizard = ({ steps, wizardStepChanged, selectedStep }) => {
    const [selected, setSelected] = useState(selectedStep || 0);

    const switchToWizardStep = index => {
        setSelected(index);
        wizardStepChanged(index);
    }

    useEffect(() => {
        if(typeof selectedStep === 'number' && selected != selectedStep)
        setSelected(selectedStep);
    }, [selectedStep]);
    
    return (
        <div className={ "d-flex w-100 justify-content-center" }>
            <div className={ "d-flex flex-row justify-content-between align-items-center " + styles.wizardContainer }>
                <div className={ styles.wizardBar }/>
                {
                    steps.map((step, index) => {
                        return (
                            <div key={ index } className={ "d-flex flex-column align-items-center " + (selected > index && 'cursor-pointer') } onClick={ () => selected > index && switchToWizardStep(index) }>
                                <Icon className={ styles.wizardStepIcon }>{ selected === index ? 'radio_button_checked' : (selected < index ? 'radio_button_unchecked' : 'task_alt') }</Icon>
                                <span className={ styles.wizardStep + " text-medium " + (selected === index ? 'fw-bold' : '') }>{ step }</span>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    );
};

export default Wizard;