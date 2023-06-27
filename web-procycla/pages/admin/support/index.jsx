import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { getTicketStatusColor } from "@/lib/functions";
import Link from "next/link";
import Menu from "@/components/menu";
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');

    const router = useRouter();
    const session = useSession();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [formValues, setFormValues] = useState({ type: "monthly_digest" });

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);
    }, [router.query]);

    const handleSubmit = async e => {
        loader(true);
        e.preventDefault();

        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "admin/ticket",
            "post", JSON.stringify(formValues), t);
        
        if(res.status === 200) {
            setFormValues({ type: "monthly_digest" });
            toast.success(t("COMMON.DATA_SUBMITTED"));

            const ticket = await res.json();
            const user = session.data.user;
        }

        loader(false);
    };

    const renderPage = () => {
        if(page === 0) {
            const columns = [
                { field: 'updatedAt', headerName: t("COMMON.DATE"), width: 200 },
                {
                    field: 'type',
                    headerName: t("COMMON.TYPE"),
                    width: 200,
                    renderCell: ({ row }) => <span className={ row.type !== "ticket" ? "primary-color" : "" }>{ t("PAGES.PROFILE.SUPPORT.TYPE_" + row.type.toUpperCase()) }</span>
                },
                { field: 'from', headerName: t("COMMON.FROM"), width: 200, renderCell: ({ row }) => <span>{ row.user.email }</span> },
                { field: 'title', headerName: t("COMMON.TITLE"), width: 400 },
                {
                    field: 'status',
                    headerName: t("COMMON.STATUS"),
                    width: 200,
                    renderCell: ({ row }) => <span style={{ color: getTicketStatusColor(row.status.toUpperCase()) }}>{ t("PAGES.PROFILE.SUPPORT.STATUS_" + row.status.toUpperCase()) }</span>
                },
                {
                    field: 'actions',
                    headerName: t("COMMON.ACTIONS"),
                    width: 300,
                    sortable: false,
                    renderCell: ({ row }) => <Link href={`/admin/support/edit?id=${ row.id }`}><Button variant="contained" type="button">{ t("COMMON.VIEW") }</Button></Link>
                },
            ];

            return (
                <>
                    <ExtendedTable
                        columns={ columns }
                        pageSize={ 20 }
                        options={{
                            session: session,
                            fetchUrl: process.env.BACK_API_URL + "admin/ticket",
                            t: t
                        }}
                    />
                </>
            );
        }
        else if(page === 1) {
            return (
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                    autoComplete="off"
                    onSubmit={ handleSubmit }
                >
                        <div className="d-flex flex-column">
                            <Select
                                labelId="type"
                                id="type"
                                value={ formValues?.type }
                                label="Type"
                                className="mb-10"
                                onChange={({ target }) => setFormValues({ ...formValues, type: target.value })}
                            >
                                <MenuItem value={ "monthly_digest" }>{ t("PAGES.PROFILE.SUPPORT.TYPE_MONTHLY_DIGEST") }</MenuItem>
                                <MenuItem value={ "product_updates" }>{ t("PAGES.PROFILE.SUPPORT.TYPE_PRODUCT_UPDATES") }</MenuItem>
                                <MenuItem value={ "discount_and_promotions" }>{ t("PAGES.PROFILE.SUPPORT.TYPE_DISCOUNT_AND_PROMOTIONS") }</MenuItem>
                            </Select>
                            <TextField required id="title" label={ t("COMMON.TITLE") } variant="outlined" className="mb-10"
                                value={ formValues?.title || "" } onChange={({ target }) => setFormValues({ ...formValues, title: target.value })}/>
                            <TextField required id="message" label={ t("COMMON.MESSAGE") } variant="outlined" className="mb-10" multiline rows={ 4 }
                                value={ formValues?.message || "" } onChange={({ target }) => setFormValues({ ...formValues, message: target.value })}/>
                            <Button variant="contained" size="large" type="submit">{ t("COMMON.SUBMIT") }</Button>
                        </div>
                </Box>
            );
        }
        return <></>;  
    };
    

    return (<>
        <Menu options={ [t("PAGES.ADMIN.SUPPORT.TICKETS"), t("PAGES.ADMIN.SUPPORT.NEW_TICKET")] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
        { renderPage() }
    </>);
};

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}