import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";
import { createRef } from "react";
import { useTranslation } from 'next-i18next';
import ExtendedTable from '@/components/extendedtable';
import Link from "next/link";
import Menu from "@/components/menu";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';
import EditProject from "@/components/forpages/editproject";

export default () => {
    const router = useRouter();
    const { t } = useTranslation('common');
    const session = useSession();
    const extendedTable = createRef();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [editMode, setEditMode] = useState(null);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);
    }, [router.query]);

    useEffect(() => {
        if(page === 0 && editMode)
        setEditMode(null);
    }, [page]);

    /* New Project */
    const [newProjectFormValues, setnewProjectFormValues] = useState(null);

    const handleNewProjectSubmit = async e => {
        loader(true);
        e.preventDefault();

        const response = await protectedFetch(session, process.env.BACK_API_URL + "project", "post", JSON.stringify(newProjectFormValues), t);
        if(response.status === 200) {
            toast.success(t("COMMON.DATA_SUBMITTED"));
            setnewProjectFormValues(null);
            setPage(0);
        }
        
        loader(false);
    };

    const renderPage = () => {
        switch(page) {
            case 1:
                if(editMode > 0) return <EditProject id={ editMode } session={ session } t={ t } onCompleted={ () => { setEditMode(null); setPage(0); } }/>;
                else {
                    return (
                        <div className="d-flex flex-column">
                            <Box
                                component="form"
                                sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                                autoComplete="off"
                                onSubmit={ handleNewProjectSubmit }
                            >
                                <div className="d-flex flex-column">
                                    <span className="text-medium mb-10">{ t('PAGES.PROJECTS.NEW_PROJECT_DESCRIPTION') }</span>
                                    <TextField required id="name" type={ "text" } label={ t("PAGES.PROJECTS.EDIT.PROJECT_NAME") } variant="outlined" className="mb-10"
                                        value={ newProjectFormValues?.name || "" } onChange={({ target }) => setnewProjectFormValues({ ...newProjectFormValues, name: target.value })}/>
                                    <TextField id="description" type={ "description" } label={ t("PAGES.PROJECTS.EDIT.PROJECT_DESCRIPTION") } variant="outlined" className="mb-10" multiline rows={ 4 }
                                        value={ newProjectFormValues?.description || "" } onChange={({ target }) => setnewProjectFormValues({ ...newProjectFormValues, description: target.value })}/>
                                    <Button variant="contained" size="large" type="submit">{ t("COMMON.SUBMIT") }</Button>
                                </div>
                            </Box>
                        </div>
                    );
                }
            case 0:
                const columns = [
                    { field: 'id', headerName: t("COMMON.ID"), width: 60, hide: true },
                    { field: 'createdAt', headerName: t("COMMON.DATE"), width: 200 },
                    { field: 'name', headerName: t("COMMON.NAME"), width: 250 },
                    { field: 'description', headerName: t("COMMON.DESCRIPTION"), width: 400 },
                    { field: 'simulations', headerName: t("PAGES.PROJECTS.EDIT.SIMULATIONS"), width: 250 },
                    {
                        field: 'actions',
                        headerName: t("COMMON.ACTIONS"),
                        width: 300,
                        sortable: false,
                        renderCell: ({ row }) => <div>
                            <Button variant="outlined" type="button" className="mr-10" onClick={ () => { setEditMode(row.id); setPage(1); } }>{ t("COMMON.EDIT") }</Button>
                            <Link href={`/projects/simulations?menu_page=1&id=${ row.id }`}><Button variant="contained" type="button" className="mr-10">{ t("PAGES.PROJECTS.EDIT.VIEW_SIMULATIONS") }</Button></Link>
                        </div>
                    }
                ];
            
                return (
                    <div className="d-flex flex-column">
                        <span className="text-medium mb-10">{ t('PAGES.PROJECTS.MY_PROJECTS_DESCRIPTION') }</span>
                        <ExtendedTable
                            ref={ extendedTable }
                            columns={ columns }
                            pageSize={ 20 }
                            options={{
                                session: session,
                                fetchUrl: process.env.BACK_API_URL + "project",
                                t: t
                            }}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="d-flex flex-column">
            <Menu options={ [ t("ROUTES.PROJECTS.MY_PROJECTS"), editMode === null ? t("ROUTES.PROJECTS.NEW_PROJECT") : t("ROUTES.PROJECTS.EDIT_PROJECT") ] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
            { renderPage() }
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