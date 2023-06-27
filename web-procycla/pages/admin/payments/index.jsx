import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useSession } from "next-auth/react";
import { useTranslation } from 'next-i18next';
import ExtendedTable from '@/components/extendedtable';

export default () => {
    const { t } = useTranslation('common');
    const session = useSession();

    const columns = [
        { field: 'id', headerName: t("COMMON.ID"), width: 250 },
        { field: 'date', headerName: t("COMMON.DATE"), width: 150 },
        { field: 'user', headerName: t("COMMON.USER"), width: 200 },
        { field: 'total', headerName: t("COMMON.TOTAL"), width: 200 },
        { field: 'status', headerName: t("COMMON.STATUS"), width: 150, renderCell: ({ row }) => t('API.STRIPE.STATUS.' + row.status.toUpperCase()) }
    ];

    return (
        <div className="d-flex flex-column">
            <ExtendedTable
                columns={ columns }
                paginationWithId
                pageSize={ 20 }
                options={{
                    session: session,
                    fetchUrl: process.env.BACK_API_URL + "admin/stripe/payments",
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