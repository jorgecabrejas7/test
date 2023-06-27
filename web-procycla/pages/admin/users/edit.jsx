import Menu from "@/components/menu";
import { useState, useEffect, createRef } from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Icon from '@mui/material/Icon';
import { loader } from "@/components/loader/loader";
import { useSession } from "next-auth/react";
import { protectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');
    
    const router = useRouter();
    const [id, setId] = useState(parseInt(router.query.id || 0));
    const session = useSession();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [formValues, setFormValues] = useState(null);
    const extendedTable = createRef();

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);

        let { id: id_query } = router.query;
        if(id_query) id_query = parseInt(id_query);
        if(id != id_query) setId(id_query);
    }, [router.query]);

    useEffect(() => {
        if(id > 0 && session.status === "authenticated") {
            const fetchData = async () => {
                const res = await protectedFetch(session, process.env.BACK_API_URL + "admin/user?" + new URLSearchParams({ id: id }), "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setFormValues(data);
                }

                loader(false);
            }
            fetchData();
        }
    }, [session.status, id]);

    const handleSubmit = async e => {
        loader(true);
        e.preventDefault();

        let cloneFormValues = structuredClone(formValues);
        
        if(!cloneFormValues.password)
        delete cloneFormValues["password"];

        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "admin/user?" + new URLSearchParams({ id: id }),
            "put", JSON.stringify(cloneFormValues), t);
        
        if(res.status === 200)
        toast.success(t("COMMON.DATA_UPDATED"));

        loader(false);
    };

    const handleSecureLoginEmail = async toggle => {
        loader(true);

        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "admin/user?" + new URLSearchParams({ id: id }),
            "put", JSON.stringify({ secure_login_email: toggle }), t);
        
        if(res.status === 200) {
            toast.success(t("COMMON.DATA_UPDATED"));
            setFormValues({ ...formValues, secure_login_email: toggle });
        }

        loader(false);
    };

    const renderPage = () => {
        if(page === 0) {
            return (
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                    autoComplete="off"
                    onSubmit={ handleSubmit }
                >
                        <div className="d-flex flex-column">
                        <TextField id="username" label={ t("COMMON.USERNAME") } variant="outlined" className="mb-10"
                                value={ formValues?.username || "" } onChange={({ target }) => setFormValues({ ...formValues, username: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="about_me" label={ t("PAGES.PROFILE.SETTINGS.ABOUT_ME") } variant="outlined" multiline rows={ 4 } className="mb-10"
                                value={ formValues?.about_me || "" } onChange={({ target }) => setFormValues({ ...formValues, about_me: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="location" label={ t("PAGES.PROFILE.SETTINGS.LOCATION") } variant="outlined" className="mb-10"
                                value={ formValues?.location || "" } onChange={({ target }) => setFormValues({ ...formValues, location: target.value })} InputLabelProps={{ shrink: true }}/>
                            
                            <span className={ "text-medium mt-10 mb-10" }>{ t("PAGES.ADMIN.USER_MANAGEMENT_ID.SOCIAL_MEDIA_LINKS") }</span>
                            <TextField id="twitter" label={ t("PAGES.PROFILE.SETTINGS.TWITTER") } variant="outlined" className="mb-10"
                                value={ formValues?.twitter || "" } onChange={({ target }) => setFormValues({ ...formValues, twitter: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="youtube" label={ t("PAGES.PROFILE.SETTINGS.YOUTUBE") } variant="outlined" className="mb-10"
                                value={ formValues?.youtube || "" } onChange={({ target }) => setFormValues({ ...formValues, youtube: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="facebook" label={ t("PAGES.PROFILE.SETTINGS.FACEBOOK") } variant="outlined" className="mb-10"
                                value={ formValues?.facebook || "" } onChange={({ target }) => setFormValues({ ...formValues, facebook: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="instagram" label={ t("PAGES.PROFILE.SETTINGS.INSTAGRAM") } variant="outlined" className="mb-10"
                                value={ formValues?.instagram || "" } onChange={({ target }) => setFormValues({ ...formValues, instagram: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="website" label={ t("PAGES.PROFILE.SETTINGS.WEBSITE") } variant="outlined" className="mb-10"
                                value={ formValues?.website || "" } onChange={({ target }) => setFormValues({ ...formValues, website: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="signature" label={ t("PAGES.PROFILE.SETTINGS.SIGNATURE") } variant="outlined" multiline rows={ 4 } className="mb-10"
                                value={ formValues?.signature || "" } onChange={({ target }) => setFormValues({ ...formValues, signature: target.value })} InputLabelProps={{ shrink: true }}/>
                            <Button variant="contained" size="large" type="submit">{ t("COMMON.SAVE_CHANGES") }</Button>
                        </div>
                </Box>
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
                            <TextField required id="email" type={ "email" } label={ t("COMMON.EMAIL") } variant="outlined" className="mb-10"
                                value={ formValues?.email || "" } onChange={({ target }) => setFormValues({ ...formValues, email: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="password" type={ "password" } label={ t("COMMON.PASSWORD") } variant="outlined" className="mb-10" inputProps={{ minLength: 6 }}
                                value={ formValues?.password || "" } onChange={({ target }) => setFormValues({ ...formValues, password: target.value })} InputLabelProps={{ shrink: true }}/>
                            
                            <div className="d-flex flex-column mt-10 mb-10">
                                <span className={ "text-medium fw-bold" }>{ t("PAGES.PROFILE.SETTINGS.TWO_FACTOR_AUTHENTICATION") }</span>
                                <div className="d-flex flex-row align-items-center justify-content-between mt-10 mb-10 p-10 border-box">
                                    <div className="d-flex flex-row align-items-center">
                                        <Icon className="text-secondary m-10">mail</Icon>
                                        <div className="d-flex flex-column m-10">
                                            <span className={ "text-medium" }>{ t("PAGES.PROFILE.SETTINGS.EMAIL_VERIFICATION") }</span>
                                            <span className={ "text-small text-secondary" }>{ t("PAGES.ADMIN.USER_MANAGEMENT_ID.EMAIL_VERIFICATION_DESCRIPTION") }</span>
                                        </div>
                                    </div>
                                    {
                                        formValues?.secure_login_email ?
                                        <Button variant="outlined" size="small" type="button" color="warning" onClick={ () => handleSecureLoginEmail(false) }>{ t("COMMON.DISABLE") }</Button> :
                                        <Button variant="outlined" size="small" type="button" color="success" onClick={ () => handleSecureLoginEmail(true) }>{ t("COMMON.ENABLE") }</Button>
                                    }
                                </div>
                            </div>
                            <TextField id="firstname" label={ t("PAGES.PROFILE.SETTINGS.FIRST_NAME") } variant="outlined" className="mb-10"
                                value={ formValues?.firstname || "" } onChange={({ target }) => setFormValues({ ...formValues, firstname: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="lastname" label={ t("PAGES.PROFILE.SETTINGS.LAST_NAME") } variant="outlined" className="mb-10"
                                value={ formValues?.lastname || "" } onChange={({ target }) => setFormValues({ ...formValues, lastname: target.value })} InputLabelProps={{ shrink: true }}/>
                            <TextField id="phone" label={ t("PAGES.PROFILE.SETTINGS.PHONE") } variant="outlined" className="mb-10"
                                value={ formValues?.phone || "" } onChange={({ target }) => setFormValues({ ...formValues, phone: target.value })} InputLabelProps={{ shrink: true }}/>
                            <Button variant="contained" size="large" type="submit">{ t("COMMON.SAVE_CHANGES") }</Button>
                        </div>
                </Box>
            );
        }
        else if(page === 2) {
            return (
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                    autoComplete="off"
                    onSubmit={ handleSubmit }
                >
                        <div className="d-flex flex-column">
                            <InputLabel id="role">{ t("PAGES.ADMIN.USER_MANAGEMENT.ROLE") }</InputLabel>
                            <Select
                                labelId="role"
                                id="role"
                                value={ formValues?.role || "" }
                                label={ t("PAGES.ADMIN.USER_MANAGEMENT.ROLE") } 
                                className="mb-10"
                                onChange={({ target }) => setFormValues({ ...formValues, role: target.value })}
                            >
                                <MenuItem value={ "user" }>{ t("PAGES.ADMIN.USER_MANAGEMENT.ROLE_USER") }</MenuItem>
                                <MenuItem value={ "admin" }>{ t("PAGES.ADMIN.USER_MANAGEMENT.ROLE_ADMIN") }</MenuItem>
                            </Select>
                            <InputLabel id="status">{ t("COMMON.STATUS") }</InputLabel>
                            <Select
                                labelId="status"
                                id="status"
                                value={ formValues?.status || "" }
                                label="Status"
                                className="mb-10"
                                onChange={({ target }) => setFormValues({ ...formValues, status: target.value })}
                            >
                                <MenuItem value={ "normal" }>{ t("PAGES.ADMIN.USER_MANAGEMENT.STATUS_NORMAL") }</MenuItem>
                                <MenuItem value={ "banned" }>{ t("PAGES.ADMIN.USER_MANAGEMENT.STATUS_BANNED") }</MenuItem>
                            </Select>
                            <Button variant="contained" size="large" type="submit">{ t("COMMON.SAVE_CHANGES") }</Button>
                        </div>
                </Box>
            );
        }
        else if(page === 3) {
            const columns = [
                { field: 'id', headerName: t("COMMON.ID"), width: 60, hide: true },
                { field: 'expire_date', headerName: t("PAGES.PROFILE.SESSIONS.EXPIRE_DATE"), width: 200 },
                { field: 'ip', headerName: t("PAGES.PROFILE.SESSIONS.IP_ADDRESS"), width: 200 },
                { field: 'device', headerName: t("PAGES.PROFILE.SESSIONS.DEVICE"), width: 400 },
                {
                    field: 'actions',
                    headerName: t("COMMON.ACTIONS"),
                    width: 300,
                    sortable: false,
                    renderCell: (cell) => {
                        const { row } = cell;
                        const rowIndex = cell.api.getRowIndex(row.id);

                        const user = session.data.user;
                        if(row.id == user.session) return <Button variant="outlined" type="button" disabled>{ t("PAGES.PROFILE.SESSIONS.CURRENT_SESSION") }</Button>;
                        return (row.valid ?
                            <Button variant="contained" color="error" type="button" onClick={ () => sessionLogout(row.id, rowIndex) }>{ t("PAGES.PROFILE.SESSIONS.LOGOUT") }</Button> :
                            <Button variant="outlined" type="button" disabled>{ t("COMMON.EXPIRED") }</Button>
                        );
                    }
                }
            ];
        
            const sessionLogout = async (sessionId, rowIndex) => {
                loader(true);
        
                const user = session.data.user;
                const res = await protectedFetch(
                    session, process.env.BACK_API_URL + "session?" + new URLSearchParams({ id_user: user.id, session: sessionId }),
                    "put", JSON.stringify({ valid: false }), t);
                
                if(res.status === 200) {
                    if(extendedTable?.current) {
                        const theSession = extendedTable.current.getRow(rowIndex);
                        if(theSession) {
                            theSession.valid = false;
                            extendedTable.current.setRow(rowIndex, theSession);
                        }
                    }
                    toast.success(t("PAGES.PROFILE.SESSIONS.SESSION_EXPIRED"));
                }
        
                loader(false);
            };

            return (
                <div className="d-flex flex-column">
                    <ExtendedTable
                        ref={ extendedTable }
                        columns={ columns }
                        pageSize={ 20 }
                        options={{
                            session: session,
                            fetchUrl: process.env.BACK_API_URL + "admin/session?" + new URLSearchParams({ id_user: id }),
                            t: t
                        }}
                    />
                </div>
            );
        }
    };

    return (
        <div className="d-flex flex-column">
            <Menu options={ [t("PAGES.PROFILE.SETTINGS.PUBLIC_INFO"), t("PAGES.PROFILE.SETTINGS.PRIVATE_DETAILS"), t("COMMON.STATUS"), t("PAGES.ADMIN.USER_MANAGEMENT_ID.SESSIONS")] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
            { renderPage() }
        </div>
    );
};

export async function getServerSideProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}