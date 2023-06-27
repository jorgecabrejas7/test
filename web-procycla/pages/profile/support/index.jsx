import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import Menu from "@/components/menu";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { getTicketStatusColor } from "@/lib/functions";
import Link from "next/link";
import { toast } from 'react-toastify';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { useRouter } from 'next/router';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');

    const router = useRouter();
    const session = useSession();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [formValues, setFormValues] = useState(null);
    const [checkValues, setCheckValues] = useState(null);

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);
    }, [router.query]);

    useEffect(() => {
        if(session.status === "authenticated") {
            const fetchData = async () => {
                const user = session.data.user;
                const res = await protectedFetch(session, process.env.BACK_API_URL + "user?" + new URLSearchParams({ id: user.id }), "get", null, t);
                
                if(res.status === 200) {
                    const { notification_monthly_digest, notification_product_updates, notification_discount_and_promotions } = await res.json();
                    setCheckValues({ notification_monthly_digest: notification_monthly_digest, notification_product_updates: notification_product_updates, notification_discount_and_promotions: notification_discount_and_promotions });
                }

                loader(false);
            }
            fetchData();
        }
    }, [session.status]);

    const handleSubmit = async e => {
        loader(true);
        e.preventDefault();

        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "ticket",
            "post", JSON.stringify(formValues), t);
        
        if(res.status === 200) {
            setFormValues(null);
            toast.success(t("COMMON.DATA_SUBMITTED"));
        }

        loader(false);
    };

    const renderPage = () => {
        if(page === 0) {
            const columns = [
                { field: 'id', headerName: t("COMMON.ID"), width: 60, hide: true },
                { field: 'updatedAt', headerName: t("COMMON.DATE"), width: 200 },
                {
                    field: 'type',
                    headerName: t("COMMON.TYPE"),
                    width: 200,
                    renderCell: ({ row }) => <span className={ row.type !== "ticket" ? "primary-color" : "" }>{ t("PAGES.PROFILE.SUPPORT.TYPE_" + row.type.toUpperCase()) }</span>
                },
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
                    renderCell: ({ row }) => <Link href={`/profile/support/edit?id=${ row.id }`}><Button variant="contained" type="button">{ t("COMMON.VIEW") }</Button></Link>
                },
            ];

            return (
                <ExtendedTable
                    columns={ columns }
                    pageSize={ 20 }
                    options={{
                        session: session,
                        fetchUrl: process.env.BACK_API_URL + "ticket",
                        t: t
                    }}
                />
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
                            <TextField required id="title" label={ t("COMMON.TITLE") } variant="outlined" className="mb-10"
                                value={ formValues?.title || "" } onChange={({ target }) => setFormValues({ ...formValues, title: target.value })}/>
                            <TextField required id="message" label={ t("COMMON.MESSAGE") } variant="outlined" className="mb-10" multiline rows={ 4 }
                                value={ formValues?.message || "" } onChange={({ target }) => setFormValues({ ...formValues, message: target.value })}/>
                            <Button variant="contained" size="large" type="submit">{ t("COMMON.SUBMIT") }</Button>
                        </div>
                </Box>
            );
        }
        else if(page === 2) {
            const handleChange = async (theCheckValues) => {
                loader(true);

                const user = session.data.user;
                const res = await protectedFetch(
                    session, process.env.BACK_API_URL + "user?" + new URLSearchParams({ id: user.id }),
                    "put", JSON.stringify(theCheckValues), t);
                
                if(res.status === 200) {
                    toast.success(t("COMMON.DATA_UPDATED"));
                }

                loader(false);
            };

            return (
                <FormGroup>
                    <FormControlLabel control={<Checkbox checked={ checkValues?.notification_monthly_digest || false } onChange={ ({ target }) => { setCheckValues({ ...checkValues, notification_monthly_digest: target.checked }); handleChange({ ...checkValues, notification_monthly_digest: target.checked }) } }/> } label={  t("PAGES.PROFILE.SUPPORT.TYPE_MONTHLY_DIGEST")  }/>
                    <FormControlLabel control={<Checkbox checked={ checkValues?.notification_product_updates || false } onChange={ ({ target }) => { setCheckValues({ ...checkValues, notification_product_updates: target.checked }); handleChange({ ...checkValues, notification_product_updates: target.checked }) } }/> } label={  t("PAGES.PROFILE.SUPPORT.TYPE_PRODUCT_UPDATES")  }/>
                    <FormControlLabel control={<Checkbox checked={ checkValues?.notification_discount_and_promotions || false } onChange={ ({ target }) => { setCheckValues({ ...checkValues, notification_discount_and_promotions: target.checked }); handleChange({ ...checkValues, notification_discount_and_promotions: target.checked }) } }/> } label={  t("PAGES.PROFILE.SUPPORT.TYPE_DISCOUNT_AND_PROMOTIONS")  }/>
                </FormGroup>
            );
        }
        return <></>;
    }
    
    return (
        <div className="d-flex flex-column">
            <Menu options={ [t("PAGES.PROFILE.SUPPORT.TICKETS"), t("PAGES.PROFILE.SUPPORT.NEW_TICKET"), t("PAGES.PROFILE.SUPPORT.SUBSCRIPTIONS")] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
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