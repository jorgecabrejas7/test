import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from 'next-i18next';
import ExtendedTable from '@/components/extendedtable';
import Menu from "@/components/menu";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { loader } from "@/components/loader/loader";
import { unprotectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';

export default () => {
    const { t } = useTranslation('common');
    const session = useSession();
    const router = useRouter();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [formValues, setFormValues] = useState(null);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);
    }, [router.query]);

    const handleSubmit = async e => {
        e.preventDefault();
        loader(true);

        const res = await unprotectedFetch(process.env.BACK_API_URL + "user", "post", JSON.stringify(formValues), t);  
        if(res.status === 200) {
            toast.success(t("COMMON.DATA_SUBMITTED"));
            setFormValues(null);
            setPage(0);
        }

        loader(false);
    };

    const renderPage = () => {
        switch(page) {
            case 0:
                const columns = [
                    { field: 'id', headerName: t("COMMON.ID"), width: 60, hide: true },
                    { field: 'email', headerName: t("COMMON.EMAIL"), width: 200 },
                    { field: 'createdAt', headerName: t("PAGES.ADMIN.USER_MANAGEMENT.REGISTRATION_DATE"), width: 200 },
                    {
                        field: 'status', headerName: t("COMMON.STATUS"), width: 200,
                        renderCell: ({ row }) => <span>{ row.status === "banned" ? t("PAGES.ADMIN.USER_MANAGEMENT.STATUS_BANNED") : t("PAGES.ADMIN.USER_MANAGEMENT.STATUS_NORMAL") }</span>
                    },
                    {
                        field: 'role', headerName: t("PAGES.ADMIN.USER_MANAGEMENT.ROLE"), width: 200,
                        renderCell: ({ row }) => <span>{ row.role === "admin" ? t("PAGES.ADMIN.USER_MANAGEMENT.ROLE_ADMIN") : t("PAGES.ADMIN.USER_MANAGEMENT.ROLE_USER") }</span>
                    },
                    {
                        field: 'actions',
                        headerName: t("COMMON.ACTIONS"),
                        width: 300,
                        sortable: false,
                        renderCell: ({ id }) => <Link href={`/admin/users/edit?id=${ id }`}><Button variant="outlined" type="button">{ t("COMMON.EDIT") }</Button></Link>
                    }
                ];
            
                return (
                    <div className="d-flex flex-column">
                        <ExtendedTable
                            columns={ columns }
                            pageSize={ 20 }
                            options={{
                                session: session,
                                fetchUrl: process.env.BACK_API_URL + "admin/user",
                                t: t
                            }}
                        />
                    </div>
                );
            case 1:
                return (
                    <div className="d-flex flex-column">
                        <Box
                            component="form"
                            sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                            autoComplete="off"
                            onSubmit={ handleSubmit }
                        >
                            <div className="d-flex flex-column">
                                <TextField required id="email" type={ "email" } label={ t("COMMON.EMAIL") } variant="outlined" className="mb-10" value={ formValues?.email || "" } onChange={({ target }) => setFormValues({ ...formValues, email: target.value })}/>
                                <TextField required id="password" type={"password"} label={ t("COMMON.PASSWORD") } variant="outlined" className="mb-10" inputProps={{ minLength: 6 }} value={ formValues?.password || "" } onChange={({ target }) => setFormValues({ ...formValues, password: target.value })}/>
                                <TextField required id="firstname" label={ t("PAGES.PROFILE.SETTINGS.FIRST_NAME") } variant="outlined" className="mb-10"
                                    value={ formValues?.firstname || "" } onChange={({ target }) => setFormValues({ ...formValues, firstname: target.value })}/>
                                <TextField required id="lastname" label={ t("PAGES.PROFILE.SETTINGS.LAST_NAME") } variant="outlined" className="mb-10"
                                    value={ formValues?.lastname || "" } onChange={({ target }) => setFormValues({ ...formValues, lastname: target.value })}/>
                                <Button variant="contained" size="large" type="submit">{ t("COMMON.SUBMIT") }</Button>
                            </div>
                        </Box>
                    </div>
                );
        }
    };

    return (
        <div className="d-flex flex-column">
            <Menu options={ [t("PAGES.ADMIN.USER_MANAGEMENT.USERS"), t("PAGES.ADMIN.USER_MANAGEMENT.NEW_USER")] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
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