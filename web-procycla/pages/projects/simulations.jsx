import Menu from "@/components/menu";
import { useState, useEffect, createRef } from "react";
import Button from '@mui/material/Button';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useSession } from "next-auth/react";
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ExtendedTable from '@/components/extendedtable';
import NewSimulationWizard from "@/components/forpages/newsimulationwizard";
import Link from 'next/link';
import { getSimulationStatus, getSimulationStatusColor } from "@/lib/functions";
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import ConfirmationDialog from "@/components/confirmationdialog";
import { toast } from 'react-toastify';

export default () => {
    const { t } = useTranslation('common');
    
    const router = useRouter();
    const [id, setId] = useState(parseInt(router.query.id || 0));
    const session = useSession();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [project, setProject] = useState(null);
    const [selectedSimulation, setSelectedSimulation] = useState(null);
    const confirmationDialog = createRef();
    const extendedTable = createRef();

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        if(id > 0 && session.status === "authenticated") {
            const fetchProject = async () => {
                const res = await protectedFetch(session, process.env.BACK_API_URL + "project?" + new URLSearchParams({ id_project: id }), "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setProject(data);
                }

                loader(false);
            };
            fetchProject();
        }
    }, [session.status, id]);
    
    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(menu_page === 0) return;
        
        if(page != menu_page)
        setPage(menu_page);

        let { id: id_query } = router.query;
        if(id_query) id_query = parseInt(id_query);
        if(id != id_query) setId(id_query);
    }, [router.query]);

    const handleDeleteSimulation = async (confirmed) => {
        if(confirmed) {
            loader(true);
            const res = await protectedFetch(session, process.env.BACK_API_URL + "simulation?" + new URLSearchParams({ simulation_id: selectedSimulation }), "delete", null, t);
            
            if(res.status === 200) {
                if(extendedTable?.current) {
                    const rowIndex = extendedTable.current.getRowIndexById(selectedSimulation);
                    extendedTable.current.deleteRow(rowIndex);
                }
                toast.success(t("PAGES.PROJECTS.EDIT.DELETE_SIMULATION_SUCCESS"));
            }

            loader(false);
        }
        else {
            if(confirmationDialog.current) {
                confirmationDialog.current.show();
            }
        }
    };

    const renderPage = () => {
        if(page === 1) {
            const columns = [
                { field: 'id', headerName: t("COMMON.ID"), width: 60, hide: true },
                { field: 'createdAt', headerName: t("COMMON.DATE"), width: 200 },
                { field: 'name', headerName: t("COMMON.NAME"), width: 250 },
                { field: 'status', headerName: t('COMMON.STATUS'), width: 250, renderCell: ({ row }) => <span style={{ color: getSimulationStatusColor(row) }}>{ t(getSimulationStatus(row)) }</span> },
                {
                    field: 'actions',
                    headerName: t("COMMON.ACTIONS"),
                    width: 400,
                    sortable: false,
                    renderCell: (cell) => {
                        const { row } = cell;
                        return (
                            <div>
                                <Link href={ '/projects/simulation?menu_page=2&id=' + row.id }><Button variant="contained" type="button" className="mr-10">{ t('PAGES.PROJECTS.EDIT.VIEW_RESULTS') }</Button></Link>
                                <Button variant="outlined" type="button" color="error" onClick={ () => { setSelectedSimulation(row.id); handleDeleteSimulation(false); } }>{ t('PAGES.PROJECTS.EDIT.DELETE_SIMULATION') }</Button>
                            </div>
                        );
                    }
                }
            ];

            return (
                <ExtendedTable
                    ref={ extendedTable }
                    columns={ columns }
                    pageSize={ 20 }
                    options={{
                        session: session,
                        fetchUrl: process.env.BACK_API_URL + "simulation?" + new URLSearchParams({ id_project: id }),
                        t: t
                    }}
                />
            );
        }
        else if(page === 2) {
            return <NewSimulationWizard project={ id } t={ t } onCreated={ () => setPage(1) }/>;
        }
        else return <></>;
    };

    return (
        <div className="d-flex flex-column">
            <Menu options={ [
                { title: t("ROUTES.PROJECTS.MY_PROJECTS"), link: "/projects" },
                t("PAGES.PROJECTS.EDIT.SIMULATIONS") + ' | ' + (project?.name || '-'),
                t("PAGES.PROJECTS.EDIT.NEW_SIMULATION.TITLE")
            ] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
            { id > 0 && renderPage() }
            <ConfirmationDialog ref={ confirmationDialog } description="PAGES.PROJECTS.EDIT.DELETE_SIMULATION_DIALOG" callback={ (accepted) => accepted && handleDeleteSimulation(true) }/>
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