import { useState, useEffect, createRef } from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';
import ConfirmationDialog from "@/components/confirmationdialog";

const EditProject = ({ id, session, t, onCompleted }) => {
    const [project, setProject] = useState(null);
    const confirmationDialog = createRef();

    useEffect(() => {
        loader(true);

        const fetchData = async () => {
            const res = await protectedFetch(session, process.env.BACK_API_URL + "project?" + new URLSearchParams({ id_project: id }), "get", null, t);
            
            if(res.status === 200) {
                const data = await res.json();
                setProject(data);
            }
            loader(false);
        }
        fetchData();
    }, []);


    const handleSubmit = async e => {
        loader(true);
        e.preventDefault();

        const res = await protectedFetch(session, process.env.BACK_API_URL + "project?" + new URLSearchParams({ id_project: id }), "put", JSON.stringify(project), t);
        if(res.status === 200) {
            toast.success(t("COMMON.DATA_UPDATED"));
        }

        loader(false);
        onCompleted();
    };

    const handleDeleteProject = async (confirmed) => {
        if(confirmed) {
            loader(true);

            const res = await protectedFetch(session, process.env.BACK_API_URL + "project?" + new URLSearchParams({ id_project: id }), "delete", null, t);
            if(res.status === 200) {
                toast.success(t("PAGES.PROJECTS.EDIT.DELETED"));
            }

            loader(false);
            onCompleted();
        }
        else {
            if(confirmationDialog.current) {
                confirmationDialog.current.show();
            }
        }
    }

    return (<>
        <Box
            component="form"
            sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
            autoComplete="off"
            onSubmit={ handleSubmit }
        >
            <div className="d-flex flex-column">
                <TextField id="name" type={ "text" } label={ t("PAGES.PROJECTS.EDIT.PROJECT_NAME") } variant="outlined" className="mb-10"
                    value={ project?.name || "" } onChange={({ target }) => setProject({ ...project, name: target.value })} InputLabelProps={{ shrink: true }}/>
                <TextField id="description" type={ "description" } label={ t("PAGES.PROJECTS.EDIT.PROJECT_DESCRIPTION") } variant="outlined" className="mb-10" multiline rows={ 4 }
                    value={ project?.description || "" } onChange={({ target }) => setProject({ ...project, description: target.value })} InputLabelProps={{ shrink: true }}/>
                <Button variant="contained" size="large" type="submit" className="mb-10">{ t("COMMON.SAVE_CHANGES") }</Button>
                <Button variant="contained" size="large" type="button" color="error" onClick={ () => handleDeleteProject(false) } className="mb-10">{ t("COMMON.DELETE") }</Button>
            </div>
        </Box>
        <ConfirmationDialog ref={ confirmationDialog } description="PAGES.PROJECTS.EDIT.DELETE" callback={ (accepted) => accepted && handleDeleteProject(true) }/>
    </>);
};

export default EditProject;