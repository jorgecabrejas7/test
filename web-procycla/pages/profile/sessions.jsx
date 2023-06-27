import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";
import { protectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';
import { loader } from "@/components/loader/loader";
import { createRef } from "react";
import { useTranslation } from 'next-i18next';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');
    const session = useSession();
    const extendedTable = createRef();

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
                    fetchUrl: process.env.BACK_API_URL + "session?" + new URLSearchParams({ id_user: session.data.user.id }),
                    t: t
                }}
            />
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