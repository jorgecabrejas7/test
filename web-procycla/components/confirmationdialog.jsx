import { useTranslation } from 'next-i18next';
import { useState, forwardRef, useImperativeHandle } from "react";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

const ConfirmationDialog = forwardRef(({ title = 'COMMON.CONFIRM', description, callback }, ref) => {
    const { t } = useTranslation('common');

    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
        show() {
            setOpen(true);
        },
        hide() {
            setOpen(false);
        }
    }));
    
    const handleDialog = (accepted) => {
        if(callback) callback(accepted);
        setOpen(false);
    };

    return (
        <Dialog
            open={ open }
            onClose={ () => handleDialog(false) }
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                <span className={ "text-big fw-bold" }>{ t(title) }</span>
            </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description" className="d-flex align-items-center">
                        { description && <span className={ "text-medium" }>{ t(description) }</span> }
                    </DialogContentText>
                </DialogContent>
            <DialogActions>
                <Button color="error" onClick={ () => handleDialog(false) }>{ t('COMMON.CANCEL') }</Button>
                <Button variant="outlined" onClick={ () => handleDialog(true) } >{ t('COMMON.ACCEPT') }</Button>
            </DialogActions>
        </Dialog>
    );
});

export default ConfirmationDialog;