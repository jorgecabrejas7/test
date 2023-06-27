import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";
import { createRef } from "react";
import { protectedFetch } from "@/lib/apifetch";
import { loader } from "@/components/loader/loader";
import { useTranslation } from 'next-i18next';
import { toast } from 'react-toastify';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');
    const session = useSession();
    const extendedTable = createRef();

    const cancelSubscription = async (id_subscription, rowIndex) => {
        loader(true);
        
        const res = await protectedFetch(session, process.env.BACK_API_URL + "admin/stripe/cancel_subscription?" + new URLSearchParams({ id_subscription: id_subscription }), "get", null, t);
        
        if(res.status === 200) {
            if(extendedTable?.current) {
                const subscription = extendedTable.current.getRow(rowIndex);
                if(subscription) {
                    subscription.status = 'canceled';
                    extendedTable.current.setRow(rowIndex, subscription);
                }
            }
            toast.success(t("COMMON.DATA_UPDATED"));
        }

        loader(false);
    };

    const columns = [
        { field: 'id', headerName: t("COMMON.ID"), width: 250 },
        { field: 'date', headerName: t("COMMON.DATE"), width: 150 },
        { field: 'user', headerName: t("COMMON.USER"), width: 200 },
        { field: 'plan', headerName: t("COMMON.PLAN"), width: 200, renderCell: ({ row }) => t(row.plan) },
        { field: 'status', headerName: t("COMMON.STATUS"), width: 150, renderCell: ({ row }) => t('API.STRIPE.STATUS.' + row.status.toUpperCase()) },
        {
            field: 'actions',
            headerName: t("COMMON.ACTIONS"),
            width: 300,
            sortable: false,
            renderCell: (cell) => {
                const { row } = cell;
                const rowIndex = cell.api.getRowIndex(row.id);
                return <Button variant="outlined" type="button" disabled={ row.status != 'active' ? true : false } onClick={ () => cancelSubscription(row.id, rowIndex) }>{ t("COMMON.CANCEL") }</Button>
            }
        }
    ];

    return (
        <div className="d-flex flex-column">
            <ExtendedTable
                ref={ extendedTable }
                columns={ columns }
                paginationWithId
                pageSize={ 20 }
                options={{
                    session: session,
                    fetchUrl: process.env.BACK_API_URL + "admin/stripe/subscriptions",
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